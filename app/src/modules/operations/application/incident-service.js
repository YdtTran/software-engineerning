/**
 * Incident & Maintenance Application Service (UC11, UC11A)
 * Module: Operations
 * 
 * Aligned with API_CONTRACTS.md:
 * - POST /trips/{id}/incidents -> incident ID and status
 * - GET /incidents (optional status, hubId) -> incident records
 * - POST /incidents/{id}/handle (resourceId, technicianId, scheduledAt) -> incident and maintenance assignment IDs and statuses
 */

const { Incident, IncidentSeverity, IncidentStatus, ReporterRole } = require('../domain/incident');
const { ResourceKind, DomainError } = require('../domain/resource');

class IncidentService {
  /**
   * @param {import('../infrastructure/sqlite-incident-repo').SQLiteIncidentRepository} incidentRepo
   * @param {import('../infrastructure/sqlite-inventory-repo').SQLiteInventoryRepository} inventoryRepo
   */
  constructor(incidentRepo, inventoryRepo, tripReader = null) {
    if (!incidentRepo || !inventoryRepo) {
      throw new Error('IncidentService requires incidentRepo and inventoryRepo instances.');
    }
    this.incidentRepo = incidentRepo;
    this.inventoryRepo = inventoryRepo;
    this.tripReader = tripReader;
  }

  /**
   * Report an incident during an active user trip (UC11A)
   * HTTP POST /api/v1/trips/{id}/incidents
   * @param {{
   *   tripId: string,
   *   description: string,
   *   userId?: string,
   *   vehicleId?: string,
   *   reportedLocation?: string
   * }} data
   */
  async reportTripIncident({ tripId, description, userId, reportedLocation = null }) {
    if (!tripId) {
      throw new DomainError('MISSING_TRIP_ID', 'tripId is required to report an incident on a trip.');
    }
    if (!description || typeof description !== 'string') {
      throw new DomainError('INVALID_DESCRIPTION', 'description is required.');
    }
    if (!userId) throw new DomainError('INVALID_REPORTER', 'Authenticated user is required.');
    if (!this.tripReader || typeof this.tripReader.getTrip !== 'function') {
      throw new DomainError('TRIP_READER_UNAVAILABLE', 'Trip verification is unavailable.');
    }
    return this.inventoryRepo.client.transaction(() => this.reportVerifiedTripIncident({ tripId, description, userId, reportedLocation }));
  }

  async reportVerifiedTripIncident({ tripId, description, userId, reportedLocation }) {
    const trip = await this.tripReader.getTrip(tripId, this.inventoryRepo.client);
    if (!trip || trip.id !== tripId) throw new DomainError('TRIP_NOT_FOUND', 'Trip not found.');
    if (trip.userId !== userId) throw new DomainError('FORBIDDEN_OPERATION', 'Trip does not belong to this user.');
    if (String(trip.status).toLowerCase() !== 'active') throw new DomainError('TRIP_NOT_ACTIVE', 'Trip is not active.');
    if (!trip.vehicleId || !await this.inventoryRepo.client.get('SELECT id FROM electric_vehicles WHERE id = ?;', [trip.vehicleId])) {
      throw new DomainError('VEHICLE_NOT_FOUND', 'Trip vehicle not found.');
    }

    const incidentId = `INC-TRIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const incident = Incident.reportTripIncident({
      id: incidentId,
      userId,
      tripId,
      vehicleId: trip.vehicleId,
      description,
      reportedLocation
    });

    await this.incidentRepo.createIncident(incident);

    return {
      id: incident.id,
      status: incident.status,
      reportedTripId: incident.reportedTripId,
      resourceId: incident.resourceId,
      description: incident.description,
      reportedAt: incident.reportedAt
    };
  }

  /**
   * Report equipment failure by Operator or IoT automated alert (UC11)
   */
  async reportEquipmentIncident({
    resourceKind,
    resourceId,
    description,
    severity = IncidentSeverity.STANDARD,
    reporterId,
    reporterRole,
    reportedLocation = null
  }) {
    if (typeof reporterId !== 'string' || !reporterId.trim() || ![ReporterRole.OPERATOR, ReporterRole.SYSTEM].includes(reporterRole)) {
      throw new DomainError('INVALID_REPORTER', 'A trusted operator or system reporter is required.');
    }
    if (!resourceKind || !resourceId || !description) {
      throw new DomainError('INVALID_INPUT', 'resourceKind, resourceId, and description are required.');
    }

    const incidentId = `INC-EQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const incident = new Incident({
      id: incidentId,
      reporterId,
      reporterRole,
      resourceKind,
      resourceId,
      description,
      severity,
      status: IncidentStatus.OPEN,
      reportedLocation
    });

    await this.incidentRepo.createIncident(incident);

    return {
      id: incident.id,
      resourceKind: incident.resourceKind,
      resourceId: incident.resourceId,
      severity: incident.severity,
      status: incident.status,
      reportedAt: incident.reportedAt
    };
  }

