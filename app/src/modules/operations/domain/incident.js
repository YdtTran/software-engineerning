/**
 * Domain Model for Operational Incidents and Maintenance (UC11, UC11A)
 * Module: Operations
 * 
 * Aligned with:
 * - CLASS_CATALOG.md (IncidentStatus: Open, Investigating, Resolved)
 * - API_CONTRACTS.md (POST /incidents/{id}/handle, POST /trips/{id}/incidents)
 * - BR14: Emergency level incidents isolated within 60 seconds SLA
 */

const { DomainError, ResourceKind } = require('./resource');

const IncidentSeverity = Object.freeze({
  EMERGENCY: 'Emergency',
  CRITICAL: 'Critical',
  STANDARD: 'Standard'
});

const IncidentStatus = Object.freeze({
  OPEN: 'Open',
  INVESTIGATING: 'Investigating',
  RESOLVED: 'Resolved'
});

const ReporterRole = Object.freeze({
  USER: 'User',
  OPERATOR: 'Operator',
  SYSTEM: 'System'
});

const MaintenanceStatus = Object.freeze({
  ASSIGNED: 'Assigned',
  ON_SITE: 'OnSite',
  COMPLETED: 'Completed'
});

function normalizeIncidentStatus(status) {
  if (!status) return IncidentStatus.OPEN;
  const s = String(status).toLowerCase().replace(/[_\s-]/g, '');
  if (s === 'open') return IncidentStatus.OPEN;
  if (['investigating', 'inprogress'].includes(s)) return IncidentStatus.INVESTIGATING;
  if (['resolved', 'closed'].includes(s)) return IncidentStatus.RESOLVED;
  return status;
}

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
    const validKinds = Object.values(ResourceKind).map(k => k.toLowerCase());
    if (!resourceKind || !validKinds.includes(resourceKind.toLowerCase())) {
      throw new DomainError('INVALID_RESOURCE_KIND', 'Resource kind must be vehicle, slot, or charging_point.');
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
    this.resourceKind = resourceKind.toLowerCase();
    this.resourceId = resourceId;
    this.description = description;
    this.severity = severity;
    this.status = normalizeIncidentStatus(status);
    this.reportedAt = reportedAt;
    this.resolvedAt = resolvedAt;
    this.resolutionNotes = resolutionNotes;
    this.reportedLocation = reportedLocation;
    this.assignment = assignment;
  }

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
      resourceId: vehicleId || `VEHICLE-OF-${tripId}`,
      description,
      severity: IncidentSeverity.STANDARD,
      status: IncidentStatus.OPEN,
      reportedAt: now.toISOString(),
      reportedLocation
    });
  }

  static calculateSlaDeadline(severity, startTime = new Date()) {
    let minutes = 120; // default standard
    const sev = String(severity).toLowerCase();
    if (sev === 'emergency') {
      minutes = 1; // BR14: 60 seconds
    } else if (sev === 'critical') {
      minutes = 30;
    }
    const deadline = new Date(startTime.getTime() + minutes * 60 * 1000);
    return deadline.toISOString();
  }

  handle({ assignmentId, technicianId, scheduledAt = new Date().toISOString(), customSlaMinutes = null, now = new Date() }) {
    if (this.status === IncidentStatus.RESOLVED) {
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

    this.status = IncidentStatus.INVESTIGATING;
  }

  resolve({ notes = 'Maintenance successfully completed and verified', now = new Date() }) {
    if (this.status === IncidentStatus.RESOLVED) {
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
  Incident,
  normalizeIncidentStatus
};
