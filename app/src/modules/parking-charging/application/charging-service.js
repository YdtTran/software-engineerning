/**
 * Application Service for UC07 (Charging Request Intake & Pre-connection Cancel),
 * UC07A (Safe Charging Stop & Connector Unplug Separation), Session Activation, and Point Safety.
 */

const { randomUUID } = require('node:crypto');
const {
  badRequest,
  forbidden,
  notFound,
  conflict,
  unprocessable
} = require('../domain/errors');
const {
  validateChargingRequestInput,
  resolveStopOutcomes,
  URGENT_SOC_THRESHOLD
} = require('../domain/charging-policies');
const { runDeviceCommand } = require('./device-command-runner');

const OPERATOR_ROLES = new Set(['operator', 'admin']);
const SYSTEM_ROLES = new Set(['system', 'operator', 'admin']);

function isOperatorActor(actor) {
  return Boolean(actor && OPERATOR_ROLES.has(String(actor.role || '').toLowerCase()));
}

function isSystemOrOperator(actor) {
  return Boolean(actor && SYSTEM_ROLES.has(String(actor.role || '').toLowerCase()));
}

class ChargingService {
  constructor({
    client,
    parkingRepo,
    chargingRepo,
    inventoryInterface,
    incidentReporter = null,
    deviceAdapter,
    clock = () => new Date(),
    onRebalanceNeeded = null
  }) {
    if (!client || !parkingRepo || !chargingRepo || !inventoryInterface || !deviceAdapter) {
      throw new Error('ChargingService requires client, parkingRepo, chargingRepo, inventoryInterface, and deviceAdapter.');
    }
    this.client = client;
    this.parkingRepo = parkingRepo;
    this.chargingRepo = chargingRepo;
    this.inventoryInterface = inventoryInterface;
    this.incidentReporter = incidentReporter;
    this.deviceAdapter = deviceAdapter;
    this.clock = clock;
    this.onRebalanceNeeded = onRebalanceNeeded;
  }

  setRebalanceHook(fn) {
    this.onRebalanceNeeded = fn;
  }

