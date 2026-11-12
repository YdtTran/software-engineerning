/**
 * HTTP Controller for Parking & Charging Module (UC06, UC07, UC07A, UC12).
 * Conforms to docs/architecture/API_CONTRACTS.md shared JSON envelope & RBAC.
 */

const { mapErrorToHttpStatus } = require('../domain/errors');
const { IdempotencyHelper } = require('./idempotency-helper');

function resolveActor(req) {
  const user = req && req.user;
  if (!user || typeof user.id !== 'string' || !user.id.trim()) {
    return null;
  }
  const roles = new Set();
  if (Array.isArray(user.roles)) {
    for (const r of user.roles) {
      if (typeof r === 'string' && r.trim()) roles.add(r.trim().toLowerCase());
    }
  }
  if (typeof user.role === 'string' && user.role.trim()) {
    roles.add(user.role.trim().toLowerCase());
  }
  if (roles.size === 0) return null;

  const isOperator = roles.has('operator') || roles.has('admin');
  const isUser = roles.has('user') || roles.has('customer');
  return {
    id: user.id,
    roles,
    role: isOperator ? 'operator' : 'user',
    isOperator,
    isUser
  };
}

function sendError(res, status, code, message, details = {}) {
  if (status >= 500 && status !== 503) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unable to process the request.',
        details: {}
      }
    });
  }
  return res.status(status).json({
    error: {
      code: code || 'INTERNAL_ERROR',
      message: message || 'Unable to process the request.',
      details: details || {}
    }
  });
}

class ParkingChargingController {
  constructor({ client, parkingService, chargingService, schedulerService, idempotencyHelper = null }) {
    this.parkingService = parkingService;
    this.chargingService = chargingService;
    this.schedulerService = schedulerService;
    this.idempotency = idempotencyHelper || new IdempotencyHelper(client);
  }

