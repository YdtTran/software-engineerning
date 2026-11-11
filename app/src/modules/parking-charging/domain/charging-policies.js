/**
 * Pure domain policies for UC07 / UC07A charging validation, SC02 stop outcomes,
 * UC12 / BR15 scheduling priority & power budget math.
 */

const { unprocessable } = require('./errors');
const { parseIsoInstant } = require('./parking-policies');

const DEFAULT_NEEDED_BY_HOURS = 2;
const BR15_POWER_LIMIT_FACTOR = 0.85;
const URGENT_SOC_THRESHOLD = 10;
const EMERGENCY_SOC_THRESHOLD = 20;
const PREEMPTION_MIN_SOC = 80;
const EPSILON_KW = 1e-6;

function validateChargingRequestInput({
  vehicle,
  targetBatteryPercent,
  neededBy = null,
  requestedStart = null,
  occupancy = null,
  now = new Date()
}) {
  if (!Number.isInteger(targetBatteryPercent)) {
    throw unprocessable('INVALID_BATTERY_TARGET', 'targetBatteryPercent must be an integer.');
  }
  if (targetBatteryPercent <= vehicle.batteryPercent || targetBatteryPercent > 100) {
    throw unprocessable(
      'INVALID_BATTERY_TARGET',
      `targetBatteryPercent (${targetBatteryPercent}) must be strictly above current battery (${vehicle.batteryPercent}%) and at most 100%.`
    );
  }

  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  let effectiveStart = null;
  if (requestedStart !== undefined && requestedStart !== null) {
    effectiveStart = parseIsoInstant(requestedStart, 'requestedStart').toISOString();
  }

  let effectiveNeededBy;
  if (neededBy !== undefined && neededBy !== null) {
    const parsedNeededBy = parseIsoInstant(neededBy, 'neededBy');
    if (parsedNeededBy.getTime() <= nowMs) {
      throw unprocessable('INVALID_INTERVAL', 'neededBy must be in the future.');
    }
    effectiveNeededBy = parsedNeededBy.toISOString();
  } else if (occupancy && occupancy.scheduledCheckoutAt && Date.parse(occupancy.scheduledCheckoutAt) > nowMs) {
    effectiveNeededBy = new Date(Date.parse(occupancy.scheduledCheckoutAt)).toISOString();
  } else {
    effectiveNeededBy = new Date(nowMs + DEFAULT_NEEDED_BY_HOURS * 60 * 60 * 1000).toISOString();
  }

  if (effectiveStart && Date.parse(effectiveStart) > Date.parse(effectiveNeededBy)) {
    throw unprocessable('INVALID_INTERVAL', 'requestedStart cannot be after neededBy.');
  }

  return {
    targetBatteryPercent,
    neededBy: effectiveNeededBy,
    requestedStart: effectiveStart
  };
}

function resolveStopOutcomes({ stopReason, verifiedBattery, targetBatteryPercent }) {
  const allowedReasons = new Set(['UserStop', 'TargetReached', 'PriorityYield', 'TechnicalFault']);
  if (!allowedReasons.has(stopReason)) {
    throw unprocessable('INVALID_INPUT', `Unsupported charging stopReason '${stopReason}'.`);
  }

  const targetReached =
    typeof verifiedBattery === 'number' &&
    Number.isFinite(verifiedBattery) &&
    verifiedBattery >= targetBatteryPercent;

  if (targetReached && stopReason !== 'PriorityYield' && stopReason !== 'TechnicalFault') {
    return {
      sessionStatus: 'Completed',
      stopReason: 'TargetReached',
      requestStatus: 'Completed'
    };
  }

  if (targetReached && (stopReason === 'PriorityYield' || stopReason === 'TechnicalFault')) {
    return {
      sessionStatus: 'Completed',
      stopReason: 'TargetReached',
      requestStatus: 'Completed'
    };
  }

  if (stopReason === 'UserStop') {
    return {
      sessionStatus: 'Interrupted',
      stopReason: 'UserStop',
      requestStatus: 'Cancelled'
    };
  }

  return {
    sessionStatus: 'Interrupted',
    stopReason,
    requestStatus: 'Queued'
  };
}

function getRequestPriorityTier(req) {
  const battery = typeof req.currentBatteryPercent === 'number' ? req.currentBatteryPercent : req.batteryAtRequest;
  if (battery < URGENT_SOC_THRESHOLD) return 0;
  if (battery < EMERGENCY_SOC_THRESHOLD) return 1;
  if (req.vehicleOwnerId === null && Boolean(req.sharedReservationId)) return 2;
  return 3;
}

/**
 * Pure comparator & sorter for UC12 charging queue:
 * - Tier 0: < 10% SoC urgent jump-ahead (always precedes non-<10% unless manually ranked within tier)
 * - Bounded manualPriorityRank (positive integer override within non-urgent or operator-curated queue)
 * - Tier 1: < 20% SoC emergency
 * - Tier 2: shared fleet with upcoming reservation
 * - Tier 3: standard private/shared ranked by neededBy ASC
 * - Tie-breaker: created_at ASC, seqOrder (rowid) ASC
 */
function computePriorityOrder(queuedRequests) {
  return [...queuedRequests].sort((a, b) => {
    const aTier = getRequestPriorityTier(a);
    const bTier = getRequestPriorityTier(b);

    // Critical <10% always stays ahead of non-<10% safety boundary unless both are <10%.
    if ((aTier === 0) !== (bTier === 0)) {
      return aTier === 0 ? -1 : 1;
    }

    const aManual = Number.isInteger(a.manualPriorityRank) ? a.manualPriorityRank : null;
    const bManual = Number.isInteger(b.manualPriorityRank) ? b.manualPriorityRank : null;
    if (aManual !== null && bManual !== null && aManual !== bManual) {
      return aManual - bManual;
    }
    if ((aManual !== null) !== (bManual !== null)) {
      return aManual !== null ? -1 : 1;
    }

    if (aTier !== bTier) return aTier - bTier;

    const aNeeded = Date.parse(a.neededBy);
    const bNeeded = Date.parse(b.neededBy);
    if (aNeeded !== bNeeded) return aNeeded - bNeeded;

    const aCreated = Date.parse(a.createdAt);
    const bCreated = Date.parse(b.createdAt);
    if (aCreated !== bCreated) return aCreated - bCreated;

    return (a.seqOrder || 0) - (b.seqOrder || 0);
  });
}

function computeRecommendedPointPowerLimit(pointRatedKw) {
  return Number((pointRatedKw * BR15_POWER_LIMIT_FACTOR).toFixed(4));
}

module.exports = {
  BR15_POWER_LIMIT_FACTOR,
  URGENT_SOC_THRESHOLD,
  EMERGENCY_SOC_THRESHOLD,
  PREEMPTION_MIN_SOC,
  EPSILON_KW,
  validateChargingRequestInput,
  resolveStopOutcomes,
  getRequestPriorityTier,
  computePriorityOrder,
  computeRecommendedPointPowerLimit
};
