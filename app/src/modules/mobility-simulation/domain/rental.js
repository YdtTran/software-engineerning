const { createHash } = require('node:crypto');

class RentalError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new RentalError('INVALID_INPUT', `${name} is required.`);
  return value;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

function commandContext(actorId, operation, key, payload) {
  requiredString(actorId, 'Actor');
  requiredString(key, 'Idempotency-Key');
  if (key.length > 200) throw new RentalError('INVALID_INPUT', 'Idempotency-Key is too long.');
  return {
    scope: JSON.stringify([actorId, operation, key]),
    hash: createHash('sha256').update(JSON.stringify(canonical(payload))).digest('hex')
  };
}

function owned(record, actorId, code) {
  if (!record) throw new RentalError(code, 'Record not found.');
  if (record.userId !== actorId) throw new RentalError('FORBIDDEN_OPERATION', 'Record belongs to another user.');
  return record;
}

function verifiedEvidence(command, evidence) {
  const input = command.request;
  if (!evidence || evidence.commandId !== command.id || evidence.vehicleId !== input.vehicleId || evidence.hubId !== input.hubId) return false;
  if (command.kind === 'pickup') return evidence.unlocked === true;
  return evidence.arrived === true && evidence.locked === true && evidence.slotId === input.slotId &&
    Number.isInteger(evidence.batteryPercent) && evidence.batteryPercent >= 0 && evidence.batteryPercent <= 100 &&
    (evidence.distanceKm == null || (Number.isFinite(evidence.distanceKm) && evidence.distanceKm >= 0));
}

module.exports = { RentalError, requiredString, commandContext, owned, verifiedEvidence };
