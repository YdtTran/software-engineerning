/**
 * Charging Safety Transition Guard (SC02) injected into Operations SQLiteInventoryRepository.
 * Runs inside the caller's active SQLite transaction.
 */

const { conflict, unprocessable } = require('../domain/errors');

function createChargingGuard(defaultClient = null, clock = () => new Date()) {
  async function findAckedCommand(dbClient, pointId, action, { referenceId = null, unconsumedOnly = false } = {}) {
    const clauses = [
      "target_kind = 'charging_point'",
      'target_id = ?',
      'action = ?',
      unconsumedOnly ? "status = 'Acked' AND consumed_at IS NULL" : "status = 'Acked'"
    ];
    const params = [pointId, action];
    if (referenceId) {
      clauses.push('reference_id = ?');
      params.push(referenceId);
    }
    return dbClient.get(
      `SELECT command_id AS commandId FROM device_commands
       WHERE ${clauses.join(' AND ')}
       ORDER BY updated_at DESC, rowid DESC LIMIT 1;`,
      params
    );
  }

  async function findCommandInStates(dbClient, pointId, action, states, referenceId = null) {
    const placeholders = states.map(() => '?').join(', ');
    const params = [pointId, action, ...states];
    let refClause = '';
    if (referenceId) {
      refClause = ' AND reference_id = ?';
      params.push(referenceId);
    }
    return dbClient.get(
      `SELECT command_id AS commandId, status FROM device_commands
       WHERE target_kind = 'charging_point' AND target_id = ? AND action = ?
         AND status IN (${placeholders})${refClause}
       ORDER BY updated_at DESC, rowid DESC LIMIT 1;`,
      params
    );
  }

  return {
    async assertTransition({ pointId, current, desired, client }) {
      if (current === desired) return;
      const dbClient = client || defaultClient;
      if (!dbClient) {
        throw new Error('chargingGuard requires a SQLiteClient instance.');
      }

      const activeAlloc = await dbClient.get(
        `SELECT allocation_id AS allocationId, request_id AS requestId, state,
                allocated_power_kw AS allocatedPowerKw
         FROM charging_allocations
         WHERE point_id = ? AND released_at IS NULL
         LIMIT 1;`,
        [pointId]
      );
      const activeSession = await dbClient.get(
        `SELECT id, request_id AS requestId, allocation_id AS allocationId
         FROM charging_sessions
         WHERE point_id = ? AND status = 'Active'
         LIMIT 1;`,
        [pointId]
      );
      const unresolvedIncident = await dbClient.get(
        `SELECT id FROM incidents
         WHERE LOWER(resource_kind) = 'charging_point' AND resource_id = ?
           AND LOWER(status) NOT IN ('resolved', 'closed')
         LIMIT 1;`,
        [pointId]
      );

      if (desired === 'Fault') {
        return; // Emergency fault isolation is always permitted from non-retired states.
      }

      if (desired === 'Repair') {
        if (activeSession) {
          throw conflict('CHARGING_ACTIVE', `Cannot move charging point ${pointId} to Repair while an Active session exists.`);
        }
        return;
      }

      if (desired === 'Retired') {
        if (activeSession || activeAlloc) {
          throw conflict('ALLOCATION_CONFLICT', `Cannot retire charging point ${pointId} while an active allocation or session exists.`);
        }
        return;
      }

      if (desired === 'Reserved') {
        if (unresolvedIncident) {
          throw conflict('POINT_UNAVAILABLE', `Charging point ${pointId} has an unresolved operational incident.`);
        }
        if (activeSession) {
          throw conflict('CHARGING_ACTIVE', `Charging point ${pointId} already has an Active charging session.`);
        }
        if (!activeAlloc || !['Reserved', 'Starting'].includes(activeAlloc.state)) {
          throw unprocessable('INVALID_STATE_TRANSITION', `Cannot reserve charging point ${pointId} without a valid charging allocation.`);
        }
        return;
      }

      if (desired === 'Starting') {
        if (unresolvedIncident) {
          throw conflict('POINT_UNAVAILABLE', `Charging point ${pointId} has an unresolved incident.`);
        }
        if (activeSession) {
          throw conflict('CHARGING_ACTIVE', `Charging point ${pointId} already has an Active session.`);
        }
        if (!activeAlloc || activeAlloc.state !== 'Starting') {
          throw unprocessable('INVALID_STATE_TRANSITION', `Charging point ${pointId} requires a Starting allocation before energizing.`);
        }
        const powerOnCmd = await findCommandInStates(dbClient, pointId, 'power_on', ['Pending', 'Acked'], activeAlloc.requestId);
        if (!powerOnCmd) {
          throw unprocessable('INVALID_STATE_TRANSITION', `Charging point ${pointId} lacks a persisted power_on device command.`);
        }
        return;
      }

      if (desired === 'Charging') {
        if (unresolvedIncident) {
          throw conflict('POINT_UNAVAILABLE', `Charging point ${pointId} has an unresolved incident.`);
        }
        if (!activeAlloc || activeAlloc.state !== 'Charging') {
          throw unprocessable('INVALID_STATE_TRANSITION', `Charging point ${pointId} must have a Charging allocation before entering Charging.`);
        }
        const ackedPowerOn = await findAckedCommand(dbClient, pointId, 'power_on', { referenceId: activeAlloc.requestId });
        if (!ackedPowerOn) {
          throw unprocessable('INVALID_STATE_TRANSITION', `Charging point ${pointId} cannot enter Charging without power_on acknowledgement.`);
        }
        return;
      }

      if (desired === 'Stopping') {
        if (!activeAlloc || activeAlloc.state !== 'Stopping') {
          throw unprocessable('INVALID_STATE_TRANSITION', `Charging point ${pointId} must have a Stopping allocation.`);
        }
        const powerOffCmd = await findCommandInStates(dbClient, pointId, 'power_off', ['Pending', 'Acked']);
        if (!powerOffCmd) {
          throw unprocessable('INVALID_STATE_TRANSITION', `Charging point ${pointId} lacks a persisted power_off device command.`);
        }
        return;
      }

      if (desired === 'Complete') {
        if (activeSession) {
          throw conflict('CHARGING_ACTIVE', `Charging point ${pointId} still has an Active charging session.`);
        }
        if (!activeAlloc || activeAlloc.state !== 'Complete' || Number(activeAlloc.allocatedPowerKw) > 1e-6) {
          throw unprocessable(
            'INVALID_STATE_TRANSITION',
            `Charging point ${pointId} must release power and enter Complete allocation state before finishing stop.`
          );
        }
        const ackedPowerOff = await findAckedCommand(dbClient, pointId, 'power_off');
        if (!ackedPowerOff) {
          throw unprocessable('INVALID_STATE_TRANSITION', `Charging point ${pointId} cannot enter Complete without power_off acknowledgement.`);
        }
        return;
      }

      if (desired === 'Available') {
        if (unresolvedIncident) {
          throw conflict('POINT_UNAVAILABLE', `Cannot mark charging point ${pointId} Available while incidents remain unresolved.`);
        }
        if (activeSession) {
          throw conflict('CHARGING_ACTIVE', `Cannot mark charging point ${pointId} Available while session ${activeSession.id} is Active.`);
        }
        if (activeAlloc) {
          throw conflict('ALLOCATION_CONFLICT', `Cannot mark charging point ${pointId} Available while allocation ${activeAlloc.allocationId} is still bound/unreleased.`);
        }

        if (current === 'Complete') {
          const unplugAck = await findAckedCommand(dbClient, pointId, 'unplug', { unconsumedOnly: true });
          if (!unplugAck) {
            throw unprocessable(
              'INVALID_STATE_TRANSITION',
              `Charging point ${pointId} requires physical unplug confirmation before returning from Complete to Available.`
            );
          }
          await dbClient.run('UPDATE device_commands SET consumed_at = ? WHERE command_id = ?;', [
            clock().toISOString(),
            unplugAck.commandId
          ]);
        } else if (current === 'Repair') {
          const safetyAck = await findAckedCommand(dbClient, pointId, 'safety_check', { unconsumedOnly: true });
          if (!safetyAck) {
            throw unprocessable(
              'INVALID_STATE_TRANSITION',
              `Charging point ${pointId} requires a confirmed safety_check device acknowledgement before returning from Repair to Available.`
            );
          }
          await dbClient.run('UPDATE device_commands SET consumed_at = ? WHERE command_id = ?;', [
            clock().toISOString(),
            safetyAck.commandId
          ]);
        }
      }
    }
  };
}

module.exports = {
  createChargingGuard
};
