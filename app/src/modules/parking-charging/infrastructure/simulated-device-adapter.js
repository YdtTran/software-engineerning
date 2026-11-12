/**
 * Deterministic Simulated Hardware Adapter for Dock Gates & Smart Chargers.
 * Supports scripting per-target/action retry sequences, fault injection, and telemetry lookups
 * while keeping I/O completely outside SQLite write transactions.
 */

class SimulatedDeviceAdapter {
  constructor({ defaultConfirmed = true } = {}) {
    this.defaultConfirmed = defaultConfirmed;
    this.scriptedQueues = new Map(); // `${targetId}:${action}` -> Array<outcome>
    this.faultedTargets = new Set();
    this.batteryReadings = new Map(); // vehicleId -> number
    this.commandLog = [];
  }

  _key(targetId, action) {
    return `${targetId}:${action}`;
  }

  scriptOutcomes(targetId, action, outcomes) {
    const list = Array.isArray(outcomes) ? [...outcomes] : [outcomes];
    this.scriptedQueues.set(this._key(targetId, action), list);
  }

  setFaulted(targetId, isFaulted = true) {
    if (isFaulted) this.faultedTargets.add(targetId);
    else this.faultedTargets.delete(targetId);
  }

  setBatteryReading(vehicleId, batteryPercent) {
    this.batteryReadings.set(vehicleId, batteryPercent);
  }

  getBatteryReading(vehicleId) {
    return this.batteryReadings.has(vehicleId) ? this.batteryReadings.get(vehicleId) : null;
  }

  getHistory(targetId = null, action = null) {
    return this.commandLog.filter(entry =>
      (targetId === null || entry.targetId === targetId) &&
      (action === null || entry.action === action)
    );
  }

  clear() {
    this.scriptedQueues.clear();
    this.faultedTargets.clear();
    this.batteryReadings.clear();
    this.commandLog = [];
  }

  async _execute(targetKind, targetId, action, payload = {}) {
    const commandId = payload.commandId || null;
    const attempt = payload.attempt || 1;
    this.commandLog.push({ targetKind, targetId, action, commandId, attempt, payload });

    if (this.faultedTargets.has(targetId)) {
      return {
        confirmed: false,
        faulted: true,
        commandId,
        code: 'HARDWARE_FAULT',
        reason: `${targetKind} ${targetId} reported a hardware fault.`
      };
    }

    const queue = this.scriptedQueues.get(this._key(targetId, action));
    const raw = queue && queue.length > 0 ? queue.shift() : undefined;
    const batteryPercent = payload.vehicleId && this.batteryReadings.has(payload.vehicleId)
      ? this.batteryReadings.get(payload.vehicleId)
      : payload.batteryPercent ?? null;

    if (raw instanceof Error) throw raw;
    if (raw === 'ack' || raw === true || (raw === undefined && this.defaultConfirmed)) {
      return { confirmed: true, faulted: false, commandId, batteryPercent };
    }
    if (raw === 'fault') {
      this.faultedTargets.add(targetId);
      return {
        confirmed: false,
        faulted: true,
        commandId,
        code: 'HARDWARE_FAULT',
        reason: `${targetKind} ${targetId} faulted during ${action}.`
      };
    }
    if (raw === 'timeout' || raw === false || raw === undefined) {
      return {
        confirmed: false,
        faulted: false,
        commandId,
        code: 'TIMEOUT',
        reason: `No acknowledgement received for ${action} on ${targetId}.`
      };
    }
    if (raw && typeof raw === 'object') {
      return {
        confirmed: Boolean(raw.confirmed),
        faulted: Boolean(raw.faulted),
        commandId,
        batteryPercent: raw.batteryPercent ?? batteryPercent,
        code: raw.code || (raw.confirmed ? null : 'DEVICE_UNCONFIRMED'),
        reason: raw.reason || null
      };
    }
    return { confirmed: false, faulted: false, commandId, code: 'DEVICE_UNCONFIRMED', reason: 'Unconfirmed device state.' };
  }

  async verifyArrival({ hubId, slotId, reservationId, vehicleId, commandId, attempt = 1 }) {
    return this._execute('parking_slot', slotId, 'verify_arrival', { hubId, reservationId, vehicleId, commandId, attempt });
  }

  async verifyDeparture({ hubId, slotId, occupancyId, vehicleId, commandId, attempt = 1 }) {
    return this._execute('parking_slot', slotId, 'verify_departure', { hubId, occupancyId, vehicleId, commandId, attempt });
  }

  async powerOn({ pointId, requestId, powerKw, vehicleId, commandId, attempt = 1 }) {
    return this._execute('charging_point', pointId, 'power_on', { requestId, powerKw, vehicleId, commandId, attempt });
  }

  async powerOff({ pointId, sessionId, requestId, vehicleId, batteryPercent, commandId, attempt = 1 }) {
    return this._execute('charging_point', pointId, 'power_off', { sessionId, requestId, vehicleId, batteryPercent, commandId, attempt });
  }

  async unplug({ pointId, allocationId, requestId, vehicleId, commandId, attempt = 1 }) {
    return this._execute('charging_point', pointId, 'unplug', { allocationId, requestId, vehicleId, commandId, attempt });
  }

  async verifyPointSafety({ pointId, commandId, attempt = 1 }) {
    return this._execute('charging_point', pointId, 'safety_check', { commandId, attempt });
  }
}

module.exports = {
  SimulatedDeviceAdapter
};