  async submitChargingRequest({
    actor,
    occupancyId = null,
    vehicleId = null,
    targetBatteryPercent,
    neededBy = null,
    requestedStart = null
  }) {
    if (!actor || !actor.id) {
      throw forbidden('Authenticated user is required.');
    }

    let occupancy = null;
    let vehicle = null;
    let hubId = null;

    if (occupancyId) {
      occupancy = await this.parkingRepo.getOccupancyById(occupancyId);
      if (!occupancy) throw notFound('OCCUPANCY_NOT_FOUND', `Parking occupancy ${occupancyId} not found.`);
      if (!isOperatorActor(actor) && occupancy.userId !== actor.id) {
        throw forbidden('You do not own the specified parking occupancy.');
      }
      if (occupancy.actualCheckoutAt) {
        throw conflict('CONFLICT_STATE', `Parking occupancy ${occupancyId} has already checked out.`);
      }
      vehicle = await this.parkingRepo.getVehicleById(occupancy.vehicleId);
      if (!vehicle) throw notFound('VEHICLE_NOT_FOUND', `Vehicle ${occupancy.vehicleId} not found.`);
      hubId = occupancy.hubId;
    } else if (vehicleId) {
      vehicle = await this.parkingRepo.getVehicleById(vehicleId);
      if (!vehicle) throw notFound('VEHICLE_NOT_FOUND', `Vehicle ${vehicleId} not found.`);
      if (vehicle.ownerId) {
        if (!isOperatorActor(actor) && vehicle.ownerId !== actor.id) {
          throw forbidden('You do not own the specified private vehicle.');
        }
        occupancy = await this.parkingRepo.getActiveOccupancyByVehicle(vehicle.id);
        if (!occupancy) {
          throw unprocessable('VEHICLE_NOT_ELIGIBLE', 'Private vehicles must check in to a parking occupancy before requesting charging.');
        }
        hubId = occupancy.hubId;
      } else {
        if (!isOperatorActor(actor)) {
          throw forbidden('Only operators can submit charging requests for shared fleet vehicles.');
        }
        const blockedSharedStatuses = new Set([
          'inuse', 'in_use', 'intransit', 'in_transit', 'intransfer', 'in_transfer',
          'transferheld', 'faulty', 'faulted', 'maintenance', 'suspended', 'retired', 'charging'
        ]);
        const statusNormalized = String(vehicle.status || '').toLowerCase();
        if (blockedSharedStatuses.has(statusNormalized)) {
          throw unprocessable('VEHICLE_NOT_ELIGIBLE', `Shared vehicle ${vehicle.id} in status '${vehicle.status}' is not eligible for charging.`);
        }
        hubId = vehicle.hubId;
      }
    } else {
      throw badRequest('INVALID_INPUT', 'occupancyId is required to submit a charging request.');
    }

    const existingOpen = await this.client.get(
      `SELECT id, status FROM charging_requests WHERE vehicle_id = ? AND status IN ('Queued', 'Charging') LIMIT 1;`,
      [vehicle.id]
    );
    if (existingOpen) {
      throw conflict('RESERVATION_CONFLICT', `Vehicle ${vehicle.id} already has open charging request ${existingOpen.id} (${existingOpen.status}).`);
    }

    const now = this.clock();
    const validated = validateChargingRequestInput({
      vehicle,
      targetBatteryPercent,
      neededBy,
      requestedStart,
      occupancy,
      now
    });

    const requestId = `creq_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const nowIso = now.toISOString();

    const created = await this.client.transaction(() =>
      this.chargingRepo.insertRequest({
        id: requestId,
        userId: occupancy ? occupancy.userId : actor.id,
        vehicleId: vehicle.id,
        occupancyId: occupancy ? occupancy.id : null,
        hubId,
        batteryAtRequest: vehicle.batteryPercent,
        targetBatteryPercent: validated.targetBatteryPercent,
        neededBy: validated.neededBy,
        requestedStart: validated.requestedStart,
        manualPriorityRank: null,
        status: 'Queued',
        createdAt: nowIso,
        updatedAt: nowIso
      })
    );

    if (vehicle.batteryPercent < URGENT_SOC_THRESHOLD && typeof this.onRebalanceNeeded === 'function') {
      await this.onRebalanceNeeded(hubId, created.id, { autoAllocate: false });
      return this.chargingRepo.getRequestById(created.id);
    }

    return created;
  }

  async getChargingRequest({ actor, requestId }) {
    const req = await this.chargingRepo.getRequestById(requestId);
    if (!req) throw notFound('REQUEST_NOT_FOUND', `Charging request ${requestId} not found.`);
    if (!isOperatorActor(actor) && req.userId !== actor.id) {
      throw forbidden('You cannot access this charging request.');
    }
    return req;
  }

  async cancelChargingRequest({ actor, requestId }) {
    return this.client.transaction(async () => {
      const req = await this.chargingRepo.getRequestById(requestId);
      if (!req) throw notFound('REQUEST_NOT_FOUND', `Charging request ${requestId} not found.`);
      if (!isOperatorActor(actor) && req.userId !== actor.id) {
        throw forbidden('You cannot cancel this charging request.');
      }

      const activeSession = await this.chargingRepo.getActiveSessionByRequest(requestId);
      if (activeSession) {
        throw conflict('CHARGING_ACTIVE', 'Cannot cancel request while a charging session is Active; stop the session via UC07A instead.');
      }

      const activeAlloc = await this.chargingRepo.getActiveAllocationByRequest(requestId);
      if (activeAlloc && ['Starting', 'Charging', 'Stopping'].includes(activeAlloc.state)) {
        throw conflict('CHARGING_ACTIVE', `Cannot cancel request while point allocation is in state '${activeAlloc.state}'.`);
      }

      if (req.status !== 'Queued') {
        throw conflict('CONFLICT_STATE', `Charging request ${requestId} in status '${req.status}' cannot be cancelled.`);
      }

      const nowIso = this.clock().toISOString();
      if (activeAlloc && activeAlloc.state === 'Reserved') {
        await this.chargingRepo.releaseAllocation(activeAlloc.allocationId, nowIso);
        await this.inventoryInterface.updateChargingPointStatus(activeAlloc.pointId, 'Available');
      }

      await this.chargingRepo.updateRequestStatus(requestId, 'Cancelled', nowIso);
      return this.chargingRepo.getRequestById(requestId);
    });
  }

  async activateAllocation({ actor, allocationId }) {
    if (!isSystemOrOperator(actor)) {
      throw forbidden('Only operators can activate charging allocations.');
    }
    const alloc = await this.chargingRepo.getAllocationById(allocationId);
    if (!alloc) throw notFound('ALLOCATION_NOT_FOUND', `Charging allocation ${allocationId} not found.`);
    if (alloc.releasedAt || !['Reserved', 'Starting'].includes(alloc.state)) {
      throw conflict('CONFLICT_STATE', `Allocation ${allocationId} in state '${alloc.state}' cannot be activated.`);
    }

    const req = await this.chargingRepo.getRequestById(alloc.requestId);
    if (!req || req.status !== 'Queued') {
      throw conflict('CONFLICT_STATE', `Charging request ${alloc.requestId} is not Queued.`);
    }

    const commandId = `cmd_power_on_${alloc.allocationId}`;
    return runDeviceCommand({
      client: this.client,
      chargingRepo: this.chargingRepo,
      commandId,
      targetKind: 'charging_point',
      targetId: alloc.pointId,
      action: 'power_on',
      referenceId: alloc.requestId,
      clock: this.clock,
      beforeSend: async () => {
        const point = await this.chargingRepo.getPointById(alloc.pointId);
        if (!point) throw notFound('POINT_NOT_FOUND', `Charging point ${alloc.pointId} not found.`);
        if (point.status === 'Reserved') {
          await this.chargingRepo.updateAllocationState(alloc.allocationId, 'Starting');
          await this.inventoryInterface.updateChargingPointStatus(alloc.pointId, 'Starting');
        } else if (point.status !== 'Starting') {
          throw conflict('POINT_UNAVAILABLE', `Charging point ${alloc.pointId} is in '${point.status}' and cannot activate.`);
        }
      },
      sendToDevice: ({ commandId: cmdId, attempt }) =>
        this.deviceAdapter.powerOn({
          pointId: alloc.pointId,
          requestId: alloc.requestId,
          powerKw: alloc.allocatedPowerKw,
          vehicleId: req.vehicleId,
          commandId: cmdId,
          attempt
        }),
      onConfirmed: async ({ nowIso }) => {
        const freshAlloc = await this.chargingRepo.getAllocationById(alloc.allocationId);
        if (!freshAlloc || freshAlloc.releasedAt || freshAlloc.state !== 'Starting') {
          throw conflict('CONFLICT_STATE', `Allocation ${alloc.allocationId} changed concurrently.`);
        }
        const sessionId = `csess_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
        await this.chargingRepo.updateAllocationState(alloc.allocationId, 'Charging');
        await this.chargingRepo.updateRequestStatus(alloc.requestId, 'Charging', nowIso);
        await this.inventoryInterface.updateChargingPointStatus(alloc.pointId, 'Charging');
        await this.chargingRepo.syncSharedVehicleChargingStatus(req.vehicleId, 'start');
        return this.chargingRepo.insertSession({
          id: sessionId,
          requestId: alloc.requestId,
          allocationId: alloc.allocationId,
          pointId: alloc.pointId,
          startedAt: nowIso,
          stoppedAt: null,
          allocatedPowerKw: alloc.allocatedPowerKw,
          status: 'Active',
          stopReason: null
        });
      },
      onFailed: async () => {
        await this.chargingRepo.updateAllocationState(alloc.allocationId, 'FaultUncertain');
        await this.inventoryInterface.updateChargingPointStatus(alloc.pointId, 'Fault');
        await this._reportPointIncident(
          alloc.pointId,
          actor,
          `Power-on command ${commandId} failed after 3 attempts on point ${alloc.pointId}; uncertain allocation ${alloc.allocationId} retained.`
        );
      }
    });
  }

  async stopSession({ actor, sessionId, stopReason = 'UserStop', verifiedBatteryPercent = null }) {
    const session = await this.chargingRepo.getSessionById(sessionId);
    if (!session) throw notFound('SESSION_NOT_FOUND', `Charging session ${sessionId} not found.`);

    if (stopReason === 'UserStop') {
      if (!isSystemOrOperator(actor) && session.userId !== actor.id) {
        throw forbidden('You cannot stop this charging session.');
      }
    } else if (!isSystemOrOperator(actor)) {
      throw forbidden('Only system or operators can issue non-user charging stops.');
    }

    if (session.status !== 'Active') {
      throw conflict('CONFLICT_STATE', `Charging session ${sessionId} is '${session.status}', not 'Active'.`);
    }

    const alloc = await this.chargingRepo.getAllocationById(session.allocationId);
    if (!alloc || alloc.releasedAt) {
      throw conflict('CONFLICT_STATE', `Charging allocation ${session.allocationId} is missing or already released.`);
    }

    const commandId = `cmd_power_off_${session.id}`;
    return runDeviceCommand({
      client: this.client,
      chargingRepo: this.chargingRepo,
      commandId,
      targetKind: 'charging_point',
      targetId: session.pointId,
      action: 'power_off',
      referenceId: session.requestId,
      clock: this.clock,
      beforeSend: async () => {
        const point = await this.chargingRepo.getPointById(session.pointId);
        if (!point) throw notFound('POINT_NOT_FOUND', `Charging point ${session.pointId} not found.`);
        if (point.status === 'Charging') {
          await this.chargingRepo.updateAllocationState(alloc.allocationId, 'Stopping');
          await this.inventoryInterface.updateChargingPointStatus(session.pointId, 'Stopping');
        } else if (point.status !== 'Stopping') {
          throw conflict('CONFLICT_STATE', `Charging point ${session.pointId} is in '${point.status}', expected 'Charging' or 'Stopping'.`);
        }
      },
      sendToDevice: ({ commandId: cmdId, attempt }) =>
        this.deviceAdapter.powerOff({
          pointId: session.pointId,
          sessionId: session.id,
          requestId: session.requestId,
          vehicleId: session.vehicleId,
          batteryPercent: verifiedBatteryPercent ?? session.currentBatteryPercent,
          commandId: cmdId,
          attempt
        }),
      onConfirmed: async ({ outcome, nowIso }) => {
        const freshSession = await this.chargingRepo.getSessionById(session.id);
        if (!freshSession || freshSession.status !== 'Active') {
          throw conflict('CONFLICT_STATE', `Charging session ${session.id} is no longer Active.`);
        }

        const verifiedBattery =
          outcome && typeof outcome.batteryPercent === 'number'
            ? outcome.batteryPercent
            : (verifiedBatteryPercent ?? freshSession.currentBatteryPercent);

        if (typeof verifiedBattery === 'number' && Number.isFinite(verifiedBattery)) {
          const clamped = Math.max(0, Math.min(100, Math.round(verifiedBattery)));
          await this.chargingRepo.updateVehicleBattery(freshSession.vehicleId, clamped);
        }
        await this.chargingRepo.syncSharedVehicleChargingStatus(freshSession.vehicleId, 'stop');

        const outcomes = resolveStopOutcomes({
          stopReason,
          verifiedBattery,
          targetBatteryPercent: freshSession.targetBatteryPercent
        });

        await this.chargingRepo.closeSession(freshSession.id, {
          status: outcomes.sessionStatus,
          stopReason: outcomes.stopReason,
          stoppedAt: nowIso
        });
        await this.chargingRepo.updateRequestStatus(freshSession.requestId, outcomes.requestStatus, nowIso);
        await this.chargingRepo.updateAllocationState(alloc.allocationId, 'Complete', { allocatedPowerKw: 0 });
        await this.inventoryInterface.updateChargingPointStatus(freshSession.pointId, 'Complete');

        const updated = await this.chargingRepo.getSessionById(freshSession.id);
        return {
          ...updated,
          requestStatus: outcomes.requestStatus,
          allocatedPowerReleasedKw: alloc.allocatedPowerKw,
          connectorReleased: false
        };
      },
      onFailed: async () => {
        await this.chargingRepo.updateAllocationState(alloc.allocationId, 'FaultUncertain');
        await this.inventoryInterface.updateChargingPointStatus(session.pointId, 'Fault');
        await this._reportPointIncident(
          session.pointId,
          actor,
          `Power-off command ${commandId} unconfirmed after 3 attempts for session ${session.id}; point quarantined and power allocation retained.`
        );
      }
    });
  }

  async confirmUnplug({ actor, pointId }) {
    const point = await this.chargingRepo.getPointById(pointId);
    if (!point) throw notFound('POINT_NOT_FOUND', `Charging point ${pointId} not found.`);
    if (point.status !== 'Complete') {
      throw conflict('CONFLICT_STATE', `Charging point ${pointId} is '${point.status}', expected 'Complete' for unplug.`);
    }

    const alloc = await this.chargingRepo.getActiveAllocationByPoint(pointId);
    if (!alloc || alloc.releasedAt || alloc.state !== 'Complete') {
      throw conflict('CONFLICT_STATE', `Charging point ${pointId} does not have a Complete unreleased allocation.`);
    }

    const req = await this.chargingRepo.getRequestById(alloc.requestId);
    if (!req) throw notFound('REQUEST_NOT_FOUND', `Charging request ${alloc.requestId} not found.`);
    if (!isSystemOrOperator(actor) && req.userId !== actor.id) {
      throw forbidden('You cannot unplug a connector for another user.');
    }

    if (await this.chargingRepo.hasUnresolvedIncident('charging_point', pointId)) {
      throw conflict('POINT_UNAVAILABLE', `Charging point ${pointId} has an unresolved incident blocking release.`);
    }

    const commandId = `cmd_unplug_${alloc.allocationId}`;
    return runDeviceCommand({
      client: this.client,
      chargingRepo: this.chargingRepo,
      commandId,
      targetKind: 'charging_point',
      targetId: pointId,
      action: 'unplug',
      referenceId: alloc.requestId,
      clock: this.clock,
      sendToDevice: ({ commandId: cmdId, attempt }) =>
        this.deviceAdapter.unplug({
          pointId,
          allocationId: alloc.allocationId,
          requestId: alloc.requestId,
          vehicleId: req.vehicleId,
          commandId: cmdId,
          attempt
        }),
      onConfirmed: async ({ nowIso }) => {
        const freshPoint = await this.chargingRepo.getPointById(pointId);
        if (!freshPoint || freshPoint.status !== 'Complete') {
          throw conflict('CONFLICT_STATE', `Charging point ${pointId} changed state before unplug confirmation.`);
        }
        await this.chargingRepo.releaseAllocation(alloc.allocationId, nowIso);
        await this.inventoryInterface.updateChargingPointStatus(pointId, 'Available');
        return {
          pointId,
          status: 'Available',
          allocationId: alloc.allocationId,
          requestId: alloc.requestId,
          releasedAt: nowIso
        };
      },
      onFailed: async () => {
        await this.inventoryInterface.updateChargingPointStatus(pointId, 'Fault');
        await this._reportPointIncident(
          pointId,
          actor,
          `Connector unplug confirmation ${commandId} failed on charging point ${pointId}; point quarantined.`
        );
      }
    });
  }

  async reportChargingProgress({ actor, sessionId, batteryPercent }) {
    if (!Number.isInteger(batteryPercent) || batteryPercent < 0 || batteryPercent > 100) {
      throw badRequest('INVALID_BATTERY', 'batteryPercent must be an integer between 0 and 100.');
    }
    const session = await this.chargingRepo.getSessionById(sessionId);
    if (!session) throw notFound('SESSION_NOT_FOUND', `Charging session ${sessionId} not found.`);
    if (!isSystemOrOperator(actor)) {
      throw forbidden('Only system or operators can report charger telemetry progress.');
    }
    if (session.status !== 'Active') {
      throw conflict('CONFLICT_STATE', `Charging session ${sessionId} is not Active.`);
    }

    await this.chargingRepo.updateVehicleBattery(session.vehicleId, batteryPercent);
    this.deviceAdapter.setBatteryReading(session.vehicleId, batteryPercent);

    if (batteryPercent >= session.targetBatteryPercent) {
      return this.stopSession({
        actor: { id: actor.id || 'system-charger', role: 'system' },
        sessionId,
        stopReason: 'TargetReached',
        verifiedBatteryPercent: batteryPercent
      });
    }

    return this.chargingRepo.getSessionById(sessionId);
  }

  async handlePointFault({ actor, pointId, keepUncertainAllocation = false, description = 'Technical charging fault detected.' }) {
    if (!isSystemOrOperator(actor)) {
      throw forbidden('Only system or operators can isolate a faulted charging point.');
    }

    const result = await this.client.transaction(async () => {
      const point = await this.chargingRepo.getPointById(pointId);
      if (!point) throw notFound('POINT_NOT_FOUND', `Charging point ${pointId} not found.`);

      const nowIso = this.clock().toISOString();
      const activeSession = await this.chargingRepo.getActiveSessionByPoint(pointId);
      const activeAlloc = await this.chargingRepo.getActiveAllocationByPoint(pointId);
      let requeuedRequestId = null;

      if (activeSession) {
        await this.chargingRepo.closeSession(activeSession.id, {
          status: 'Interrupted',
          stopReason: 'TechnicalFault',
          stoppedAt: nowIso
        });
        const interruptedReq = await this.chargingRepo.getRequestById(activeSession.requestId);
        if (interruptedReq) {
          await this.chargingRepo.syncSharedVehicleChargingStatus(interruptedReq.vehicleId, 'stop');
        }
      }

      if (activeAlloc) {
        if (keepUncertainAllocation) {
          await this.chargingRepo.updateAllocationState(activeAlloc.allocationId, 'FaultUncertain');
        } else {
          await this.chargingRepo.releaseAllocation(activeAlloc.allocationId, nowIso);
          await this.chargingRepo.updateRequestStatus(activeAlloc.requestId, 'Queued', nowIso);
          requeuedRequestId = activeAlloc.requestId;
        }
      }

      if (point.status !== 'Fault') {
        await this.inventoryInterface.updateChargingPointStatus(pointId, 'Fault');
      }

      const incident = await this._reportPointIncident(pointId, actor, description);
      return {
        pointId,
        status: 'Fault',
        hubId: point.hubId,
        requeuedRequestId,
        incidentId: incident ? incident.id : null
      };
    });

    if (result.requeuedRequestId && typeof this.onRebalanceNeeded === 'function') {
      await this.onRebalanceNeeded(result.hubId, result.requeuedRequestId, {
        autoAllocate: true,
        onlyTriggerRequest: true
      });
    }
    return result;
  }

  async reconcileUncertainAllocation({ actor, allocationId }) {
    if (!isOperatorActor(actor)) {
      throw forbidden('Only operators can reconcile uncertain power allocations.');
    }
    return this.client.transaction(async () => {
      const alloc = await this.chargingRepo.getAllocationById(allocationId);
      if (!alloc) throw notFound('ALLOCATION_NOT_FOUND', `Allocation ${allocationId} not found.`);
      if (alloc.releasedAt || alloc.state !== 'FaultUncertain') {
        throw conflict('CONFLICT_STATE', `Allocation ${allocationId} is not an active FaultUncertain allocation.`);
      }
      const nowIso = this.clock().toISOString();
      await this.chargingRepo.releaseAllocation(allocationId, nowIso);
      const req = await this.chargingRepo.getRequestById(alloc.requestId);
      if (req && req.status === 'Charging') {
        await this.chargingRepo.updateRequestStatus(req.id, 'Queued', nowIso);
      }
      return this.chargingRepo.getAllocationById(allocationId);
    });
  }

  async runPointSafetyCheck({ actor, pointId }) {
    if (!isOperatorActor(actor)) {
      throw forbidden('Only operators can run a post-repair safety verification.');
    }
    const point = await this.chargingRepo.getPointById(pointId);
    if (!point) throw notFound('POINT_NOT_FOUND', `Charging point ${pointId} not found.`);

    const commandId = `cmd_safety_${pointId}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    return runDeviceCommand({
      client: this.client,
      chargingRepo: this.chargingRepo,
      commandId,
      targetKind: 'charging_point',
      targetId: pointId,
      action: 'safety_check',
      referenceId: pointId,
      clock: this.clock,
      sendToDevice: ({ commandId: cmdId, attempt }) =>
        this.deviceAdapter.verifyPointSafety({ pointId, commandId: cmdId, attempt }),
      onConfirmed: async ({ nowIso }) => ({
        pointId,
        commandId,
        safetyVerified: true,
        verifiedAt: nowIso
      })
    });
  }

  async getChargingSession({ actor, sessionId }) {
    const session = await this.chargingRepo.getSessionById(sessionId);
    if (!session) throw notFound('SESSION_NOT_FOUND', `Charging session ${sessionId} not found.`);
    if (!isSystemOrOperator(actor) && session.userId !== actor.id) {
      throw forbidden('You cannot access this charging session.');
    }
    return session;
  }

  async _reportPointIncident(pointId, actor, description) {
    if (!this.incidentReporter || typeof this.incidentReporter.reportEquipmentIncident !== 'function') {
      return null;
    }
    return this.incidentReporter.reportEquipmentIncident({
      resourceKind: 'charging_point',
      resourceId: pointId,
      description,
      severity: 'Emergency',
      reporterId: isOperatorActor(actor) ? actor.id : 'system-parking-charging',
      reporterRole: isOperatorActor(actor) ? 'Operator' : 'System'
    });
  }
}

module.exports = {
  ChargingService
};
