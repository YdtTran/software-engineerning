const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scryptSync } = require('node:crypto');
const { backendFixture } = require('../modules/mobility-simulation/tests/fixtures/backend-fixture');
const { createApp } = require('../app');

test('reconnect APIs preserve identity and ownership while serving only frontend assets', async t => {
  const { db } = backendFixture(t);
  const salt = '0123456789abcdef0123456789abcdef';
  const account = id => ({ username: id, id, roles: ['user'], salt,
    passwordHash: scryptSync('test-password', Buffer.from(salt, 'hex'), 64).toString('hex') });
  const app = createApp({ db, simulateDevices: true, secureCookies: false, demoAccounts: [account('rider'), account('other')] });
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const login = async username => {
    const response = await fetch(origin + '/api/v1/session', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ username, password: 'test-password' }) });
    return response.headers.get('set-cookie').split(';')[0];
  };
  const rider = await login('rider'), other = await login('other');
  const get = (route, cookie = rider) => fetch(origin + '/api/v1' + route, { headers: { cookie } });
  const post = (route, body, key) => fetch(origin + '/api/v1' + route, { method: 'POST', headers: { cookie: rider, origin, 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body) });
  assert.deepEqual(await (await get('/session')).json(), { data: { id: 'rider', roles: ['user'] } });
  const reservation = (await (await post('/vehicle-reservations', { vehicleId: 'EB-024', hubId: 'metro' }, 'reserve')).json()).data;
  assert.equal((await (await get('/vehicle-reservations')).json()).data[0].id, reservation.id);
  assert.deepEqual((await (await get('/vehicle-reservations', other)).json()).data, []);
  const trip = (await (await post(`/vehicle-reservations/${reservation.id}/pickup`, { vehicleCode: 'EB-024' }, 'pickup')).json()).data;
  assert.equal((await (await get('/trips')).json()).data[0].id, trip.id);
  assert.deepEqual((await (await get('/trips', other)).json()).data, []);
  assert.equal((await get(`/hubs/bku/return-slots?tripId=${trip.id}`, other)).status, 403);
  const slots = (await (await get(`/hubs/bku/return-slots?tripId=${trip.id}`)).json()).data;
  assert.ok(slots.some(slot => slot.id === 'bku-A01'));
  assert.equal((await fetch(origin + '/live.html')).status, 200);
  assert.equal((await fetch(origin + '/live.js')).status, 200);
  assert.equal((await fetch(origin + '/db/.local/hub.sqlite')).status, 404);
  assert.equal((await fetch(origin + '/.env')).status, 404);
});
