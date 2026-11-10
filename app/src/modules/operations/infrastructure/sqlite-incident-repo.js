/**
 * SQLite Repository for Operational Incidents & Maintenance (UC11, UC11A)
 * Module: Operations (Infrastructure)
 * 
 * Persists incidents, SLA assignments, and resolves equipment faults:
 * - Records incidents from User trips or Operator alerts.
 * - Manages technician dispatch with SLA deadlines.
 * - Supports hubId and status filtering per API_CONTRACTS.md.
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

  async createIncident(incident) {
    return this.client.transaction(async () => {
      const table = { vehicle: 'electric_vehicles', slot: 'parking_slots', charging_point: 'charging_points' }[incident.resourceKind];
      if (!table || !await this.client.get(`SELECT id FROM ${table} WHERE id = ?;`, [incident.resourceId])) {
        throw new DomainError('RESOURCE_NOT_FOUND', `Resource ${incident.resourceId} not found.`);
      }
      if (incident.reportedTripId && !await this.client.get(
        `SELECT id FROM electric_vehicles WHERE id = ? AND trip_id = ? AND status IN ('InUse', 'in_use');`,
        [incident.resourceId, incident.reportedTripId]
      )) {
        throw new DomainError('TRIP_NOT_ACTIVE', 'Vehicle is not assigned to the active trip.');
      }
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

      // Isolate resource status
      if (incident.resourceKind === 'vehicle') {
        if (!incident.reportedTripId) {
          await this.client.run(
            `UPDATE electric_vehicles SET status = 'Faulty' WHERE id = ? AND status != 'InUse' AND status != 'in_use';`,
            [incident.resourceId]
          );
        }
      } else if (incident.resourceKind === 'charging_point') {
        await this.client.run(
          `UPDATE charging_points SET status = 'Fault' WHERE id = ?;`,
          [incident.resourceId]
        );
      } else if (incident.resourceKind === 'slot') {
        await this.client.run(
          `UPDATE parking_slots SET status = 'Suspended' WHERE id = ?;`,
          [incident.resourceId]
        );
      }

      return incident;
    });
  }

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
   * List incidents with filters including status and hubId (API_CONTRACTS.md)
   * @param {{ status?: string, hubId?: string, resourceKind?: string, reporterId?: string }} filters
   */
  async listIncidents({ status = null, hubId = null, resourceKind = null, reporterId = null } = {}) {
    let sql = `
      SELECT DISTINCT i.* 
      FROM incidents i
      LEFT JOIN electric_vehicles v ON (i.resource_kind = 'vehicle' AND i.resource_id = v.id)
      LEFT JOIN parking_slots s ON (i.resource_kind = 'slot' AND i.resource_id = s.id)
      LEFT JOIN charging_points cp ON (i.resource_kind = 'charging_point' AND i.resource_id = cp.id)
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND LOWER(i.status) = LOWER(?)`;
      params.push(status);
    }
    if (hubId) {
      sql += ` AND (v.hub_id = ? OR s.hub_id = ? OR cp.hub_id = ?)`;
      params.push(hubId, hubId, hubId);
    }
    if (resourceKind) {
      sql += ` AND LOWER(i.resource_kind) = LOWER(?)`;
      params.push(resourceKind);
    }
    if (reporterId) {
      sql += ` AND i.reporter_id = ?`;
      params.push(reporterId);
    }

    sql += ` ORDER BY i.reported_at DESC;`;

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

  async assignMaintenance(incident) {
    if (!incident.assignment) {
      throw new DomainError('NO_ASSIGNMENT', 'Incident has no assignment attached.');
    }

    return this.client.transaction(async () => {
      const updated = await this.client.run(
        `UPDATE incidents SET status = ? WHERE id = ? AND status IN ('Open', 'open');`,
        [incident.status, incident.id]
      );
      if (updated.changes !== 1) throw new DomainError('INCIDENT_ASSIGNMENT_CONFLICT', 'Incident is no longer open for assignment.');

      await this.client.run(
        `INSERT INTO maintenance_assignments (
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

  async resolveIncident(incident) {
    return this.client.transaction(async () => {
      const updated = await this.client.run(
        `UPDATE incidents 
         SET status = ?, resolved_at = ?, resolution_notes = ? 
         WHERE id = ? AND status IN ('Investigating', 'investigating', 'in_progress')
           AND EXISTS (SELECT 1 FROM maintenance_assignments WHERE incident_id = incidents.id);`,
        [incident.status, incident.resolvedAt, incident.resolutionNotes, incident.id]
      );
      if (updated.changes !== 1) throw new DomainError('INCIDENT_ALREADY_CLOSED', 'Incident is already resolved.');

      if (incident.assignment) {
        await this.client.run(
          `UPDATE maintenance_assignments SET status = 'Completed' WHERE incident_id = ?;`,
          [incident.id]
        );
      }

      if (incident.resourceKind === 'vehicle') {
        await this.client.run(
          `UPDATE electric_vehicles SET status = CASE
             WHEN trip_id IS NOT NULL THEN 'InUse'
             WHEN reservation_id IS NOT NULL THEN 'Reserved'
             WHEN transfer_hold_id IS NOT NULL THEN CASE WHEN EXISTS (SELECT 1 FROM transfers WHERE id = electric_vehicles.transfer_hold_id AND status IN ('InTransit','in_transit')) THEN 'InTransit' ELSE 'TransferHeld' END
             WHEN battery_percent < 20 THEN 'NeedsCharging' ELSE 'Available' END
           WHERE id = ? AND (status = 'Faulty' OR status = 'faulted')
           AND NOT EXISTS (SELECT 1 FROM incidents WHERE resource_kind = 'vehicle' AND resource_id = electric_vehicles.id AND LOWER(status) NOT IN ('resolved', 'closed'));`,
          [incident.resourceId]
        );
      } else if (incident.resourceKind === 'slot') {
        await this.client.run(
          `UPDATE parking_slots SET status = CASE WHEN occupancy_id IS NOT NULL THEN 'Occupied' WHEN reservation_id IS NOT NULL OR transfer_hold_id IS NOT NULL THEN 'Held' ELSE 'Available' END
           WHERE id = ? AND (status = 'Suspended' OR status = 'blocked')
           AND NOT EXISTS (SELECT 1 FROM incidents WHERE resource_kind = 'slot' AND resource_id = parking_slots.id AND LOWER(status) NOT IN ('resolved', 'closed'));`,
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
