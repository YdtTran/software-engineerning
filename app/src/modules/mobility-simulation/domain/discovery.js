class DiscoveryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DiscoveryError';
    this.code = code;
  }
}

const vehicleTypes = Object.freeze(['electric_bicycle', 'electric_motorbike']);

function searchText(value) {
  if (value === undefined) return '';
  if (typeof value !== 'string') {
    throw new DiscoveryError('INVALID_INPUT', 'q must be a single string.');
  }
  return value.trim().normalize('NFC').toLowerCase();
}

function vehicleType(value) {
  if (value === undefined) return null;
  if (!vehicleTypes.includes(value)) {
    throw new DiscoveryError('INVALID_INPUT', 'type must be electric_bicycle or electric_motorbike.');
  }
  return value;
}

module.exports = { DiscoveryError, searchText, vehicleType };
