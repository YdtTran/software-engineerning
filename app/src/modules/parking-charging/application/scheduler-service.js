/**
 * Application Service for UC12 (Charging Queue Monitoring, Priority Ranking,
 * Atomic Port & BR15 Power Budget Allocation, Operator Overrides) and FR-NI04 Dynamic Rebalancing.
 */

const { randomUUID } = require('node:crypto');
const {
  badRequest,
  forbidden,
  notFound,
  conflict,
  unprocessable
} = require('../domain/errors');
const { parseIsoInstant } = require('../domain/parking-policies');
const {
  EPSILON_KW,
  PREEMPTION_MIN_SOC,
  URGENT_SOC_THRESHOLD,
  computePriorityOrder
} = require('../domain/charging-policies');

const OPERATOR_ROLES = new Set(['operator', 'admin']);
const SYSTEM_ROLES = new Set(['system', 'operator', 'admin']);
const SYSTEM_SCHEDULER_ACTOR = Object.freeze({ id: 'system-scheduler', role: 'system' });

function isOperatorActor(actor) {
  return Boolean(actor && OPERATOR_ROLES.has(String(actor.role || '').toLowerCase()));
}

function isSystemOrOperator(actor) {
  return Boolean(actor && SYSTEM_ROLES.has(String(actor.role || '').toLowerCase()));
}

class SchedulerService {
  constructor({
    client,
    chargingRepo,
    inventoryInterface,
    chargingService,
    deviceAdapter,
    clock = () => new Date()
  }) {
    if (!client || !chargingRepo || !inventoryInterface || !chargingService || !deviceAdapter) {
      throw new Error('SchedulerService requires client, chargingRepo, inventoryInterface, chargingService, and deviceAdapter.');
    }
    this.client = client;
    this.chargingRepo = chargingRepo;
    this.inventoryInterface = inventoryInterface;
    this.chargingService = chargingService;
    this.deviceAdapter = deviceAdapter;
    this.clock = clock;
  }

  async getHubChargingSchedule({ actor, hubId }) {
    if (!isSystemOrOperator(actor)) {
      throw forbidden('Only operators can inspect the hub charging schedule.');
    }
    const hub = await this.chargingRepo.getHubById(hubId);
    if (!hub) throw notFound('HUB_NOT_FOUND', `Hub ${hubId} not found.`);

    const rawQueue = await this.chargingRepo.listQueuedRequestsByHub(hubId);
    const queue = computePriorityOrder(rawQueue);
    const points = await this.chargingRepo.listPointsByHub(hubId);
    const allocations = await this.chargingRepo.listActiveAllocationsByHub(hubId);
    const allocatedPowerKw = await this.chargingRepo.getSummedAllocatedPowerAtHub(hubId);

    return {
      hubId: hub.id,
      hubName: hub.name,
      powerLimitKW: hub.powerLimitKw,
      allocatedPowerKw: Number(allocatedPowerKw.toFixed(4)),
      remainingPowerKw: Number(Math.max(0, hub.powerLimitKw - allocatedPowerKw).toFixed(4)),
      queue,
      points,
      allocations
    };
  }

