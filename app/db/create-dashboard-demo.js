const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { initializeDatabase } = require('./initialize');
const { Incident, IncidentSeverity, ReporterRole } = require('../src/modules/operations/domain/incident');

function createDashboardDemo(filename = path.join(__dirname, '.local', 'dashboard-demo.sqlite')) {
  const resolved = path.resolve(filename);
  if (fs.existsSync(resolved)) {
    throw new Error(`Refusing to overwrite the existing demo database: ${resolved}`);
  }

  initializeDatabase(resolved);
  const db = new DatabaseSync(resolved);
  try {
    const demoIncident = new Incident({
      id: 'INC-DEMO-METRO-C03',
      reporterId: 'system',
      reporterRole: ReporterRole.SYSTEM,
      resourceKind: 'charging_point',
      resourceId: 'metro-C03',
      description: 'Cổng sạc C03 ngắt áp bảo vệ, cần kỹ thuật viên kiểm tra an toàn trước khi mở lại.',
      severity: IncidentSeverity.CRITICAL,
      reportedAt: '2026-11-16T01:00:00.000Z',
      reportedLocation: 'Ga Metro Suối Tiên'
    });
    db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;');
    db.prepare("UPDATE parking_slots SET status='Occupied' WHERE hub_id='dorm-a'").run();
    db.prepare("UPDATE parking_slots SET status='Occupied' WHERE hub_id='bku' AND id <> 'bku-A08'").run();
    db.prepare("UPDATE charging_points SET status='Fault' WHERE id='metro-C03'").run();
    db.prepare(`INSERT INTO incidents (
      id, reporter_id, reporter_role, reported_trip_id,
      resource_kind, resource_id, description, severity,
      status, reported_at, reported_location
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      demoIncident.id, demoIncident.reporterId, demoIncident.reporterRole, demoIncident.reportedTripId,
      demoIncident.resourceKind, demoIncident.resourceId, demoIncident.description, demoIncident.severity,
      demoIncident.status, demoIncident.reportedAt, demoIncident.reportedLocation
    );
    db.prepare("UPDATE electric_vehicles SET status='NeedsCharging', battery_percent=15 WHERE id='EM-117'").run();
    db.prepare("UPDATE electric_vehicles SET status='NeedsCharging', battery_percent=35 WHERE id='EB-135'").run();
    const insertRequest = db.prepare(`INSERT INTO charging_requests (
      id, user_id, vehicle_id, occupancy_id, hub_id,
      battery_at_request, target_battery_percent, needed_by, requested_start,
      manual_priority_rank, status, created_at, updated_at
    ) VALUES (?, 'operator', ?, NULL, ?, ?, ?, ?, NULL, NULL, 'Queued', '2026-11-16T01:05:00.000Z', '2026-11-16T01:05:00.000Z')`);
    insertRequest.run('CREQ-DEMO-METRO-1', 'EM-100', 'metro', 61, 95, '2030-01-01T12:00:00.000Z');
    insertRequest.run('CREQ-DEMO-METRO-2', 'EB-105', 'metro', 60, 90, '2030-01-01T13:00:00.000Z');
    insertRequest.run('CREQ-DEMO-LIB-1', 'EM-117', 'library', 15, 95, '2030-01-01T12:00:00.000Z');
    insertRequest.run('CREQ-DEMO-LIB-2', 'EB-135', 'library', 35, 90, '2030-01-01T13:00:00.000Z');
    db.exec('COMMIT;');
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch { /* The transaction may already be closed. */ }
    throw error;
  } finally {
    db.close();
  }
  return resolved;
}

if (require.main === module) {
  try {
    process.stdout.write(createDashboardDemo(process.argv[2]) + '\n');
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}

module.exports = { createDashboardDemo };
