/**
 * Domain Model for Operational Incidents and Maintenance (UC11, UC11A)
 * Module: Operations
 * 
 * Rules enforced:
 * - BR14: Emergency level incidents (e.g. electrical fault/fire risk) must be isolated within 60 seconds SLA.
 * - UC11A: User trip incidents require an active trip reference; isolation prevents new reservations
 *   without remotely locking or interrupting vehicles currently in motion.
 * - Maintenance tracking: Creates scheduled maintenance assignment with technician and SLA deadline.
 */

const { DomainError, ResourceKind } = require('./resource');

const IncidentSeverity = Object.freeze({
  EMERGENCY: 'emergency',
  CRITICAL: 'critical',
  STANDARD: 'standard'
});

const IncidentStatus = Object.freeze({
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
});

const ReporterRole = Object.freeze({
  USER: 'user',
  OPERATOR: 'operator',
  SYSTEM: 'system'
});

const MaintenanceStatus = Object.freeze({
  ASSIGNED: 'assigned',
  ON_SITE: 'on_site',
  COMPLETED: 'completed'
});

class MaintenanceAssignment {
  constructor({
    id,
    incidentId,
    technicianId,
    scheduledAt = new Date().toISOString(),
    slaDeadline,
    status = MaintenanceStatus.ASSIGNED
  }) {
    if (!id || !incidentId || !technicianId) {
      throw new DomainError('INVALID_ASSIGNMENT_DATA', 'Assignment requires id, incidentId, and technicianId.');
    }
    this.id = id;
    this.incidentId = incidentId;
    this.technicianId = technicianId;
    this.scheduledAt = scheduledAt;
    this.slaDeadline = slaDeadline;
    this.status = status;
  }

  markOnSite() {
    this.status = MaintenanceStatus.ON_SITE;
  }

  complete() {
    this.status = MaintenanceStatus.COMPLETED;
  }
}

class Incident {
  constructor({
    id,
    reporterId,
    reporterRole = ReporterRole.OPERATOR,
    reportedTripId = null,
    resourceKind,
    resourceId,
    description,
    severity = IncidentSeverity.STANDARD,
    status = IncidentStatus.OPEN,
    reportedAt = new Date().toISOString(),
    resolvedAt = null,
    resolutionNotes = null,
    reportedLocation = null,
    assignment = null
  }) {
    if (!id || typeof id !== 'string') {
      throw new DomainError('INVALID_INCIDENT_ID', 'Incident ID must be a non-empty string.');
    }
    if (!reporterId) {
      throw new DomainError('INVALID_REPORTER', 'Reporter ID is required.');
    }
    if (!Object.values(ResourceKind).includes(resourceKind)) {
      throw new DomainError('INVALID_RESOURCE_KIND', `Resource kind must be vehicle, slot, or charging_point.`);
    }
    if (!resourceId) {
      throw new DomainError('INVALID_RESOURCE_ID', 'Resource ID is required.');
    }
    if (!description || typeof description !== 'string') {
      throw new DomainError('INVALID_DESCRIPTION', 'Incident description is required.');
    }

    this.id = id;
    this.reporterId = reporterId;
    this.reporterRole = reporterRole;
    this.reportedTripId = reportedTripId;
    this.resourceKind = resourceKind;
    this.resourceId = resourceId;
    this.description = description;
    this.severity = severity;
    this.status = status;
    this.reportedAt = reportedAt;
    this.resolvedAt = resolvedAt;
    this.resolutionNotes = resolutionNotes;
    this.reportedLocation = reportedLocation;
    this.assignment = assignment;
  }

  /**
   * Factory method for User reporting an incident during an active trip (UC11A)
   */
  static reportTripIncident({
    id,
    userId,
    tripId,
    vehicleId,
    description,
    reportedLocation = null,
    now = new Date()
  }) {
    if (!tripId) {
      throw new DomainError('MISSING_TRIP_ID', 'User incident reporting during a trip requires a valid tripId.');
    }
    return new Incident({
      id,
      reporterId: userId,
      reporterRole: ReporterRole.USER,
      reportedTripId: tripId,
      resourceKind: ResourceKind.VEHICLE,
      resourceId: vehicleId,
      description,
      severity: IncidentSeverity.STANDARD,
      status: IncidentStatus.OPEN,
      reportedAt: now.toISOString(),
      reportedLocation
    });
  }

  /**
   * Calculate SLA deadline in minutes based on severity
   * BR14: Emergency SLA is 60 seconds (1 minute); Critical is 30 mins; Standard is 120 mins.
   */
  static calculateSlaDeadline(severity, startTime = new Date()) {
    let minutes = 120; // default standard
    if (severity === IncidentSeverity.EMERGENCY) {
      minutes = 1; // BR14: 60 seconds
    } else if (severity === IncidentSeverity.CRITICAL) {
      minutes = 30;
    }
    const deadline = new Date(startTime.getTime() + minutes * 60 * 1000);
    return deadline.toISOString();
  }

  /**
   * Handle incident & assign maintenance technician (UC11)
   */
  handle({ assignmentId, technicianId, scheduledAt = new Date().toISOString(), customSlaMinutes = null, now = new Date() }) {
    if (this.status === IncidentStatus.RESOLVED || this.status === IncidentStatus.CLOSED) {
      throw new DomainError('INCIDENT_ALREADY_CLOSED', `Cannot handle incident ${this.id} because it is already resolved.`);
    }

    let slaDeadline;
    if (typeof customSlaMinutes === 'number') {
      slaDeadline = new Date(now.getTime() + customSlaMinutes * 60 * 1000).toISOString();
    } else {
      slaDeadline = Incident.calculateSlaDeadline(this.severity, now);
    }

    this.assignment = new MaintenanceAssignment({
      id: assignmentId,
      incidentId: this.id,
      technicianId,
      scheduledAt,
      slaDeadline,
      status: MaintenanceStatus.ASSIGNED
    });

    this.status = IncidentStatus.IN_PROGRESS;
  }

  /**
   * Resolve incident upon technician fix (UC11 Alt 8a)
   */
  resolve({ notes = 'Maintenance successfully completed and verified', now = new Date() }) {
    if (this.status === IncidentStatus.RESOLVED || this.status === IncidentStatus.CLOSED) {
      throw new DomainError('ALREADY_RESOLVED', `Incident ${this.id} is already resolved.`);
    }

    this.status = IncidentStatus.RESOLVED;
    this.resolvedAt = now.toISOString();
    this.resolutionNotes = notes;

    if (this.assignment) {
      this.assignment.complete();
    }
  }
}

module.exports = {
  IncidentSeverity,
  IncidentStatus,
  ReporterRole,
  MaintenanceStatus,
  MaintenanceAssignment,
  Incident
};
