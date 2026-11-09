/**
 * Incident & Maintenance Application Service (UC11, UC11A)
 * Module: Operations
 * 
 * Coordinates incident intake, safety isolation, technician dispatch, and resolution:
 * - Report Trip Incident (UC11A): User reports incident on an active trip; safely isolates resource
 * - Review & Handle Incident (UC11): Operator reviews incident and schedules maintenance with SLA (BR14)
 * - Resolve Incident (UC11 Alt 8a): Technicians complete repair and reactivate equipment
 */

const { Incident, IncidentSeverity, IncidentStatus, ReporterRole } = require('../domain/incident');
const { ResourceKind, DomainError } = require('../domain/resource');

class IncidentService {
  /**
   * @param {import('../infrastructure/sqlite-incident-repo').SQLiteIncidentRepository} incidentRepo
   * @param {import('../infrastructure/sqlite-inventory-repo').SQLiteInventoryRepository} inventoryRepo
   */
  constructor(incidentRepo, inventoryRepo) {
    if (!incidentRepo || !inventoryRepo) {
      throw new Error('IncidentService requires incidentRepo and inventoryRepo instances.');
    }
    this.incidentRepo = incidentRepo;
    this.inventoryRepo = inventoryRepo;
  }

  /**
   * Report an incident during an active user trip (UC11A)
   * @param {{
   *   tripId: string,
   *   vehicleId: string,
   *   userId: string,
   *   description: string,
   *   reportedLocation?: string
   * }} data
   */
  async reportTripIncident({ tripId, vehicleId, userId, description, reportedLocation = null }) {
    if (!tripId || !vehicleId || !userId || !description) {
      throw new DomainError('INVALID_INPUT', 'tripId, vehicleId, userId, and description are required.');
    }

    const incidentId = `INC-TRIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const incident = Incident.reportTripIncident({
      id: incidentId,
      userId,
      tripId,
      vehicleId,
      description,
      reportedLocation
    });

    await this.incidentRepo.createIncident(incident);

    return {
      id: incident.id,
      reporterId: incident.reporterId,
      reportedTripId: incident.reportedTripId,
      resourceId: incident.resourceId,
      resourceKind: incident.resourceKind,
      description: incident.description,
      status: incident.status,
      reportedAt: incident.reportedAt
    };
  }

  /**
   * Report equipment failure by Operator or IoT automated alert (UC11)
   * @param {{
   *   resourceKind: 'vehicle'|'slot'|'charging_point',
   *   resourceId: string,
   *   description: string,
   *   severity?: 'emergency'|'critical'|'standard',
   *   reporterId?: string,
   *   reporterRole?: 'operator'|'system',
   *   reportedLocation?: string
   * }} data
   */
  async reportEquipmentIncident({
    resourceKind,
    resourceId,
    description,
    severity = IncidentSeverity.STANDARD,
    reporterId = 'operator',
    reporterRole = ReporterRole.OPERATOR,
    reportedLocation = null
  }) {
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

  /**
   * Get incident by ID (UC11)
   * @param {string} id
   */
  async getIncident(id) {
    const incident = await this.incidentRepo.getIncidentById(id);
    if (!incident) {
      throw new DomainError('INCIDENT_NOT_FOUND', `Incident ${id} does not exist.`);
    }
    return incident;
  }

  /**
   * List incidents with filters (UC11)
   * @param {{ status?: string, resourceKind?: string, reporterId?: string }} filters
   */
  async listIncidents(filters = {}) {
    return this.incidentRepo.listIncidents(filters);
  }

  /**
   * Handle incident & schedule technician with SLA deadline (UC11)
   * @param {string} id
   * @param {{
   *   technicianId: string,
   *   scheduledAt?: string,
   *   customSlaMinutes?: number
   * }} payload
   */
  async handleIncident(id, { technicianId, scheduledAt = new Date().toISOString(), customSlaMinutes = null }) {
    if (!technicianId) {
      throw new DomainError('MISSING_TECHNICIAN', 'technicianId is required to schedule maintenance.');
    }

    const incident = await this.incidentRepo.getIncidentById(id);
    if (!incident) {
      throw new DomainError('INCIDENT_NOT_FOUND', `Incident ${id} does not exist.`);
    }

    const assignmentId = `MNT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    // Domain transition (calculates BR14 SLA deadline)
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
      assignment: {
        id: incident.assignment.id,
        technicianId: incident.assignment.technicianId,
        scheduledAt: incident.assignment.scheduledAt,
        slaDeadline: incident.assignment.slaDeadline,
        status: incident.assignment.status
      }
    };
  }

  /**
   * Resolve incident upon completed maintenance (UC11 Alt 8a)
   * @param {string} id
   * @param {{ resolutionNotes?: string }} options
   */
  async resolveIncident(id, { resolutionNotes = 'Maintenance completed successfully' } = {}) {
    const incident = await this.incidentRepo.getIncidentById(id);
    if (!incident) {
      throw new DomainError('INCIDENT_NOT_FOUND', `Incident ${id} does not exist.`);
    }

    // Domain transition
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