  async allocateChargingRequest({
    actor,
    requestId,
    pointId = null,
    portId = null,
    startAt = null,
    endAt = null,
    powerKw
  }) {
    if (!isSystemOrOperator(actor)) {
      throw forbidden('Only operators can allocate charging ports and power.');
    }
    const targetPointId = pointId || portId;
    if (!targetPointId) {
      throw badRequest('INVALID_INPUT', 'portId (or pointId) is required.');
    }
    if (typeof powerKw !== 'number' || !Number.isFinite(powerKw) || powerKw <= 0) {
      throw unprocessable('INVALID_POWER_REQUEST', 'powerKw must be a positive finite number.');
    }

    const now = this.clock();
    const nowIso = now.toISOString();

    return this.client.transaction(async () => {
      const req = await this.chargingRepo.getRequestById(requestId);
      if (!req) throw notFound('REQUEST_NOT_FOUND', `Charging request ${requestId} not found.`);
      if (req.status !== 'Queued') {
        throw conflict('CONFLICT_STATE', `Charging request ${requestId} is '${req.status}', not 'Queued'.`);
      }

      const existingReqAlloc = await this.chargingRepo.getActiveAllocationByRequest(requestId);
      if (existingReqAlloc) {
        throw conflict(
          'ALLOCATION_CONFLICT',
          `Charging request ${requestId} already holds active allocation ${existingReqAlloc.allocationId}.`
        );
      }

      const effectiveStart = startAt ? parseIsoInstant(startAt, 'startAt').toISOString() : nowIso;
      const fallbackEnd = Date.parse(req.neededBy) > now.getTime()
        ? req.neededBy
        : new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      const effectiveEnd = endAt ? parseIsoInstant(endAt, 'endAt').toISOString() : fallbackEnd;
      if (Date.parse(effectiveEnd) <= Date.parse(effectiveStart) || Date.parse(effectiveEnd) <= now.getTime()) {
        throw unprocessable('INVALID_INTERVAL', 'Allocation [startAt, endAt) window must be non-empty and end in the future.');
      }

      const point = await this.chargingRepo.getPointById(targetPointId);
      if (!point) throw notFound('POINT_NOT_FOUND', `Charging point ${targetPointId} not found.`);
      if (point.hubId !== req.hubId) {
        throw unprocessable('POINT_NOT_ELIGIBLE', `Point ${targetPointId} is at hub '${point.hubId}', not '${req.hubId}'.`);
      }
      if (point.status !== 'Available') {
        throw conflict('POINT_UNAVAILABLE', `Charging point ${targetPointId} is '${point.status}', not 'Available'.`);
      }
      if (await this.chargingRepo.hasUnresolvedIncident('charging_point', targetPointId)) {
        throw conflict('POINT_UNAVAILABLE', `Charging point ${targetPointId} has an unresolved operational incident.`);
      }
      if (await this.chargingRepo.getActiveAllocationByPoint(targetPointId)) {
        throw conflict('ALLOCATION_CONFLICT', `Charging point ${targetPointId} is already allocated.`);
      }

      if (String(req.vehicleConnectorType).toLowerCase() !== String(point.connectorType).toLowerCase()) {
        throw unprocessable(
          'INCOMPATIBLE_CONNECTOR',
          `Vehicle connector '${req.vehicleConnectorType}' is incompatible with point '${point.connectorType}'.`
        );
      }

      if (powerKw > point.ratedPowerKw + EPSILON_KW) {
        throw unprocessable(
          'INVALID_POWER_REQUEST',
          `Requested ${powerKw} kW exceeds point ${targetPointId} rated power ${point.ratedPowerKw} kW.`
        );
      }

      const hub = await this.chargingRepo.getHubById(req.hubId);
      const currentAllocatedKw = await this.chargingRepo.getSummedAllocatedPowerAtHub(req.hubId);
      if (currentAllocatedKw + powerKw > hub.powerLimitKw + EPSILON_KW) {
        throw conflict(
          'POWER_BUDGET_EXCEEDED',
          `Allocating ${powerKw} kW would exceed hub ${req.hubId} BR15 power limit ${hub.powerLimitKw} kW (current: ${currentAllocatedKw} kW).`,
          {
            hubId: req.hubId,
            currentAllocatedKw,
            requestedKw: powerKw,
            powerLimitKW: hub.powerLimitKw
          }
        );
      }

      const allocationId = `alloc_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
      const alloc = await this.chargingRepo.insertAllocation({
        allocationId,
        pointId: point.id,
        requestId: req.id,
        hubId: req.hubId,
        startAt: effectiveStart,
        endAt: effectiveEnd,
        allocatedPowerKw: powerKw,
        reservedPowerKw: powerKw,
        state: 'Reserved',
        createdAt: nowIso,
        releasedAt: null
      });

      await this.inventoryInterface.updateChargingPointStatus(point.id, 'Reserved');

      return {
        allocationId: alloc.allocationId,
        requestId: req.id,
        requestStatus: req.status,
        pointId: point.id,
        portId: point.id,
        pointStatus: 'Reserved',
        startAt: alloc.startAt,
        endAt: alloc.endAt,
        allocatedPowerKw: alloc.allocatedPowerKw
      };
    });
  }

  async overrideChargingSchedule({ actor, hubId, overrides }) {
    if (!isOperatorActor(actor)) {
      throw forbidden('Only operators can manually override charging schedule priorities.');
    }
    const hub = await this.chargingRepo.getHubById(hubId);
    if (!hub) throw notFound('HUB_NOT_FOUND', `Hub ${hubId} not found.`);
    if (!Array.isArray(overrides) || overrides.length === 0) {
      throw badRequest('INVALID_INPUT', 'overrides must be a non-empty array of { requestId, priorityRank }.');
    }

    const nowIso = this.clock().toISOString();
    await this.client.transaction(async () => {
      for (const entry of overrides) {
        if (!entry || !entry.requestId) {
          throw badRequest('INVALID_INPUT', 'Each override entry must include requestId.');
        }
        const rank = entry.priorityRank;
        if (rank !== null && (!Number.isInteger(rank) || rank < 1 || rank > 1000)) {
          throw unprocessable('INVALID_INPUT', 'priorityRank must be an integer between 1 and 1000, or null to clear.');
        }
        const req = await this.chargingRepo.getRequestById(entry.requestId);
        if (!req) throw notFound('REQUEST_NOT_FOUND', `Charging request ${entry.requestId} not found.`);
        if (req.hubId !== hubId) {
          throw unprocessable('POINT_NOT_ELIGIBLE', `Charging request ${entry.requestId} belongs to hub ${req.hubId}, not ${hubId}.`);
        }
        if (req.status !== 'Queued') {
          throw conflict('CONFLICT_STATE', `Charging request ${entry.requestId} in status '${req.status}' cannot be reordered.`);
        }
        await this.chargingRepo.setManualPriorityRank(req.id, rank, nowIso);
      }
    });

    return this.getHubChargingSchedule({ actor, hubId });
  }

  /**
   * FR-NI04 dynamic rebalance:
   * 1) Pre-empt >=80% active sessions (PriorityYield) when an urgent <10% request lacks free port/power.
   * 2) Optionally allocate prioritized or interrupted requests onto compatible safe Available ports within BR15 budget.
   */
  async rebalanceHubQueue(hubId, { triggerRequestId = null, autoAllocate = false, onlyTriggerRequest = false } = {}) {
    const hub = await this.chargingRepo.getHubById(hubId);
    if (!hub) return { hubId, preemptedSessionIds: [], allocated: [], queue: [] };

    const preemptedSessionIds = [];
    const allocated = [];

    const scheduleBefore = await this.getHubChargingSchedule({ actor: SYSTEM_SCHEDULER_ACTOR, hubId });
    const unallocatedQueue = [];
    for (const req of scheduleBefore.queue) {
      if (!(await this.chargingRepo.getActiveAllocationByRequest(req.id))) {
        unallocatedQueue.push(req);
      }
    }

    const urgentWaiting = unallocatedQueue.filter(
      r => (typeof r.currentBatteryPercent === 'number' ? r.currentBatteryPercent : r.batteryAtRequest) < URGENT_SOC_THRESHOLD
    );

    if (urgentWaiting.length > 0) {
      for (const urgentReq of urgentWaiting) {
        const compatibleIdlePoint = await this._findCompatibleSafePoint(hubId, urgentReq.connectorType);
        const currentAllocatedKw = await this.chargingRepo.getSummedAllocatedPowerAtHub(hubId);
        const remainingKw = hub.powerLimitKw - currentAllocatedKw;
        const needsYield = !compatibleIdlePoint || remainingKw < Math.min(compatibleIdlePoint.ratedPowerKw, 1.0) - EPSILON_KW;

        if (!needsYield) continue;

        const yieldedId = await this._tryPreemptEligibleSession(hubId);
        if (yieldedId) {
          preemptedSessionIds.push(yieldedId);
        }
      }
    }

    if (autoAllocate) {
      const candidates = onlyTriggerRequest && triggerRequestId
        ? unallocatedQueue.filter(r => r.id === triggerRequestId)
        : unallocatedQueue;

      for (const req of candidates) {
        const point = await this._findCompatibleSafePoint(hubId, req.connectorType);
        if (!point) continue;

        const currentAllocatedKw = await this.chargingRepo.getSummedAllocatedPowerAtHub(hubId);
        const remainingKw = Number((hub.powerLimitKw - currentAllocatedKw).toFixed(4));
        if (remainingKw < 0.5) break;

        const grantKw = Number(Math.min(point.ratedPowerKw, remainingKw).toFixed(4));
        try {
          const result = await this.allocateChargingRequest({
            actor: SYSTEM_SCHEDULER_ACTOR,
            requestId: req.id,
            pointId: point.id,
            powerKw: grantKw
          });
          allocated.push(result);
        } catch {
          // Skip if point or budget changed concurrently or window invalid.
        }
      }
    }

    const after = await this.getHubChargingSchedule({ actor: SYSTEM_SCHEDULER_ACTOR, hubId });
    return {
      hubId,
      preemptedSessionIds,
      allocated,
      queue: after.queue
    };
  }

  async _findCompatibleSafePoint(hubId, connectorType) {
    const points = await this.chargingRepo.listPointsByHub(hubId);
    for (const point of points) {
      if (point.status !== 'Available') continue;
      if (String(point.connectorType).toLowerCase() !== String(connectorType).toLowerCase()) continue;
      if (await this.chargingRepo.hasUnresolvedIncident('charging_point', point.id)) continue;
      if (await this.chargingRepo.getActiveAllocationByPoint(point.id)) continue;
      return point;
    }
    return null;
  }

  async _tryPreemptEligibleSession(hubId) {
    const activeSessions = await this.chargingRepo.listActiveSessionsByHub(hubId);
    for (const session of activeSessions) {
      const adapterSoc = this.deviceAdapter.getBatteryReading(session.vehicleId);
      const verifiedSoc = typeof adapterSoc === 'number' ? adapterSoc : session.currentBatteryPercent;
      if (verifiedSoc >= PREEMPTION_MIN_SOC) {
        await this.chargingService.stopSession({
          actor: SYSTEM_SCHEDULER_ACTOR,
          sessionId: session.id,
          stopReason: 'PriorityYield',
          verifiedBatteryPercent: verifiedSoc
        });
        return session.id;
      }
    }
    return null;
  }
}

module.exports = {
  SchedulerService
};
