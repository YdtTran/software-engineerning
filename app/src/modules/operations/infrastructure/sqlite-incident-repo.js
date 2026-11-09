/**
 * SQLite Repository for Operational Incidents & Maintenance (UC11, UC11A)
 * Module: Operations (Infrastructure)
 * 
 * Persists incidents, SLA assignments, and resolves equipment faults:
 * - Records incidents from User trips or Operator alerts.
 * - Manages technician dispatch with SLA deadlines.
 * - Isolates resource state on fault.
 */

const { Incident, MaintenanceAssignment } = require('../domain/incident');
const { DomainError } = require('../domain/resource');

class SQLiteIncidentRepository {
  /**
   * @param {import('./sqlite-client').SQLiteClient} client
   */
  constructor(client) {
    if (!client) {
      throw new Error('SQLiteIncidentRepository requires a SQLiteClient instance.');
    }
    this.client = client;
  }

  /**
   * Save a newly reported incident (UC11, UC11A)
   */
  async createIncident(incident) {
    return this.client.transaction(async () => {
      await this.client.run(
        `INSERT INTO incidents (
          id, reporter_id, reporter_role, reported_trip_id,
          resource_kind, resource_id, description, severity,
          status, reported_at, reported_location
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          incident.id,
          incident.reporterId,
          incident.reporterRole,
          incident.reportedTripId,
          incident.resourceKind,
          incident.resourceId,
          incident.description,
          incident.severity,
          incident.status,
          incident.reportedAt,
          incident.reportedLocation
        ]
      );

      // Isolate resource status if it is a vehicle, slot, or charging point
      if (incident.resourceKind === 'vehicle') {
        // Flag vehicle status as faulted if not currently in active trip
        if (!incident.reportedTripId) {
          await this.client.run(
            `UPDATE electric_vehicles SET status = 'faulted' WHERE id = ? AND status != 'in_use';`,
            [incident.resourceId]
          );
        }
      } else if (incident.resourceKind === 'charging_point') {
        await this.client.run(
          `UPDATE charging_points SET status = 'faulted' WHERE id = ?;`,
          [incident.resourceId]
        );
      } else if (incident.resourceKind === 'slot') {
        await this.client.run(
          `UPDATE parking_slots SET status = 'blocked' WHERE id = ?;`,
          [incident.resourceId]
        );
      }

      return incident;
    });
  }

  /**
   * Retrieve incident by ID along with its maintenance assignment if present
   */
  async getIncidentById(id) {
    const row = await this.client.get('SELECT * FROM incidents WHERE id = ?;', [id]);
    if (!row) {
      return null;
    }

    const assignmentRow = await this.client.get(
      'SELECT * FROM maintenance_assignments WHERE incident_id = ?;',
      [id]
    );

    let assignment = null;
    if (assignmentRow) {
      assignment = new MaintenanceAssignment({
        id: assignmentRow.id,
        incidentId: assignmentRow.incident_id,
        technicianId: assignmentRow.technician_id,
        scheduledAt: assignmentRow.scheduled_at,
        slaDeadline: assignmentRow.sla_deadline,
        status: assignmentRow.status
      });
    }

    return new Incident({
      id: row.id,
      reporterId: row.reporter_id,
      reporterRole: row.reporter_role,
      reportedTripId: row.reported_trip_id,
      resourceKind: row.resource_kind,
      resourceId: row.resource_id,
      description: row.description,
      severity: row.severity,
      status: row.status,
      reportedAt: row.reported_at,
      resolvedAt: row.resolved_at,
      resolutionNotes: row.resolution_notes,
      reportedLocation: row.reported_location,
      assignment
    });
  }

  /**
   * List incidents with optional filters (UC11)
   */
  async listIncidents({ status = null, resourceKind = null, reporterId = null } = {}) {
    let sql = `SELECT * FROM incidents WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (resourceKind) {
      sql += ` AND resource_kind = ?`;
      params.push(resourceKind);
    }
    if (reporterId) {
      sql += ` AND reporter_id = ?`;
      params.push(reporterId);
    }

    sql += ` ORDER BY reported_at DESC;`;

    const rows = await this.client.all(sql, params);
    const incidents = [];

    for (const r of rows) {
      incidents.push(new Incident({
        id: r.id,
        reporterId: r.reporter_id,
        reporterRole: r.reporter_role,
        reportedTripId: r.reported_trip_id,
        resourceKind: r.resource_kind,
        resourceId: r.resource_id,
        description: r.description,
        severity: r.severity,
        status: r.status,
        reportedAt: r.reported_at,
        resolvedAt: r.resolved_at,
        resolutionNotes: r.resolution_notes,
        reportedLocation: r.reported_location
      }));
    }

    return incidents;
  }

  /**
   * Assign maintenance technician and update incident (UC11)
   */
  async assignMaintenance(incident) {
    if (!incident.assignment) {
      throw new DomainError('NO_ASSIGNMENT', 'Incident has no assignment attached.');
    }

    return this.client.transaction(async () => {
      // 1. Update incident status to in_progress
      await this.client.run(
        `UPDATE incidents SET status = ? WHERE id = ?;`,
        [incident.status, incident.id]
      );

      // 2. Insert or replace assignment row
      await this.client.run(
        `INSERT OR REPLACE INTO maintenance_assignments (
          id, incident_id, technician_id, scheduled_at, sla_deadline, status
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          incident.assignment.id,
          incident.assignment.incidentId,
          incident.assignment.technicianId,
          incident.assignment.scheduledAt,
          incident.assignment.slaDeadline,
          incident.assignment.status
        ]
      );

      return incident;
    });
  }

  /**
   * Resolve incident upon technician verification (UC11 Alt 8a)
   */
  async resolveIncident(incident) {
    return this.client.transaction(async () => {
      // 1. Update incident
      await this.client.run(
        `UPDATE incidents 
         SET status = ?, resolved_at = ?, resolution_notes = ? 
         WHERE id = ?;`,
        [incident.status, incident.resolvedAt, incident.resolutionNotes, incident.id]
      );

      // 2. Complete assignment if exists
      if (incident.assignment) {
        await this.client.run(
          `UPDATE maintenance_assignments SET status = 'completed' WHERE incident_id = ?;`,
          [incident.id]
        );
      }

      // 3. Reactivate resource if appropriate
      if (incident.resourceKind === 'vehicle') {
        await this.client.run(
          `UPDATE electric_vehicles SET status = 'available' WHERE id = ? AND status = 'faulted';`,
          [incident.resourceId]
        );
      } else if (incident.resourceKind === 'charging_point') {
        await this.client.run(
          `UPDATE charging_points SET status = 'available' WHERE id = ? AND status = 'faulted';`,
          [incident.resourceId]
        );
      } else if (incident.resourceKind === 'slot') {
        await this.client.run(
          `UPDATE parking_slots SET status = 'available' WHERE id = ? AND status = 'blocked';`,
          [incident.resourceId]
        );
      }

      return incident;
    });
  }
}

module.exports = {
  SQLiteIncidentRepository
};
