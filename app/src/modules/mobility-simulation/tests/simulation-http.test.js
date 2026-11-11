const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { backendFixture } = require('./fixtures/backend-fixture');
const { createMobilitySimulationModule } = require('../index');

test('simulation HTTP is Operator-only and computes against the configured snapshot provider', async t => {
  const { client, inventory } = backendFixture(t);
  const snapshotProvider = { capture: () => client.transaction(async () => {
    const snapshot = await inventory.captureNetworkSnapshot();
    const available = [], slots = [];
    for (const hub of snapshot.hubs) { available.push(...await inventory.getAvailableVehicles(hub.id)); slots.push(...await inventory.getAvailableSlots(hub.id)); }
    return { ...snapshot, availableVehicleIds: available.map(vehicle => vehicle.id), availableSlotIds: slots.map(slot => slot.id) };
  }) };
  const app = express(); app.use(express.json());
  app.use((req, res, next) => { if (req.get('Authorization') === 'test-operator') req.user = { id: 'o', roles: ['operator'] }; if (req.get('Authorization') === 'test-user') req.user = { id: 'u', roles: ['user'] }; next(); });
  app.use('/api/v1', createMobilitySimulationModule({ client, inventory, snapshotProvider }).router);
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/simulations`;
  const input = { scenario: 'metro', hubIds: ['metro', 'bku'], parameters: { durationMinutes: 30, demandPerHour: 40, demandMultiplier: 3 } };
  const post = (auth, body = input, key = 'simulation') => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json', authorization: auth, 'idempotency-key': key, 'x-user-role': 'operator' }, body: JSON.stringify(body) });
  assert.equal((await post('')).status, 401);
  assert.equal((await post('test-user')).status, 403);
  assert.equal((await post('test-operator', { ...input, scenario: 'invalid' }, 'bad')).status, 422);
  const first = await post('test-operator'); assert.equal(first.status, 201); const result = (await first.json()).data;
  assert.equal((await post('test-operator')).status, 201);
  const get = await fetch(base + '/' + result.id, { headers: { authorization: 'test-operator' } });
  assert.equal(get.status, 200); assert.deepEqual((await get.json()).data, result);
  assert.equal((await fetch(base + '/' + result.id, { headers: { authorization: 'test-user' } })).status, 403);
  assert.equal((await fetch(base + '/missing', { headers: { authorization: 'test-operator' } })).status, 404);
});
