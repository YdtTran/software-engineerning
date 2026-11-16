const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createDashboardDemo } = require('../../db/create-dashboard-demo');
const { createOperationsModule } = require('../modules/operations');

test('dashboard demo data produces green, yellow and red UC08 states', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-dashboard-'));
  const filename = path.join(directory, 'dashboard.sqlite');

  assert.equal(createDashboardDemo(filename), filename);
  assert.throws(() => createDashboardDemo(filename), /Refusing to overwrite/);

  const db = new DatabaseSync(filename);
  t.after(() => db.close());
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const operations = createOperationsModule({ db });
  const hubs = Object.fromEntries((await operations.monitoringService.getNetworkOverview()).map(hub => [hub.hubId, hub]));

  assert.equal(hubs.metro.alert.level, 'GREEN');
  assert.equal(hubs.metro.charging.faultedPoints, 1);
  assert.equal(hubs.bku.alert.level, 'YELLOW');
  assert.equal(hubs.bku.capacity.occupancyRate, 87.5);
  assert.equal(hubs['dorm-a'].alert.level, 'RED');
  assert.equal(hubs['dorm-a'].capacity.occupancyRate, 100);
  assert.equal(hubs.library.alert.level, 'GREEN');

  const incidents = await operations.incidentService.listIncidents({ hubId: 'metro' });
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].id, 'INC-DEMO-METRO-C03');
  assert.equal(incidents[0].resourceId, 'metro-C03');
  assert.equal(incidents[0].status, 'Open');
  assert.equal(db.prepare("SELECT count(*) AS n FROM charging_requests WHERE status = 'Queued'").get().n, 4);
});
