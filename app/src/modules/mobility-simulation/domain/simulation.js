const { RentalError } = require('./rental');

const scenarios = Object.freeze(['metro', 'parking', 'charging-demand', 'charging', 'clustering']);
const commonFields = ['durationMinutes', 'seed', 'demandPerHour', 'tripMinutes', 'chargeMinutes', 'batteryDrainPerTrip'];
const scenarioFields = {
  metro: ['demandMultiplier'], parking: ['occupiedPercent'],
  'charging-demand': ['chargingMultiplier', 'chargingRequestsPerHour', 'powerBudgetKw', 'portPowerKw'],
  charging: ['failedPorts', 'chargingRequestsPerHour', 'powerBudgetKw', 'portPowerKw'],
  clustering: ['targetHubId', 'returnBias']
};

function number(value, field, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RentalError('INVALID_SCENARIO', `${field} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`);
  }
  return value;
}

function validateScenario(input) {
  if (!input || !scenarios.includes(input.scenario)) throw new RentalError('INVALID_SCENARIO', 'Choose one of the five supported scenarios.');
  if (!Array.isArray(input.hubIds) || !input.hubIds.length || input.hubIds.length > 10 ||
    input.hubIds.some(id => typeof id !== 'string' || !id.trim()) || new Set(input.hubIds).size !== input.hubIds.length) {
    throw new RentalError('INVALID_SCENARIO', 'Select one to ten distinct Hub IDs.');
  }
  const p = input.parameters;
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new RentalError('INVALID_SCENARIO', 'parameters must be an object.');
  const allowed = new Set([...commonFields, ...scenarioFields[input.scenario]]);
  if (Object.keys(p).some(key => !allowed.has(key))) throw new RentalError('INVALID_SCENARIO', 'Scenario contains an unsupported parameter.');
  const parameters = {
    durationMinutes: number(p.durationMinutes, 'durationMinutes', 1, 240, true),
    demandPerHour: number(p.demandPerHour, 'demandPerHour', 0, 1000),
    seed: number(p.seed ?? 1, 'seed', 0, 4294967295, true),
    tripMinutes: number(p.tripMinutes ?? 15, 'tripMinutes', 1, 240),
    chargeMinutes: number(p.chargeMinutes ?? 45, 'chargeMinutes', 1, 240),
    batteryDrainPerTrip: number(p.batteryDrainPerTrip ?? 10, 'batteryDrainPerTrip', 0, 100)
  };
  if (input.scenario === 'metro') parameters.demandMultiplier = number(p.demandMultiplier, 'demandMultiplier', 1, 10);
  if (input.scenario === 'parking') parameters.occupiedPercent = number(p.occupiedPercent, 'occupiedPercent', 0, 100);
  if (input.scenario === 'charging-demand' || input.scenario === 'charging') {
    parameters.chargingRequestsPerHour = number(p.chargingRequestsPerHour, 'chargingRequestsPerHour', 0, 1000);
    parameters.powerBudgetKw = number(p.powerBudgetKw, 'powerBudgetKw', 0, 1000);
    parameters.portPowerKw = number(p.portPowerKw, 'portPowerKw', 0.1, 100);
  }
  if (input.scenario === 'charging-demand') parameters.chargingMultiplier = number(p.chargingMultiplier, 'chargingMultiplier', 1, 10);
  if (input.scenario === 'charging') parameters.failedPorts = number(p.failedPorts, 'failedPorts', 0, 100, true);
  if (input.scenario === 'clustering') {
    if (!input.hubIds.includes(p.targetHubId)) throw new RentalError('INVALID_SCENARIO', 'targetHubId must be one of the selected Hubs.');
    parameters.targetHubId = p.targetHubId;
    parameters.returnBias = number(p.returnBias, 'returnBias', 0, 1);
  }
  // Bound synchronous CPU work in the demo server before capturing a snapshot.
  const estimate = input.hubIds.length * parameters.durationMinutes / 60 *
    (parameters.demandPerHour * (parameters.demandMultiplier ?? 1) +
      (parameters.chargingRequestsPerHour ?? 0) * (parameters.chargingMultiplier ?? 1));
  if (estimate > 40000) throw new RentalError('INVALID_SCENARIO', 'Scenario exceeds the demo event budget; reduce duration, demand or Hub count.');
  return { scenario: input.scenario, hubIds: [...input.hubIds], parameters };
}

function validateSnapshot(snapshot, config) {
  if (!snapshot || !Number.isFinite(Date.parse(snapshot.capturedAt)) ||
    !['hubs', 'vehicles', 'slots', 'chargingPoints', 'availableVehicleIds', 'availableSlotIds'].every(key => Array.isArray(snapshot[key]))) {
    throw new RentalError('SNAPSHOT_UNAVAILABLE', 'A complete inventory snapshot is required.');
  }
  for (const id of config.hubIds) {
    if (!snapshot.hubs.some(hub => hub.id === id)) throw new RentalError('HUB_NOT_FOUND', 'Selected Hub does not exist in the snapshot.');
    if (config.scenario === 'charging') {
      const usable = snapshot.chargingPoints.filter(port => port.hubId === id && ['available', 'idle'].includes(port.status.toLowerCase())).length;
      if (config.parameters.failedPorts > usable) throw new RentalError('INVALID_SCENARIO', 'failedPorts exceeds available ports at a selected Hub.');
    }
  }
}

module.exports = { scenarios, validateScenario, validateSnapshot };
