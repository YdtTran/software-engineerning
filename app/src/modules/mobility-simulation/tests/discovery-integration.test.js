const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scryptSync } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { createApp } = require('../../../app');

test('composed app discovers live inventory through authenticated demo sessions without writes', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mobility-stage1-'));
  const db = new DatabaseSync(path.join(directory, 'inventory.sqlite'));
  t.after(() => {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const base = path.resolve(__dirname, '../../../../db');
  const migrations = fs.readdirSync(path.join(base, 'migrations')).filter(file => /^\d+.*\.sql$/.test(file)).sort();
  for (const file of migrations) db.exec(fs.readFileSync(path.join(base, 'migrations', file), 'utf8'));
  db.exec(fs.readFileSync(path.join(base, 'seed.sql'), 'utf8'));
  db.exec(`
    INSERT INTO mobility_hubs (id, name) VALUES ('empty', 'Empty Hub');
    UPDATE electric_vehicles SET status = 'Reserved' WHERE id = 'EB-031';
    UPDATE electric_vehicles SET status = 'Maintenance' WHERE id = 'EB-100';
    UPDATE electric_vehicles SET status = 'NeedsCharging' WHERE id = 'EB-101';
    UPDATE electric_vehicles SET battery_percent = 10 WHERE id = 'EB-102';
    UPDATE electric_vehicles SET owner_id = 'private-user' WHERE id = 'EB-103';
    UPDATE electric_vehicles SET reservation_id = 'hold' WHERE id = 'EB-104';
    UPDATE electric_vehicles SET trip_id = 'active-trip' WHERE id = 'EB-105';
    INSERT INTO transfers (id, source_hub_id, destination_hub_id, status, created_by, created_at)
      VALUES ('transfer', 'metro', 'library', 'Planned', 'operator', '2026-11-10T00:00:00Z');
    UPDATE electric_vehicles SET transfer_hold_id = 'transfer' WHERE id = 'EB-106';
    UPDATE electric_vehicles SET pickup_claimed = 1 WHERE id = 'EB-107';
    INSERT INTO incidents (id, reporter_id, reporter_role, resource_kind, resource_id, description, severity, status, reported_at)
      VALUES ('fault', 'operator', 'operator', 'vehicle', 'EB-108', 'unresolved fault', 'standard', 'Open', '2026-11-10T00:00:00Z');
  `);
  const before = JSON.stringify(db.prepare('SELECT * FROM electric_vehicles ORDER BY id').all());
  const salt = '0123456789abcdef0123456789abcdef';
  const account = (username, role) => ({
    username, id: username, roles: [role], salt,
    passwordHash: scryptSync('fixture-password', Buffer.from(salt, 'hex'), 64).toString('hex')
  });
  const app = createApp({ db, secureCookies: false, demoAccounts: [account('rider', 'user'), account('operator', 'operator')] });
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const login = async username => {
    const response = await fetch(origin + '/api/v1/session', {
      method: 'POST', headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ username, password: 'fixture-password' })
    });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  };
  const forged = await fetch(origin + '/api/v1/hubs', { headers: { 'x-user-id': 'rider', 'x-user-role': 'user' } });
  assert.equal(forged.status, 401);
  const riderCookie = await login('rider');
  const operatorCookie = await login('operator');
  const get = (route, cookie = riderCookie) => fetch(origin + '/api/v1' + route, { headers: { cookie } });
  const hubs = await get('/hubs');
  assert.equal(hubs.status, 200);
  assert.equal((await hubs.json()).data.length, 5);
  const filtered = await get('/hubs?q=metro');
  assert.deepEqual((await filtered.json()).data, [{ id: 'metro', name: 'Ga Metro ĐHQG', location: null }]);
  const vehicles = await get('/hubs/metro/vehicles');
  assert.equal(vehicles.status, 200);
  const visible = (await vehicles.json()).data;
  assert.ok(visible.some(vehicle => vehicle.id === 'EB-024'));
  assert.ok(visible.some(vehicle => vehicle.id === 'EM-012'));
  for (const excluded of ['EB-031', 'EB-100', 'EB-101', 'EB-102', 'EB-103', 'EB-104', 'EB-105', 'EB-106', 'EB-107', 'EB-108']) {
    assert.ok(!visible.some(vehicle => vehicle.id === excluded), `${excluded} must remain unavailable`);
  }
  const motorbikes = (await (await get('/hubs/metro/vehicles?type=electric_motorbike')).json()).data;
  assert.ok(motorbikes.length > 0);
  assert.ok(motorbikes.every(vehicle => vehicle.vehicleType === 'electric_motorbike'));
  assert.equal((await get('/hubs/metro/vehicles', operatorCookie)).status, 200);
  assert.deepEqual(await (await get('/hubs/empty/vehicles')).json(), { data: [] });
  assert.equal((await get('/hubs/missing/vehicles')).status, 404);
  assert.equal((await get('/operations/hubs')).status, 403);
  assert.equal((await get('/operations/hubs', operatorCookie)).status, 200);
  assert.equal((await get('/not-a-route')).status, 404);
  assert.equal(JSON.stringify(db.prepare('SELECT * FROM electric_vehicles ORDER BY id').all()), before);
  const logout = await fetch(origin + '/api/v1/session', { method: 'DELETE', headers: { cookie: riderCookie, origin } });
  assert.equal(logout.status, 200);
  assert.equal((await get('/hubs')).status, 401);
});