  _requireAccess(req, res, allowedPolicy) {
    const actor = resolveActor(req);
    if (!actor) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return null;
    }
    if (allowedPolicy === 'U' && !actor.isUser) {
      sendError(res, 403, 'FORBIDDEN_OPERATION', 'This endpoint requires a User account.');
      return null;
    }
    if (allowedPolicy === 'O' && !actor.isOperator) {
      sendError(res, 403, 'FORBIDDEN_OPERATION', 'This endpoint requires an Operator account.');
      return null;
    }
    if (allowedPolicy === 'UO' && !actor.isUser && !actor.isOperator) {
      sendError(res, 403, 'FORBIDDEN_OPERATION', 'You are not allowed to perform this operation.');
      return null;
    }
    return actor;
  }

  _handleError(res, err) {
    const status = mapErrorToHttpStatus(err);
    return sendError(res, status, err && err.code, err && err.message, err && err.details);
  }

  async _runRead(req, res, allowedPolicy, fn) {
    const actor = this._requireAccess(req, res, allowedPolicy);
    if (!actor) return;
    try {
      const data = await fn(actor);
      return res.status(200).json({ data });
    } catch (err) {
      return this._handleError(res, err);
    }
  }

  async _runIdempotentWrite(req, res, allowedPolicy, successStatus, fn) {
    const actor = this._requireAccess(req, res, allowedPolicy);
    if (!actor) return;

    try {
      const outcome = await this.idempotency.execute(req, actor.id, async () => {
        try {
          const data = await fn(actor);
          return { status: successStatus, body: { data } };
        } catch (err) {
          const status = mapErrorToHttpStatus(err);
          const errorBody = status >= 500 && status !== 503
            ? { code: 'INTERNAL_ERROR', message: 'Unable to process the request.', details: {} }
            : { code: err.code || 'INTERNAL_ERROR', message: err.message, details: err.details || {} };
          return { status, body: { error: errorBody } };
        }
      });
      return res.status(outcome.status).json(outcome.body);
    } catch (err) {
      return this._handleError(res, err);
    }
  }

  // UC06 Parking Endpoints
  getParkingAvailability(req, res) {
    return this._runRead(req, res, 'U', actor =>
      this.parkingService.getParkingAvailability({
        actor,
        hubId: req.params.hubId,
        privateVehicleId: req.query.privateVehicleId || req.query.vehicleId || null,
        pool: req.query.pool,
        plannedArrival: req.query.plannedArrival || null,
        plannedCheckout: req.query.plannedCheckout || null
      })
    );
  }

  createReservation(req, res) {
    const body = req.body || {};
    return this._runIdempotentWrite(req, res, 'U', 201, actor =>
      this.parkingService.createReservation({
        actor,
        vehicleId: body.privateVehicleId || body.vehicleId,
        hubId: body.hubId,
        pool: body.pool,
        slotId: body.slotId || null,
        plannedArrival: body.plannedArrival ?? null,
        plannedCheckout: body.plannedCheckout ?? null
      })
    );
  }

  cancelReservation(req, res) {
    return this._runIdempotentWrite(req, res, 'U', 200, actor =>
      this.parkingService.cancelReservation({
        actor,
        reservationId: req.params.id
      })
    );
  }

  getReservation(req, res) {
    return this._runRead(req, res, 'UO', actor =>
      this.parkingService.getReservation({
        actor,
        reservationId: req.params.id
      })
    );
  }

  checkInReservation(req, res) {
    const body = req.body || {};
    return this._runIdempotentWrite(req, res, 'UO', 200, actor =>
      this.parkingService.checkInReservation({
        actor,
        reservationId: req.params.id,
        hubId: body.hubId,
        ticketCode: body.ticketCode
      })
    );
  }

  checkOutOccupancy(req, res) {
    const body = req.body || {};
    return this._runIdempotentWrite(req, res, 'UO', 200, actor =>
      this.parkingService.checkOutOccupancy({
        actor,
        occupancyId: req.params.id,
        cancelQueuedCharging: Boolean(body.cancelQueuedCharging)
      })
    );
  }

  getOccupancy(req, res) {
    return this._runRead(req, res, 'UO', actor =>
      this.parkingService.getOccupancy({
        actor,
        occupancyId: req.params.id
      })
    );
  }

  // UC07 / UC07A Charging Endpoints
  submitChargingRequest(req, res) {
    const body = req.body || {};
    return this._runIdempotentWrite(req, res, 'U', 201, actor =>
      this.chargingService.submitChargingRequest({
        actor,
        occupancyId: body.occupancyId || null,
        vehicleId: body.vehicleId || null,
        targetBatteryPercent: body.targetBatteryPercent,
        neededBy: body.neededBy ?? null,
        requestedStart: body.requestedStart ?? null
      })
    );
  }

  getChargingRequest(req, res) {
    return this._runRead(req, res, 'UO', actor =>
      this.chargingService.getChargingRequest({
        actor,
        requestId: req.params.id
      })
    );
  }

  cancelChargingRequest(req, res) {
    return this._runIdempotentWrite(req, res, 'U', 200, actor =>
      this.chargingService.cancelChargingRequest({
        actor,
        requestId: req.params.id
      })
    );
  }

  stopChargingSession(req, res) {
    return this._runIdempotentWrite(req, res, 'U', 200, actor =>
      this.chargingService.stopSession({
        actor,
        sessionId: req.params.id,
        stopReason: 'UserStop'
      })
    );
  }

  getChargingSession(req, res) {
    return this._runRead(req, res, 'UO', actor =>
      this.chargingService.getChargingSession({
        actor,
        sessionId: req.params.id
      })
    );
  }

  // UC12 Scheduler Endpoints
  getHubChargingSchedule(req, res) {
    return this._runRead(req, res, 'O', actor =>
      this.schedulerService.getHubChargingSchedule({
        actor,
        hubId: req.params.hubId
      })
    );
  }

  allocateChargingRequest(req, res) {
    const body = req.body || {};
    return this._runIdempotentWrite(req, res, 'O', 200, actor =>
      this.schedulerService.allocateChargingRequest({
        actor,
        requestId: req.params.id,
        portId: body.portId || null,
        pointId: body.pointId || null,
        startAt: body.startAt ?? null,
        endAt: body.endAt ?? null,
        powerKw: body.powerKw
      })
    );
  }

  overrideChargingSchedule(req, res) {
    const body = req.body || {};
    return this._runIdempotentWrite(req, res, 'O', 200, actor =>
      this.schedulerService.overrideChargingSchedule({
        actor,
        hubId: req.params.hubId,
        overrides: body.overrides
      })
    );
  }
}

module.exports = {
  ParkingChargingController,
  resolveActor
};
