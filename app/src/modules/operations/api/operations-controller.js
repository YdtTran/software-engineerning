/**
 * Operations API Controller
 * Module: Operations (API)
 * 
 * Conforms to API_CONTRACTS.md:
 * - Shared JSON protocol under /api/v1
 * - Standard success: {"data": ...} with 200/201
 * - Standard error: {"error":{"code":"...","message":"...","details":{}}}
 * - HTTP status codes: 400, 401, 403, 404, 409, 422
 * - Enforces role-based access control (Operator vs User)
 * - Transparent Idempotency-Key processing
 */

const { defaultIdempotencyStore } = require('./idempotency');
const { DomainError } = require('../domain/resource');

function extractActor(req) {
  const user = req.user;
  return { actorId: user && user.id, role: user && typeof user.role === 'string' ? user.role.toLowerCase() : null };
}

function assertObject(body, message = 'Request body must be a JSON object.') {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new DomainError('INVALID_INPUT', message);
  }
}

function sendSuccess(res, statusCode, data, req, idempotencyStore = defaultIdempotencyStore) {
  const body = { data };
  const idempotencyKey = req.headers['idempotency-key'];
  if (idempotencyKey && req.method !== 'GET' && typeof idempotencyStore.execute !== 'function') {
    const actor = extractActor(req);
    idempotencyStore.save(idempotencyKey, actor.actorId, req.method, req.path, req.body, statusCode, body);
  }
  return res.status(statusCode).json(body);
}

function sendError(res, statusCode, code, message, details = {}) {
  if (statusCode === 500) {
    code = 'INTERNAL_ERROR';
    message = 'Unable to process the request.';
    details = {};
  }
  return res.status(statusCode).json({
    error: {
      code,
      message,
      details
    }
  });
}

function mapDomainErrorToHttpStatus(err) {
  const code = err.code || 'INTERNAL_ERROR';

  // 400 Bad Request
  if ([
    'INVALID_INPUT', 'INVALID_DESCRIPTION', 'INVALID_ID', 'INVALID_HUB_ID', 'INVALID_TYPE',
    'INVALID_BATTERY', 'INVALID_SLOT_DATA', 'INVALID_POINT_DATA', 'INVALID_TRANSFER_ID',
    'INVALID_HUBS', 'EMPTY_VEHICLE_LIST', 'MISSING_TRIP_ID', 'MISSING_TECHNICIAN',
    'INVALID_ASSIGNMENT_DATA', 'INVALID_REPORTER', 'INVALID_RESOURCE_KIND', 'INVALID_RESOURCE_ID'
  ].includes(code)) {
    return 400;
  }

  // 404 Not Found
  if ([
    'NOT_FOUND', 'VEHICLE_NOT_FOUND', 'SLOT_NOT_FOUND', 'TRANSFER_NOT_FOUND',
    'INCIDENT_NOT_FOUND', 'HUB_NOT_FOUND', 'RESOURCE_NOT_FOUND', 'POINT_NOT_FOUND', 'TRIP_NOT_FOUND'
  ].includes(code)) {
    return 404;
  }
  if (code === 'FORBIDDEN_OPERATION') return 403;
  if (code === 'TRIP_READER_UNAVAILABLE' || code === 'CHARGING_GUARD_UNAVAILABLE') return 503;

  // 409 Conflict
  if ([
    'IDEMPOTENCY_KEY_REUSED', 'TRANSFER_DEPART_CONFLICT', 'TRANSFER_CANCEL_CONFLICT',
    'TRANSFER_ARRIVE_CONFLICT', 'ALREADY_IN_TRANSIT', 'ALREADY_CANCELLED',
    'CANNOT_CANCEL_IN_TRANSIT', 'CANNOT_CANCEL_COMPLETED', 'TRANSFER_ALREADY_CANCELLED',
    'TRANSFER_ALREADY_COMPLETED', 'ALREADY_RESOLVED', 'INCIDENT_ALREADY_CLOSED',
    'SLOT_HOLD_FAILED', 'SLOT_UNAVAILABLE', 'SLOT_NOT_AVAILABLE', 'VEHICLE_NOT_AVAILABLE', 'POINT_UNAVAILABLE',
    'INCIDENT_ASSIGNMENT_CONFLICT', 'RESERVATION_CONFLICT', 'CHARGING_ACTIVE', 'ALLOCATION_CONFLICT'
  ].includes(code)) {
    return 409;
  }

  // 422 Unprocessable Entity (business rule / scheduling / eligibility violations)
  if ([
    'SOURCE_DESTINATION_SAME', 'VEHICLE_NOT_ELIGIBLE_FOR_TRANSFER', 'VEHICLE_BATTERY_DROPPED',
    'INSUFFICIENT_DESTINATION_SLOTS', 'INSUFFICIENT_REPLACEMENT_SLOTS', 'INCOMPLETE_ARRIVAL_SET',
    'VEHICLE_MISMATCH_ON_ARRIVAL', 'CANNOT_DELETE_ACTIVE_VEHICLE', 'CANNOT_SUSPEND_ACTIVE_VEHICLE',
    'RESOURCE_ID_MISMATCH', 'VEHICLE_NOT_AT_SOURCE_HUB', 'SLOT_WRONG_HUB', 'VEHICLE_CANNOT_PICKUP',
    'VEHICLE_NOT_IN_USE', 'VEHICLE_NOT_IN_TRANSFER', 'INVALID_REACTIVATION', 'NOT_IN_TRANSIT',
    'INVALID_STATE_TRANSITION', 'UNSUPPORTED_RESOURCE_KIND', 'TRIP_NOT_ACTIVE', 'MAINTENANCE_NOT_ASSIGNED'
  ].includes(code)) {
    return 422;
  }

  return 500;
}