  async getIncident(id) {
    const incident = await this.incidentRepo.getIncidentById(id);
    if (!incident) {
      throw new DomainError('INCIDENT_NOT_FOUND', `Incident ${id} does not exist.`);
    }
    return incident;
  }

  /**
   * List incidents with filters: status, hubId, resourceKind, reporterId (UC11, API_CONTRACTS.md)
   * @param {{ status?: string, hubId?: string, resourceKind?: string, reporterId?: string }} filters
   */
  async listIncidents(filters = {}) {
    return this.incidentRepo.listIncidents(filters);
  }

  /**
   * Handle incident & schedule technician (UC11)
   * Matches API_CONTRACTS.md: resourceId, technicianId, scheduledAt -> incident and assignment IDs and statuses
   * @param {string} id
   * @param {{
   *   resourceId?: string,
   *   technicianId: string,
   *   scheduledAt?: string,
   *   customSlaMinutes?: number
   * }} payload
   */
  async handleIncident(id, { resourceId = null, technicianId, scheduledAt = new Date().toISOString(), customSlaMinutes = null }) {
    if (!technicianId) {
      throw new DomainError('MISSING_TECHNICIAN', 'technicianId is required to schedule maintenance.');
    }

    const incident = await this.incidentRepo.getIncidentById(id);
    if (!incident) {
      throw new DomainError('INCIDENT_NOT_FOUND', `Incident ${id} does not exist.`);
    }

    // Verify resourceId matches if supplied by operator
    if (resourceId && incident.resourceId && resourceId !== incident.resourceId) {
      throw new DomainError(
        'RESOURCE_ID_MISMATCH',
        `Supplied resourceId '${resourceId}' does not match incident resourceId '${incident.resourceId}'.`,
        { expected: incident.resourceId, supplied: resourceId }
      );
    }

    const assignmentId = `MNT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    incident.handle({
      assignmentId,
      technicianId,
      scheduledAt,
      customSlaMinutes,
      now: new Date()
    });

    await this.incidentRepo.assignMaintenance(incident);

    return {
      id: incident.id,
      status: incident.status,
      resourceId: incident.resourceId,
      assignment: {
        id: incident.assignment.id,
        status: incident.assignment.status,
        technicianId: incident.assignment.technicianId,
        scheduledAt: incident.assignment.scheduledAt,
        slaDeadline: incident.assignment.slaDeadline
      }
    };
  }

  async resolveIncident(id, { resolutionNotes = 'Maintenance completed successfully' } = {}) {
    const incident = await this.incidentRepo.getIncidentById(id);
    if (!incident) {
      throw new DomainError('INCIDENT_NOT_FOUND', `Incident ${id} does not exist.`);
    }

    incident.resolve({ notes: resolutionNotes, now: new Date() });

    await this.incidentRepo.resolveIncident(incident);

    return {
      id: incident.id,
      status: incident.status,
      resolvedAt: incident.resolvedAt,
      resolutionNotes: incident.resolutionNotes
    };
  }
}

module.exports = {
  IncidentService
};
