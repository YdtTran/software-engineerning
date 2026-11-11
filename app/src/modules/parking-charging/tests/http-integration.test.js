const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scryptSync } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createApp } = require('../../../app');

const MIGRATIONS = [
  'migrations/0001_hub_inventory.sql',
  'seed.sql',
  'migrations/0002_operations_schema.sql',
  'migrations/0003_idempotency.sql',
  'migrations/0004_inventory_ownership.sql',
  'migrations/0005_parked_vehicle.sql',
  'migrations/0006_parking_commitments.sql',
  'migrations/0007_vehicle_pickup_claim.sql',
  'migrations/0008_incident_isolation.sql',
  'migrations/0009_transfer_slot_assignment.sql',
  'migrations/0010_mobility_lifecycle.sql',
  'migrations/0011_simulation_results.sql',
  'migrations/0012_parking_charging_schema.sql'
];

function makeAccount(username, id, roles, password = 'secret') {
  const salt = '0123456789abcdef0123456789abcdef';
  return {
    username,
    id,
    roles,
    salt,
    passwordHash: scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex')
  };
}

async function setupServer(t) {
  const db = new DatabaseSync(':memory:');
  const dbDir = path.resolve(__dirname, '../../../../db');
  for (const relPath of MIGRATIONS) {
    db.exec(fs.readFileSync(path.join(dbDir, relPath), 'utf8'));
  }
  db.exec('PRAGMA user_version = 12;');

  db.exec(`
    INSERT INTO electric_vehicles (id, hub_id, vehicle_type, battery_percent, status, owner_id, connector_type)
    VALUES
      ('PV-HTTP-1', 'bku', 'electric_motorbike', 35, 'Available', 'u1', 'type2'),
      ('PV-HTTP-2', 'bku', 'electric_motorbike', 55, 'Available', 'u2', 'type2');
  `);

  const demoAccounts = [
    makeAccount('user1', 'u1', ['user']),
    makeAccount('user2', 'u2', ['user']),
    makeAccount('operator1', 'op1', ['operator'])
  ];

  const app = createApp({ db, demoAccounts, secureCookies: false });
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
  });

  const origin = `http://127.0.0.1:${server.address().port}`;

  async function login(username) {
    const res = await fetch(`${origin}/api/v1/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ username, password: 'secret' })
    });
    assert.equal(res.status, 200);
    return res.headers.get('set-cookie').split(';')[0];
  }

  async function callApi(method, urlPath, { cookie = null, body = undefined, idempotencyKey = undefined } = {}) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (method !== 'GET') headers.origin = origin;
    if (idempotencyKey !== undefined) headers['idempotency-key'] = idempotencyKey;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(`${origin}/api/v1${urlPath}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const json = await res.json();
    return { status: res.status, json };
  }

  return { db, app, origin, login, callApi };
}

test('createApp wires chargingGuard and incidentReporter cleanly into Operations', async t => {
  const { db, app, login, callApi } = await setupServer(t);
  const opCookie = await login('operator1');
  const pointId = db.prepare("SELECT id FROM charging_points WHERE hub_id = 'bku' ORDER BY code ASC LIMIT 1").get().id;

  // Previously would return 503 CHARGING_GUARD_UNAVAILABLE; now enforces SC02 -> 422 INVALID_STATE_TRANSITION
  await assert.rejects(
    app.locals.operations.inventoryInterface.updateChargingPointStatus(pointId, 'Reserved'),
    { code: 'INVALID_STATE_TRANSITION' }
  );

  // Trigger a LIM-01 incident with no alternatives and verify GET /api/v1/incidents exposes it
  const resOwner = await login('user1');
  const createRes = await callApi('POST', '/parking-reservations', {
    cookie: resOwner,
    idempotencyKey: 'inc-res-1',
    body: { hubId: 'bku', privateVehicleId: 'PV-HTTP-1', pool: 'immediate' }
  });
  assert.equal(createRes.status, 201);
  db.exec("UPDATE parking_slots SET status = 'Occupied', reservation_id = NULL, occupancy_id = 'occ_all_' || id WHERE pool = 'immediate'");

  const blocked = await callApi('POST', `/parking-reservations/${createRes.json.data.id}/check-in`, {
    cookie: resOwner,
    idempotencyKey: 'inc-ci-1',
    body: { hubId: 'bku', ticketCode: createRes.json.data.ticketCode }
  });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.json.error.code, 'SLOT_OCCUPIED');
  assert.ok(blocked.json.error.details.incidentId);

  const incidentsRes = await callApi('GET', '/incidents', { cookie: opCookie });
  assert.equal(incidentsRes.status, 200);
  assert.ok(incidentsRes.json.data.some(inc => inc.id === blocked.json.error.details.incidentId));
});