class OperationsController {
  constructor({
    inventoryService,
    monitoringService,
    transferService,
    incidentService,
    idempotencyStore = defaultIdempotencyStore
  }) {
    this.inventoryService = inventoryService;
    this.monitoringService = monitoringService;
    this.transferService = transferService;
    this.incidentService = incidentService;
    this.idempotencyStore = idempotencyStore;
    if (typeof idempotencyStore.execute === 'function') {
      for (const name of ['createResource', 'patchResource', 'deleteResource', 'createTransfer', 'departTransfer', 'arriveTransfer', 'cancelTransfer', 'reportTripIncident', 'handleIncident', 'resolveIncident']) {
        const handler = this[name].bind(this);
        this[name] = async (req, res) => {
          if (!this.requireRole(req, res, name === 'reportTripIncident' ? 'user' : 'operator')) return;
          if (typeof req.headers['idempotency-key'] !== 'string' || !req.headers['idempotency-key'].trim()) {
            return sendError(res, 400, 'INVALID_INPUT', 'Idempotency-Key is required for writes.');
          }
          try {
            const result = await idempotencyStore.execute(req, extractActor(req).actorId, async () => {
              const captured = { status: 200, body: null };
              const proxy = { status(code) { captured.status = code; return this; }, json(body) { captured.body = body; return this; } };
              await handler(req, proxy);
              return captured;
            });
            return res.status(result.status).json(result.body);
          } catch (err) {
            return sendError(res, 500, 'INTERNAL_ERROR', 'Unable to process the request.');
          }
        };
      }
    }
  }

