const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scryptSync } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const { createApp } = require('../../../app');
const { createOperationsModule } = require('../../operations');
const { createParkingChargingModule, createChargingGuard } = require('../index');
const { SQLiteClient } = require('../../operations/infrastructure/sqlite-client');

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

// Handle multi-thread file-backed WAL worker execution for true SQLite multi-connection lock testing.
if (!isMainThread) {
  (async () => {
    const { dbFile, userId, vehicleId, slotId, plannedArrival, plannedCheckout } = workerData;
    const db = new DatabaseSync(dbFile);
    db.exec('PRAGMA busy_timeout = 5000;');
    const client = new SQLiteClient(db);
    const guard = createChargingGuard(client);
    const ops = createOperationsModule({ client, chargingGuard: guard });
    const pc = createParkingChargingModule({
      client,
      inventoryInterface: ops.inventoryInterface,
      incidentReporter: ops.incidentService,
      chargingGuard: guard
    });

    try {
      const res = await pc.parkingService.createReservation({
        actor: { id: userId, role: 'user' },
        vehicleId,
        hubId: 'bku',
        pool: 'advance',
        slotId,
        plannedArrival,
        plannedCheckout
      });
      parentPort.postMessage({ ok: true, id: res.id });
    } catch (err) {
      parentPort.postMessage({ ok: false, status: err.status || 409, code: err.code });
    } finally {
      db.close();
    }
  })();
} else {
  function initDb(db) {
    const dbDir = path.resolve(__dirname, '../../../../db');
    for (const relPath of MIGRATIONS) {
      db.exec(fs.readFileSync(path.join(dbDir, relPath), 'utf8'));
    }
    db.exec('PRAGMA user_version = 12;');
    db.exec(`
      INSERT INTO electric_vehicles (id, hub_id, vehicle_type, battery_percent, status, owner_id, connector_type)
      VALUES
        ('PV-CONC-1', 'bku', 'electric_motorbike', 30, 'Available', 'u1', 'type2'),
        ('PV-CONC-2', 'bku', 'electric_motorbike', 40, 'Available', 'u2', 'type2');
    `);
  }

  function makeAccount(username, id, roles) {
    const salt = '0123456789abcdef0123456789abcdef';
    return {
      username,
      id,
      roles,
      salt,
      passwordHash: scryptSync('secret', Buffer.from(salt, 'hex'), 64).toString('hex')
    };
  }

  async function setupHttp(t) {
    const db = new DatabaseSync(':memory:');
    initDb(db);

    const app = createApp({
      db,
      secureCookies: false,
      demoAccounts: [
        makeAccount('u1', 'u1', ['user']),
        makeAccount('u2', 'u2', ['user']),
        makeAccount('op1', 'op1', ['operator'])
      ]
    });
    const server = await new Promise(resolve => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    t.after(async () => {
      await new Promise(resolve => server.close(resolve));
      db.close();
    });

    const origin = `http://127.0.0.1:${server.address().port}`;

    async function login(username) {
      const r = await fetch(`${origin}/api/v1/session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify({ username, password: 'secret' })
      });
      return r.headers.get('set-cookie').split(';')[0];
    }

    async function post(urlPath, cookie, key, body) {
      const res = await fetch(`${origin}/api/v1${urlPath}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin,
          cookie,
          'idempotency-key': key
        },
        body: JSON.stringify(body)
      });
      return { status: res.status, json: await res.json() };
    }

    return { db, app, login, post };
  }

  test('concurrent overlapping UC06 advance parking bookings serialize with exactly 1 winner (HTTP + WAL workers)', async t => {
    // Part 1: HTTP Promise.all race on shared server
    const { db, login, post } = await setupHttp(t);
    const u1Cookie = await login('u1');
    const u2Cookie = await login('u2');
    const advSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'advance' ORDER BY code ASC LIMIT 1").get().id;

    const base = Date.now();
    const t1Start = new Date(base + 60 * 60000).toISOString();
    const t1End = new Date(base + 120 * 60000).toISOString();
    const t2Start = new Date(base + 90 * 60000).toISOString();
    const t2End = new Date(base + 150 * 60000).toISOString();

    const [r1, r2] = await Promise.all([
      post('/parking-reservations', u1Cookie, 'race-adv-1', {
        hubId: 'bku', slotId: advSlot, privateVehicleId: 'PV-CONC-1', pool: 'advance', plannedArrival: t1Start, plannedCheckout: t1End
      }),
      post('/parking-reservations', u2Cookie, 'race-adv-2', {
        hubId: 'bku', slotId: advSlot, privateVehicleId: 'PV-CONC-2', pool: 'advance', plannedArrival: t2Start, plannedCheckout: t2End
      })
    ]);

    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [201, 409]);
    const loser = r1.status === 409 ? r1 : r2;
    assert.equal(loser.json.error.code, 'SLOT_UNAVAILABLE');

    const commitmentCount = db.prepare("SELECT count(*) AS c FROM parking_commitments WHERE slot_id = ? AND status = 'Reserved'").get(advSlot).c;
    assert.equal(commitmentCount, 1);

    // Part 2: Real multi-connection SQLite WAL worker threads racing on disk DB
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-conc-'));
    t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
    const dbFile = path.join(tmpDir, 'race.sqlite');
    const fileDb = new DatabaseSync(dbFile);
    fileDb.exec('PRAGMA journal_mode = WAL;');
    initDb(fileDb);
    fileDb.close();

    const spawnWorker = payload => new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: payload });
      let msg = null;
      worker.once('message', m => { msg = m; });
      worker.once('error', reject);
      worker.once('exit', code => {
        if (code !== 0 && !msg) return reject(new Error(`Worker exited with code ${code}`));
        resolve(msg);
      });
    });

    const [w1, w2] = await Promise.all([
      spawnWorker({ dbFile, userId: 'u1', vehicleId: 'PV-CONC-1', slotId: advSlot, plannedArrival: t1Start, plannedCheckout: t1End }),
      spawnWorker({ dbFile, userId: 'u2', vehicleId: 'PV-CONC-2', slotId: advSlot, plannedArrival: t2Start, plannedCheckout: t2End })
    ]);
    assert.equal([w1.ok, w2.ok].filter(Boolean).length, 1);
    assert.equal([w1.ok, w2.ok].filter(x => !x).length, 1);
  });

  test('cross-module UC06 parking reservation vs Operations UC10 transfer hold contention serializes cleanly', async t => {
    const { db, login, post } = await setupHttp(t);
    const u1Cookie = await login('u1');
    const opCookie = await login('op1');

    const targetSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'immediate' AND status = 'Available' ORDER BY code ASC LIMIT 1").get().id;
    const sharedVehicle = db.prepare("SELECT id FROM electric_vehicles WHERE hub_id = 'metro' AND owner_id IS NULL AND status = 'Available' LIMIT 1").get().id;

    const [parkingOutcome, transferOutcome] = await Promise.all([
      post('/parking-reservations', u1Cookie, 'race-uc06-uc10-p', {
        hubId: 'bku',
        slotId: targetSlot,
        privateVehicleId: 'PV-CONC-1',
        pool: 'immediate'
      }),
      post('/transfers', opCookie, 'race-uc06-uc10-t', {
        sourceHubId: 'metro',
        destinationHubId: 'bku',
        vehicleIds: [sharedVehicle],
        destinationSlotIds: [targetSlot]
      })
    ]);

    const codes = [parkingOutcome.status, transferOutcome.status].sort((a, b) => a - b);
    assert.deepEqual(codes, [201, 409]);

    const slotRow = db.prepare('SELECT status, reservation_id, transfer_hold_id FROM parking_slots WHERE id = ?').get(targetSlot);
    assert.equal(Boolean(slotRow.reservation_id) && Boolean(slotRow.transfer_hold_id), false);
    assert.equal(Boolean(slotRow.reservation_id) || Boolean(slotRow.transfer_hold_id), true);
  });

  test('concurrent UC12 allocations serialize cleanly on same port and on last remaining Hub power kW', async t => {
    const { db, login, post } = await setupHttp(t);
    const u1Cookie = await login('u1');
    const u2Cookie = await login('u2');
    const opCookie = await login('op1');

    // Park both private vehicles at bku via HTTP
    async function parkAndRequest(cookie, vehicleId, tag) {
      const r = await post('/parking-reservations', cookie, `cr-${tag}`, {
        hubId: 'bku', privateVehicleId: vehicleId, pool: 'immediate'
      });
      assert.equal(r.status, 201);
      const ci = await post(`/parking-reservations/${r.json.data.id}/check-in`, cookie, `ci-${tag}`, {
        hubId: 'bku', ticketCode: r.json.data.ticketCode
      });
      assert.equal(ci.status, 200);
      const cr = await post('/charging-requests', cookie, `rq-${tag}`, {
        occupancyId: ci.json.data.occupancyId, targetBatteryPercent: 90
      });
      assert.equal(cr.status, 201);
      return cr.json.data.id;
    }

    const req1Id = await parkAndRequest(u1Cookie, 'PV-CONC-1', '1');
    const req2Id = await parkAndRequest(u2Cookie, 'PV-CONC-2', '2');
    const ports = db.prepare("SELECT id FROM charging_points WHERE hub_id = 'bku' AND status = 'Available' ORDER BY code ASC").all().map(r => r.id);
    assert.ok(ports.length >= 2);

    // Case A: Both concurrently compete for the EXACT SAME port[0]
    const [samePort1, samePort2] = await Promise.all([
      post(`/charging-requests/${req1Id}/allocate`, opCookie, 'same-port-1', { portId: ports[0], powerKw: 5.0 }),
      post(`/charging-requests/${req2Id}/allocate`, opCookie, 'same-port-2', { portId: ports[0], powerKw: 5.0 })
    ]);
    assert.deepEqual([samePort1.status, samePort2.status].sort((a, b) => a - b), [200, 409]);

    // Cleanly cancel losing/winning allocation cleanly to test Case B on remaining Hub power budget
    const winnerReqId = samePort1.status === 200 ? req1Id : req2Id;
    const loserReqId = samePort1.status === 200 ? req2Id : req1Id;
    await post(`/charging-requests/${winnerReqId}/cancel`, samePort1.status === 200 ? u1Cookie : u2Cookie, 'cancel-win', {});
    const req3 = await post('/charging-requests', samePort1.status === 200 ? u1Cookie : u2Cookie, 'rq-3', {
      occupancyId: db.prepare('SELECT occupancy_id FROM charging_requests WHERE id = ?').get(winnerReqId).occupancy_id,
      targetBatteryPercent: 90
    });
    assert.equal(req3.status, 201);

    // Case B: Configure hub power_limit_kw = 7.0 kW; both concurrently ask for 6.0 kW on two DIFFERENT available ports
    db.prepare("UPDATE mobility_hubs SET power_limit_kw = 7.0 WHERE id = 'bku'").run();
    const [budget1, budget2] = await Promise.all([
      post(`/charging-requests/${loserReqId}/allocate`, opCookie, 'budget-1', { portId: ports[0], powerKw: 6.0 }),
      post(`/charging-requests/${req3.json.data.id}/allocate`, opCookie, 'budget-2', { portId: ports[1], powerKw: 6.0 })
    ]);

    assert.deepEqual([budget1.status, budget2.status].sort((a, b) => a - b), [200, 409]);
    const budgetLoser = budget1.status === 409 ? budget1 : budget2;
    assert.equal(budgetLoser.json.error.code, 'POWER_BUDGET_EXCEEDED');

    const totalKw = db.prepare("SELECT COALESCE(SUM(allocated_power_kw), 0) AS total FROM charging_allocations WHERE hub_id = 'bku' AND released_at IS NULL").get().total;
    assert.equal(totalKw, 6.0);
  });
}
