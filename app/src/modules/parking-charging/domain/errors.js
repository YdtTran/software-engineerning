/**
 * Domain Errors and HTTP status mapping for Parking & Charging module.
 */

const HTTP_STATUS_BY_CODE = Object.freeze({
  // 400 Bad Request
  INVALID_INPUT: 400,
  INVALID_ID: 400,
  INVALID_HUB_ID: 400,
  INVALID_BATTERY: 400,

  // 403 Forbidden
  FORBIDDEN_OPERATION: 403,

  // 404 Not Found
  NOT_FOUND: 404,
  HUB_NOT_FOUND: 404,
  VEHICLE_NOT_FOUND: 404,
  SLOT_NOT_FOUND: 404,
  POINT_NOT_FOUND: 404,
  RESERVATION_NOT_FOUND: 404,
  OCCUPANCY_NOT_FOUND: 404,
  CONFLICT_NOT_FOUND: 404,
  REQUEST_NOT_FOUND: 404,
  SESSION_NOT_FOUND: 404,
  ALLOCATION_NOT_FOUND: 404,
  RESOURCE_NOT_FOUND: 404,

  // 409 Conflict
  SLOT_OCCUPIED: 409,
  SLOT_UNAVAILABLE: 409,
  POINT_UNAVAILABLE: 409,
  RESERVATION_CONFLICT: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  CHARGING_ACTIVE: 409,
  CHARGING_REQUEST_QUEUED: 409,
  CONFLICT_STATE: 409,
  POWER_BUDGET_EXCEEDED: 409,
  ALLOCATION_CONFLICT: 409,

  // 422 Unprocessable Entity
  INVALID_STATE_TRANSITION: 422,
  INVALID_INTERVAL: 422,
  POOL_MISMATCH: 422,
  CANCELLATION_WINDOW_CLOSED: 422,
  EARLY_CHECKIN: 422,
  RESERVATION_EXPIRED: 422,
  INCOMPATIBLE_CONNECTOR: 422,
  POINT_NOT_ELIGIBLE: 422,
  INVALID_BATTERY_TARGET: 422,
  INVALID_POWER_REQUEST: 422,
  YIELD_THRESHOLD_NOT_MET: 422,
  VEHICLE_NOT_ELIGIBLE: 422,

  // 503 Service Unavailable
  DEVICE_UNCONFIRMED: 503,
  CHARGING_GUARD_UNAVAILABLE: 503
});

class ParkingChargingError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'ParkingChargingError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const domainError = (status, code, message, details = {}) =>
  new ParkingChargingError(status, code, message, details);

const badRequest = (code, message, details = {}) => domainError(400, code, message, details);
const forbidden = (message = 'You are not allowed to perform this operation.', details = {}) =>
  domainError(403, 'FORBIDDEN_OPERATION', message, details);
const notFound = (code, message, details = {}) => domainError(404, code, message, details);
const conflict = (code, message, details = {}) => domainError(409, code, message, details);
const unprocessable = (code, message, details = {}) => domainError(422, code, message, details);
const deviceUnconfirmed = (message = 'Device confirmation could not be obtained.', details = {}) =>
  domainError(503, 'DEVICE_UNCONFIRMED', message, details);

function mapErrorToHttpStatus(err) {
  if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600) {
    return err.status;
  }
  const code = err && typeof err.code === 'string' ? err.code : '';
  return HTTP_STATUS_BY_CODE[code] || 500;
}

module.exports = {
  ParkingChargingError,
  HTTP_STATUS_BY_CODE,
  domainError,
  badRequest,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  deviceUnconfirmed,
  mapErrorToHttpStatus
};