test('HTTP routes enforce authentication, RBAC, JSON envelopes, and Idempotency-Key replay/conflict', async t => {
  const { db, app, login, callApi } = await setupServer(t);
  const u1Cookie = await login('user1');
  const u2Cookie = await login('user2');
  const opCookie = await login('operator1');

  // Unauthenticated request -> 401
  const unauth = await callApi('GET', '/hubs/bku/parking-availability?pool=immediate');
  assert.equal(unauth.status, 401);
  assert.equal(unauth.json.error.code, 'UNAUTHENTICATED');

  // Operator-only user denied on Role U availability -> 403
  const opDeniedAvail = await callApi('GET', '/hubs/bku/parking-availability?pool=immediate', { cookie: opCookie });
  assert.equal(opDeniedAvail.status, 403);
  assert.equal(opDeniedAvail.json.error.code, 'FORBIDDEN_OPERATION');

  // User availability query -> 200
  const avail = await callApi('GET', '/hubs/bku/parking-availability?privateVehicleId=PV-HTTP-1&pool=immediate', { cookie: u1Cookie });
  assert.equal(avail.status, 200);
  assert.ok(avail.json.data.availableSlots.length > 0);
  const slotId = avail.json.data.availableSlots[0].id;

  // Missing Idempotency-Key on POST -> 400
  const missingKey = await callApi('POST', '/parking-reservations', {
    cookie: u1Cookie,
    body: { hubId: 'bku', slotId, privateVehicleId: 'PV-HTTP-1', pool: 'immediate' }
  });
  assert.equal(missingKey.status, 400);

  // Create reservation -> 201 + exact replay + 409 reused key with different body
  const reserveBody = { hubId: 'bku', slotId, privateVehicleId: 'PV-HTTP-1', pool: 'immediate' };
  const res1 = await callApi('POST', '/parking-reservations', { cookie: u1Cookie, idempotencyKey: 'k-res-1', body: reserveBody });
  assert.equal(res1.status, 201);
  assert.equal(res1.json.data.status, 'Reserved');

  const resReplay = await callApi('POST', '/parking-reservations', { cookie: u1Cookie, idempotencyKey: 'k-res-1', body: reserveBody });
  assert.equal(resReplay.status, 201);
  assert.equal(resReplay.json.data.id, res1.json.data.id);

  const resConflict = await callApi('POST', '/parking-reservations', {
    cookie: u1Cookie,
    idempotencyKey: 'k-res-1',
    body: { ...reserveBody, slotId: null }
  });
  assert.equal(resConflict.status, 409);
  assert.equal(resConflict.json.error.code, 'IDEMPOTENCY_KEY_REUSED');

  // Other user cannot GET or cancel u1's reservation -> 403
  assert.equal((await callApi('GET', `/parking-reservations/${res1.json.data.id}`, { cookie: u2Cookie })).status, 403);

  // Check-in -> 200 + GET occupancy
  const checkIn = await callApi('POST', `/parking-reservations/${res1.json.data.id}/check-in`, {
    cookie: u1Cookie,
    idempotencyKey: 'k-ci-1',
    body: { hubId: 'bku', ticketCode: res1.json.data.ticketCode }
  });
  assert.equal(checkIn.status, 200);
  const occId = checkIn.json.data.occupancyId;
  assert.equal((await callApi('GET', `/parking-occupancies/${occId}`, { cookie: u1Cookie })).status, 200);

  // Submit charging request -> 201, cancel via additive route -> 200
  const creqCancelable = await callApi('POST', '/charging-requests', {
    cookie: u1Cookie,
    idempotencyKey: 'k-cr-cancel',
    body: { occupancyId: occId, targetBatteryPercent: 75 }
  });
  assert.equal(creqCancelable.status, 201);
  const cancelledReq = await callApi('POST', `/charging-requests/${creqCancelable.json.data.id}/cancel`, {
    cookie: u1Cookie,
    idempotencyKey: 'k-cr-do-cancel',
    body: {}
  });
  assert.equal(cancelledReq.status, 200);
  assert.equal(cancelledReq.json.data.status, 'Cancelled');

  // Re-submit two charging requests, test Role O routes (schedule, override, allocate)
  const creqMain = await callApi('POST', '/charging-requests', {
    cookie: u1Cookie,
    idempotencyKey: 'k-cr-main',
    body: { occupancyId: occId, targetBatteryPercent: 85 }
  });
  assert.equal(creqMain.status, 201);

  assert.equal((await callApi('GET', '/hubs/bku/charging-schedule', { cookie: u1Cookie })).status, 403);
  const sched = await callApi('GET', '/hubs/bku/charging-schedule', { cookie: opCookie });
  assert.equal(sched.status, 200);
  assert.equal(sched.json.data.queue[0].id, creqMain.json.data.id);

  // Additive override route
  const overrideRes = await callApi('POST', '/hubs/bku/charging-schedule/override', {
    cookie: opCookie,
    idempotencyKey: 'k-ovr-1',
    body: { overrides: [{ requestId: creqMain.json.data.id, priorityRank: 1 }] }
  });
  assert.equal(overrideRes.status, 200);
  assert.equal(overrideRes.json.data.queue[0].manualPriorityRank, 1);

  // Operator allocate -> 200
  const portId = sched.json.data.points[0].id;
  const allocated = await callApi('POST', `/charging-requests/${creqMain.json.data.id}/allocate`, {
    cookie: opCookie,
    idempotencyKey: 'k-alloc-1',
    body: { portId, powerKw: 7.4 }
  });
  assert.equal(allocated.status, 200);
  assert.equal(allocated.json.data.pointStatus, 'Reserved');

  // Activate via internal hardware hook, user stops session via HTTP, confirm unplug, then HTTP check-out
  const session = await app.locals.parkingCharging.chargingService.activateAllocation({
    actor: { id: 'op1', role: 'operator' },
    allocationId: allocated.json.data.allocationId
  });
  assert.equal((await callApi('GET', `/charging-sessions/${session.id}`, { cookie: u1Cookie })).status, 200);

  const stopped = await callApi('POST', `/charging-sessions/${session.id}/stop`, {
    cookie: u1Cookie,
    idempotencyKey: 'k-stop-1',
    body: {}
  });
  assert.equal(stopped.status, 200);
  assert.equal(stopped.json.data.status, 'Interrupted');
  assert.equal(stopped.json.data.requestStatus, 'Cancelled');

  await app.locals.parkingCharging.chargingService.confirmUnplug({
    actor: { id: 'u1', role: 'user' },
    pointId: portId
  });

  const checkOut = await callApi('POST', `/parking-occupancies/${occId}/check-out`, {
    cookie: u1Cookie,
    idempotencyKey: 'k-co-1',
    body: {}
  });
  assert.equal(checkOut.status, 200);
  assert.equal(checkOut.json.data.finalFee, null);
  assert.ok(checkOut.json.data.actualCheckoutAt);
});
