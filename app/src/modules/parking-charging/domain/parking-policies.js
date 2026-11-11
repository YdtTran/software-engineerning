/**
 * Pure domain business policies for UC06 (BR08, BR08a, BR08b) parking lifecycle.
 */

const { badRequest, conflict, unprocessable } = require('./errors');

const ADVANCE_CANCEL_CUTOFF_MS = 10 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

function parseIsoInstant(value, fieldName = 'timestamp') {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)) {
    throw badRequest('INVALID_INPUT', `${fieldName} must be an ISO 8601 timestamp with timezone offset.`);
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw badRequest('INVALID_INPUT', `${fieldName} is not a valid timestamp.`);
  }
  return new Date(ms);
}

function validatePoolAndInterval({ pool, plannedArrival, plannedCheckout, now = new Date() }) {
  if (pool !== 'immediate' && pool !== 'advance') {
    throw badRequest('INVALID_INPUT', "Parking pool must be 'immediate' or 'advance'.");
  }

  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);

  if (pool === 'advance') {
    if (!plannedArrival || !plannedCheckout) {
      throw badRequest('INVALID_INPUT', 'Advance reservations require plannedArrival and plannedCheckout.');
    }
    const arrival = parseIsoInstant(plannedArrival, 'plannedArrival');
    const checkout = parseIsoInstant(plannedCheckout, 'plannedCheckout');
    if (checkout.getTime() <= arrival.getTime()) {
      throw unprocessable('INVALID_INTERVAL', 'plannedCheckout must be strictly after plannedArrival.');
    }
    if (arrival.getTime() < nowMs) {
      throw unprocessable('INVALID_INTERVAL', 'plannedArrival cannot be in the past.');
    }
    return {
      plannedArrival: arrival.toISOString(),
      plannedCheckout: checkout.toISOString()
    };
  }

  // Immediate parking: scheduledCheckoutTime is optional per BR08b resolution.
  if (plannedArrival !== undefined && plannedArrival !== null) {
    throw badRequest('INVALID_INPUT', 'Immediate reservations must not specify plannedArrival.');
  }
  let normalizedCheckout = null;
  if (plannedCheckout !== undefined && plannedCheckout !== null) {
    const checkout = parseIsoInstant(plannedCheckout, 'plannedCheckout');
    if (checkout.getTime() <= nowMs) {
      throw unprocessable('INVALID_INTERVAL', 'plannedCheckout must be strictly after the current time.');
    }
    normalizedCheckout = checkout.toISOString();
  }
  return {
    plannedArrival: null,
    plannedCheckout: normalizedCheckout
  };
}

function computeArrivalDeadline({ pool, hub, createdAt, plannedArrival, plannedCheckout }) {
  const createdMs = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (pool === 'immediate') {
    return new Date(createdMs + hub.immediateHoldTtlMinutes * 60000).toISOString();
  }
  const arrivalMs = Date.parse(plannedArrival);
  const checkoutMs = Date.parse(plannedCheckout);
  const graceEndMs = arrivalMs + hub.lateArrivalGraceMinutes * 60000;
  return new Date(Math.min(graceEndMs, checkoutMs)).toISOString();
}

function assertCancellable(reservation, now = new Date()) {
  if (reservation.status !== 'Reserved') {
    throw conflict('CONFLICT_STATE', `Reservation ${reservation.id} in state '${reservation.status}' cannot be cancelled.`);
  }
  if (reservation.pool === 'advance') {
    const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
    const arrivalMs = Date.parse(reservation.plannedArrival);
    if (arrivalMs - nowMs < ADVANCE_CANCEL_CUTOFF_MS) {
      throw unprocessable(
        'CANCELLATION_WINDOW_CLOSED',
        'Advance parking reservations can only be cancelled at least 10 minutes before plannedArrival.'
      );
    }
  }
}

function assertValidCheckInWindow(reservation, now = new Date()) {
  if (reservation.status !== 'Reserved') {
    throw conflict('CONFLICT_STATE', `Reservation ${reservation.id} is '${reservation.status}', not 'Reserved'.`);
  }
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const expiresMs = Date.parse(reservation.expiresAt);

  if (reservation.pool === 'advance') {
    const arrivalMs = Date.parse(reservation.plannedArrival);
    const checkoutMs = Date.parse(reservation.plannedCheckout);
    if (nowMs < arrivalMs) {
      throw unprocessable('EARLY_CHECKIN', 'Cannot check in before plannedArrival.', {
        plannedArrival: reservation.plannedArrival
      });
    }
    if (nowMs >= expiresMs || nowMs >= checkoutMs) {
      throw unprocessable('RESERVATION_EXPIRED', 'Advance reservation arrival window has expired.', {
        expiresAt: reservation.expiresAt
      });
    }
    return;
  }

  if (nowMs >= expiresMs) {
    throw unprocessable('RESERVATION_EXPIRED', 'Immediate reservation hold has expired.', {
      expiresAt: reservation.expiresAt
    });
  }
}

/**
 * BR08b: extraFee = ceil(max(0, actualCheckout - scheduledCheckout - graceMinutes) / 60m) * rate.
 * Returns null if scheduledCheckoutAt is absent (immediate parking without agreed checkout time).
 */
function calculateOverstayFee({
  scheduledCheckoutAt,
  actualCheckoutAt,
  overstayGraceMinutes,
  overstayRatePerHour
}) {
  if (!scheduledCheckoutAt) return null;
  const scheduledMs = Date.parse(scheduledCheckoutAt);
  const actualMs = Date.parse(actualCheckoutAt);
  const graceDeadlineMs = scheduledMs + overstayGraceMinutes * 60000;
  const overstayMs = actualMs - graceDeadlineMs;
  if (overstayMs <= 0) return 0;
  const billableHours = Math.ceil(overstayMs / MS_PER_HOUR);
  return billableHours * overstayRatePerHour;
}

module.exports = {
  ADVANCE_CANCEL_CUTOFF_MS,
  parseIsoInstant,
  validatePoolAndInterval,
  computeArrivalDeadline,
  assertCancellable,
  assertValidCheckInWindow,
  calculateOverstayFee
};