  /**
   * Helper to verify actor has required role ('operator' or 'user')
   */
  requireRole(req, res, requiredRole) {
    const actor = extractActor(req);
    const roles = Array.isArray(req.user && req.user.roles) ? req.user.roles.filter(role => typeof role === 'string').map(role => role.toLowerCase()) : [];
    if (actor.role) roles.push(actor.role);
    if (!actor.actorId || roles.length === 0) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return false;
    }
    if (requiredRole === 'operator' && !roles.includes('operator')) {
      sendError(res, 403, 'FORBIDDEN_OPERATION', 'This endpoint requires an Operator account.');
      return false;
    }
    if (requiredRole === 'user' && !roles.includes('user')) {
      sendError(res, 403, 'FORBIDDEN_OPERATION', 'This endpoint requires a User account.');
      return false;
    }
    return true;
  }

  /**
   * Helper to check Idempotency-Key
   */
  checkIdempotency(req, res) {
    if (typeof this.idempotencyStore.execute === 'function') return true;
    const key = req.headers['idempotency-key'];
    if (!key) return true;

    const actor = extractActor(req);
    const result = this.idempotencyStore.check(key, actor.actorId, req.method, req.path, req.body);

    if (result.status === 'CONFLICT') {
      sendError(res, 409, result.error.code, result.error.message, result.error.details);
      return false;
    }

    if (result.status === 'HIT') {
      res.status(result.statusCode).json(result.cachedResponse);
      return false;
    }

    return true;
  }

  // =========================================================================
  // UC08: GET /operations/hubs
  // =========================================================================
  async getHubs(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    try {
      const data = await this.monitoringService.getNetworkOverview();
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'MONITORING_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC09: GET /operations/resources
  // =========================================================================
  async getResources(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    try {
      const { hubId, kind } = req.query;
      const data = await this.inventoryService.listResources({ hubId, kind });
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'RESOURCE_QUERY_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC09: POST /operations/resources
  // =========================================================================
  async createResource(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    if (!this.checkIdempotency(req, res)) return;
    try {
      assertObject(req.body, 'Resource creation requires a valid JSON object.');
      const { kind, hubId, attributes } = req.body;
      if (typeof kind !== 'string' || !kind.trim()) {
        throw new DomainError('INVALID_RESOURCE_KIND', 'Resource kind is required.');
      }
      if (typeof hubId !== 'string' || !hubId.trim()) {
        throw new DomainError('INVALID_HUB_ID', 'Hub ID is required.');
      }
      if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
        throw new DomainError('INVALID_INPUT', 'Resource attributes must be an object.');
      }
      const data = await this.inventoryService.createResource({ kind, hubId, attributes });
      return sendSuccess(res, 201, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'RESOURCE_CREATION_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC09: PATCH /operations/resources/:id
  // =========================================================================
  async patchResource(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    if (!this.checkIdempotency(req, res)) return;
    try {
      const { id } = req.params;
      if (typeof id !== 'string' || !id.trim()) {
        throw new DomainError('INVALID_ID', 'Resource ID is required.');
      }
      assertObject(req.body, 'Resource patch requires a valid JSON object.');
      const data = await this.inventoryService.updateResource(id, req.body);
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'RESOURCE_UPDATE_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC09: DELETE /operations/resources/:id
  // =========================================================================
  async deleteResource(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    try {
      const { id } = req.params;
      if (typeof id !== 'string' || !id.trim()) {
        throw new DomainError('INVALID_ID', 'Resource ID is required.');
      }
      await this.inventoryService.deleteVehicle(id);
      return sendSuccess(res, 200, { deleted: true, id }, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'RESOURCE_DELETE_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC10: POST /transfers
  // =========================================================================
  async createTransfer(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    if (!this.checkIdempotency(req, res)) return;
    try {
      const actor = extractActor(req);
      assertObject(req.body, 'Transfer creation requires a valid JSON object.');
      const { sourceHubId, destinationHubId, vehicleIds, destinationSlotIds, vehicleSlotAssignments } = req.body;
      if (typeof sourceHubId !== 'string' || !sourceHubId.trim() || typeof destinationHubId !== 'string' || !destinationHubId.trim()) {
        throw new DomainError('INVALID_HUBS', 'Source and destination hub IDs are required strings.');
      }
      if (!Array.isArray(vehicleIds) || vehicleIds.length === 0 || vehicleIds.some(v => typeof v !== 'string' || !v.trim())) {
        throw new DomainError('EMPTY_VEHICLE_LIST', 'vehicleIds must be a non-empty array of vehicle IDs.');
      }
      if (!Array.isArray(destinationSlotIds) || destinationSlotIds.length === 0 || destinationSlotIds.some(s => typeof s !== 'string' || !s.trim())) {
        throw new DomainError('INSUFFICIENT_DESTINATION_SLOTS', 'destinationSlotIds must be a non-empty array of slot IDs.');
      }
      if (vehicleSlotAssignments !== undefined && vehicleSlotAssignments !== null && !Array.isArray(vehicleSlotAssignments)) {
        throw new DomainError('INVALID_INPUT', 'vehicleSlotAssignments must be an array when provided.');
      }
      const data = await this.transferService.createTransfer({
        sourceHubId,
        destinationHubId,
        vehicleIds,
        destinationSlotIds,
        vehicleSlotAssignments,
        createdBy: actor.actorId
      });
      return sendSuccess(res, 201, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'TRANSFER_CREATION_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC10: GET /transfers/:id
  // =========================================================================
  async getTransfer(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    try {
      const { id } = req.params;
      if (typeof id !== 'string' || !id.trim()) {
        throw new DomainError('INVALID_TRANSFER_ID', 'Transfer ID is required.');
      }
      const data = await this.transferService.getTransfer(id);
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'TRANSFER_NOT_FOUND', err.message, err.details);
    }
  }

  // =========================================================================
  // UC10: POST /transfers/:id/depart
  // =========================================================================
  async departTransfer(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    if (!this.checkIdempotency(req, res)) return;
    try {
      const { id } = req.params;
      if (typeof id !== 'string' || !id.trim()) {
        throw new DomainError('INVALID_TRANSFER_ID', 'Transfer ID is required.');
      }
      const data = await this.transferService.departTransfer(id);
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'TRANSFER_DEPART_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC10A: POST /transfers/:id/arrive
  // =========================================================================
  async arriveTransfer(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    if (!this.checkIdempotency(req, res)) return;
    try {
      const { id } = req.params;
      if (typeof id !== 'string' || !id.trim()) {
        throw new DomainError('INVALID_TRANSFER_ID', 'Transfer ID is required.');
      }
      assertObject(req.body, 'Transfer arrival requires a valid JSON object.');
      const { observedVehicleIds, replacementDestinationHubId, replacementSlotIds, vehicleSlotAssignments } = req.body;
      if (!Array.isArray(observedVehicleIds) || observedVehicleIds.some(v => typeof v !== 'string' || !v.trim())) {
        throw new DomainError('INVALID_INPUT', 'observedVehicleIds must be an array of vehicle IDs.');
      }
      if (replacementDestinationHubId !== undefined && replacementDestinationHubId !== null && (typeof replacementDestinationHubId !== 'string' || !replacementDestinationHubId.trim())) {
        throw new DomainError('INVALID_HUB_ID', 'replacementDestinationHubId must be a valid hub ID string.');
      }
      if (replacementSlotIds !== undefined && replacementSlotIds !== null && (!Array.isArray(replacementSlotIds) || replacementSlotIds.some(s => typeof s !== 'string' || !s.trim()))) {
        throw new DomainError('INVALID_INPUT', 'replacementSlotIds must be an array of slot IDs.');
      }
      if (vehicleSlotAssignments !== undefined && vehicleSlotAssignments !== null && !Array.isArray(vehicleSlotAssignments)) {
        throw new DomainError('INVALID_INPUT', 'vehicleSlotAssignments must be an array when provided.');
      }
      const data = await this.transferService.arriveTransfer(id, {
        observedVehicleIds,
        replacementDestinationHubId,
        replacementSlotIds,
        vehicleSlotAssignments
      });
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'TRANSFER_ARRIVE_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC10B: POST /transfers/:id/cancel
  // =========================================================================
  async cancelTransfer(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    if (!this.checkIdempotency(req, res)) return;
    try {
      const { id } = req.params;
      if (typeof id !== 'string' || !id.trim()) {
        throw new DomainError('INVALID_TRANSFER_ID', 'Transfer ID is required.');
      }
      if (req.body !== undefined && req.body !== null && (typeof req.body !== 'object' || Array.isArray(req.body))) {
        throw new DomainError('INVALID_INPUT', 'Cancel transfer body must be an object.');
      }
      const { reason } = req.body || {};
      if (reason !== undefined && reason !== null && (typeof reason !== 'string' || !reason.trim())) {
        throw new DomainError('INVALID_INPUT', 'Cancel reason must be a non-empty string when provided.');
      }
      const data = await this.transferService.cancelTransfer(id, { reason });
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'TRANSFER_CANCEL_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC11A: POST /trips/:id/incidents (User endpoint)
  // =========================================================================
  async reportTripIncident(req, res) {
    if (!this.requireRole(req, res, 'user')) return;
    if (!this.checkIdempotency(req, res)) return;
    try {
      const actor = extractActor(req);
      const tripId = req.params.id;
      if (typeof tripId !== 'string' || !tripId.trim()) {
        throw new DomainError('MISSING_TRIP_ID', 'Trip ID is required.');
      }
      assertObject(req.body, 'Trip incident reporting requires a valid JSON object.');
      const { description, reportedLocation } = req.body;
      if (typeof description !== 'string' || !description.trim()) {
        throw new DomainError('INVALID_DESCRIPTION', 'description is required.');
      }
      if (reportedLocation !== undefined && reportedLocation !== null && typeof reportedLocation !== 'string') {
        throw new DomainError('INVALID_INPUT', 'reportedLocation must be a string.');
      }
      const data = await this.incidentService.reportTripIncident({
        tripId,
        userId: actor.actorId,
        description,
        reportedLocation
      });
      return sendSuccess(res, 201, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'TRIP_INCIDENT_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC11: GET /incidents
  // =========================================================================
  async getIncidents(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    try {
      const { status, hubId } = req.query;
      const data = await this.incidentService.listIncidents({ status, hubId });
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'INCIDENT_QUERY_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC11: POST /incidents/:id/handle
  // =========================================================================
  async handleIncident(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    if (!this.checkIdempotency(req, res)) return;
    try {
      const { id } = req.params;
      if (typeof id !== 'string' || !id.trim()) {
        throw new DomainError('INVALID_ID', 'Incident ID is required.');
      }
      assertObject(req.body, 'Maintenance assignment requires a valid JSON object.');
      const { resourceId, technicianId, scheduledAt, customSlaMinutes } = req.body;
      if (typeof technicianId !== 'string' || !technicianId.trim()) {
        throw new DomainError('MISSING_TECHNICIAN', 'technicianId is required.');
      }
      if (resourceId !== undefined && resourceId !== null && (typeof resourceId !== 'string' || !resourceId.trim())) {
        throw new DomainError('INVALID_RESOURCE_ID', 'resourceId must be a string.');
      }
      if (scheduledAt !== undefined && scheduledAt !== null && (typeof scheduledAt !== 'string' || Number.isNaN(Date.parse(scheduledAt)))) {
        throw new DomainError('INVALID_INPUT', 'scheduledAt must be a valid ISO timestamp.');
      }
      if (customSlaMinutes !== undefined && customSlaMinutes !== null && (typeof customSlaMinutes !== 'number' || customSlaMinutes <= 0)) {
        throw new DomainError('INVALID_INPUT', 'customSlaMinutes must be a positive number.');
      }
      const data = await this.incidentService.handleIncident(id, {
        resourceId,
        technicianId,
        scheduledAt,
        customSlaMinutes
      });
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'INCIDENT_HANDLE_FAILED', err.message, err.details);
    }
  }

  // =========================================================================
  // UC11 Alt 8a: POST /incidents/:id/resolve
  // =========================================================================
  async resolveIncident(req, res) {
    if (!this.requireRole(req, res, 'operator')) return;
    if (!this.checkIdempotency(req, res)) return;
    try {
      const { id } = req.params;
      if (typeof id !== 'string' || !id.trim()) {
        throw new DomainError('INVALID_ID', 'Incident ID is required.');
      }
      if (req.body !== undefined && req.body !== null && (typeof req.body !== 'object' || Array.isArray(req.body))) {
        throw new DomainError('INVALID_INPUT', 'Incident resolution body must be an object.');
      }
      const { resolutionNotes } = req.body || {};
      if (resolutionNotes !== undefined && resolutionNotes !== null && typeof resolutionNotes !== 'string') {
        throw new DomainError('INVALID_INPUT', 'resolutionNotes must be a string.');
      }
      const data = await this.incidentService.resolveIncident(id, { resolutionNotes });
      return sendSuccess(res, 200, data, req, this.idempotencyStore);
    } catch (err) {
      const status = mapDomainErrorToHttpStatus(err);
      return sendError(res, status, err.code || 'INCIDENT_RESOLVE_FAILED', err.message, err.details);
    }
  }
}

module.exports = {
  OperationsController,
  extractActor,
  mapDomainErrorToHttpStatus,
  sendSuccess,
  sendError
};
