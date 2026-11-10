const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createMobilitySimulationModule } = require('../index');
const { createDiscoveryFixture } = require('./fixtures/discovery-fixtures');

async function startFixtureServer(t, inventory = createDiscoveryFixture()) {
  const app = express();
  app.use((req, res, next) => {
    // This middleware belongs only to the test harness, never the demo app.
    if (req.headers.authorization === 'fixture-user') req.user = { id: 'u', role: 'User' };
    if (req.headers.authorization === 'fixture-operator') req.user = { id: 'o', roles: ['Operator'] };
    if (req.headers.authorization === 'fixture-other') req.user = { id: 'x', role: 'other' };
    next();
  });
  app.use('/api/v1', createMobilitySimulationModule({ inventory }).router);
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/api/v1`;
}

test('both discovery routes enforce trusted User or Operator identity', async t => {
  const base = await startFixtureServer(t);
  for (const route of ['/hubs', '/hubs/metro/vehicles']) {
    const forged = await fetch(base + route, { headers: { 'x-user-id': 'u', 'x-user-role': 'operator' } });
    assert.equal(forged.status, 401);
    assert.equal((await forged.json()).error.code, 'UNAUTHENTICATED');
    const forbidden = await fetch(base + route, { headers: { authorization: 'fixture-other' } });
    assert.equal(forbidden.status, 403);
    for (const authorization of ['fixture-user', 'fixture-operator']) {
      const response = await fetch(base + route, { headers: { authorization } });
      assert.equal(response.status, 200);
      assert.ok(Array.isArray((await response.json()).data));
    }
  }
});

test('HTTP discovery supports filters, empty collections and structured errors', async t => {
  const base = await startFixtureServer(t);
  const get = route => fetch(base + route, { headers: { authorization: 'fixture-user' } });
  const filtered = await get('/hubs?q=METRO');
  assert.deepEqual((await filtered.json()).data.map(hub => hub.id), ['metro']);
  const typed = await get('/hubs/metro/vehicles?type=electric_bicycle');
  assert.deepEqual((await typed.json()).data.map(vehicle => vehicle.id), ['bike']);
  for (const route of ['/hubs?q=missing', '/hubs/empty/vehicles']) {
    const response = await get(route);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [] });
  }
  for (const route of ['/hubs?q=a&q=b', '/hubs/metro/vehicles?type=car',
    '/hubs/metro/vehicles?type=electric_bicycle&type=electric_motorbike']) {
    const response = await get(route);
    assert.equal(response.status, 400);
    assert.deepEqual((await response.json()).error.details, {});
  }
  const missing = await get('/hubs/missing/vehicles');
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'HUB_NOT_FOUND');
});
