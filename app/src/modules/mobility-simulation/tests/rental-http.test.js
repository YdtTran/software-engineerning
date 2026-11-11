const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scryptSync } = require('node:crypto');
const { backendFixture } = require('./fixtures/backend-fixture');
const { createApp } = require('../../../app');

test('session-authenticated HTTP lifecycle enforces ownership, roles, idempotency and trusted trip reports', async t => {
  const { db } = backendFixture(t);
  const salt = '0123456789abcdef0123456789abcdef';
  const account = (username, role) => ({ username, id: username, roles: [role], salt,
    passwordHash: scryptSync('fixture-password', Buffer.from(salt, 'hex'), 64).toString('hex') });
  const app = createApp({ db, secureCookies: false, simulateDevices: true,
    demoAccounts: [account('rider', 'user'), account('other', 'user'), account('operator', 'operator')] });
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const login = async username => {
    const response = await fetch(origin + '/api/v1/session', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ username, password: 'fixture-password' }) });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  };
  const rider = await login('rider'), other = await login('other'), operator = await login('operator');
  const write = (route, body, key, cookie = rider) => fetch(origin + '/api/v1' + route, { method: 'POST',
    headers: { 'content-type': 'application/json', origin, cookie, ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(body) });
  const input = { vehicleId: 'EB-024', hubId: 'metro' };
  assert.equal((await write('/vehicle-reservations', input, 'op', operator)).status, 403);
  assert.equal((await write('/vehicle-reservations', input)).status, 400);
  const reserved = await write('/vehicle-reservations', input, 'reserve');
  assert.equal(reserved.status, 201);
  const reservation = (await reserved.json()).data;
  assert.equal((await write('/vehicle-reservations', input, 'reserve')).status, 201);
  assert.equal((await write('/vehicle-reservations', { ...input, vehicleId: 'EM-012' }, 'reserve')).status, 409);
  const pickupRoute = `/vehicle-reservations/${reservation.id}/pickup`;
  assert.equal((await write(pickupRoute, { vehicleCode: 'EB-024' }, 'other', other)).status, 403);
  assert.equal((await write(pickupRoute, { vehicleCode: 'wrong' }, 'wrong')).status, 422);
  const picked = await write(pickupRoute, { vehicleCode: 'EB-024' }, 'pickup');
  assert.equal(picked.status, 200);
  const trip = (await picked.json()).data;
  const report = `/trips/${trip.id}/incidents`;
  assert.equal((await write(report, { description: 'fixture incident', vehicleId: 'forged' }, 'forged', other)).status, 403);
  assert.equal((await write(report, { description: 'fixture incident', vehicleId: 'forged' }, 'incident')).status, 201);
  assert.equal(db.prepare('SELECT status FROM mobility_trips WHERE id=?').get(trip.id).status, 'Active');
  const returned = await write(`/trips/${trip.id}/return`, { hubId: 'bku', slotId: 'bku-A01', confirmed: true }, 'return');
  assert.equal(returned.status, 200);
  assert.equal((await returned.json()).data.status, 'Completed');
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status, 'Faulty');
});
