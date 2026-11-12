/**
 * Shared two-phase durable device command runner:
 *   Phase 1 (TX1): Persist Pending device_commands row (reusing deterministic commandId on retry)
 *                  + optional pre-I/O state transition.
 *   Phase 2 (No TX): Call hardware/simulated adapter outside DB write locks (up to maxAttempts).
 *   Phase 3 (TX2): Persist Acked/Failed command outcome + post-I/O commit or Fault escalation.
 */

const { deviceUnconfirmed } = require('../domain/errors');

async function runDeviceCommand({
  client,
  chargingRepo,
  commandId,
  targetKind,
  targetId,
  action,
  referenceId,
  maxAttempts = 3,
  clock = () => new Date(),
  beforeSend = async () => {},
  sendToDevice,
  onConfirmed,
  onFailed
}) {
  const nowStart = clock().toISOString();

  await client.transaction(async () => {
    await chargingRepo.upsertPendingCommand({
      commandId,
      targetKind,
      targetId,
      action,
      referenceId,
      nowIso: nowStart
    });
    await beforeSend({ commandId });
  });

  // Execute I/O strictly outside SQLite transactions with up to 3 attempts sharing commandId.
  let attempts = 0;
  let lastOutcome = { confirmed: false, faulted: false, code: 'DEVICE_UNCONFIRMED', reason: 'Unconfirmed device operation.' };

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const outcome = await sendToDevice({ commandId, attempt: attempts });
      if (outcome && outcome.confirmed) {
        lastOutcome = outcome;
        break;
      }
      lastOutcome = outcome || lastOutcome;
      if (lastOutcome.faulted) break;
    } catch (err) {
      lastOutcome = {
        confirmed: false,
        faulted: false,
        code: (err && err.code) || 'DEVICE_ERROR',
        reason: (err && err.message) || 'Device adapter error.'
      };
    }
  }

  const nowEnd = clock().toISOString();

  if (lastOutcome.confirmed) {
    return client.transaction(async () => {
      await chargingRepo.markCommandAcked(commandId, attempts, nowEnd);
      return onConfirmed({ commandId, attempts, outcome: lastOutcome, nowIso: nowEnd });
    });
  }

  await client.transaction(async () => {
    await chargingRepo.markCommandFailed(commandId, attempts, lastOutcome.reason || lastOutcome.code, nowEnd);
    if (typeof onFailed === 'function') {
      await onFailed({ commandId, attempts, outcome: lastOutcome, nowIso: nowEnd });
    }
  });

  throw deviceUnconfirmed(lastOutcome.reason || `Device failed to confirm ${action}.`, {
    commandId,
    targetKind,
    targetId,
    action,
    attempts,
    faulted: Boolean(lastOutcome.faulted)
  });
}

module.exports = {
  runDeviceCommand
};
