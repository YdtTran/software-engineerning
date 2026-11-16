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
    db.prepare("UPDATE electric_vehicles SET status='NeedsCharging' WHERE hub_id='library' AND id IN ('EM-117', 'EB-135')").run();
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
