const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DiscoveryService } = require('../application/discovery-service');
const { createDiscoveryFixture } = require('./fixtures/discovery-fixtures');

test('discovery works with an injected in-memory inventory, without Express or SQLite', async () => {
  const service = new DiscoveryService(createDiscoveryFixture());
  assert.equal((await service.searchHubs()).length, 3);
  assert.deepEqual((await service.searchHubs('  METRO  ')).map(hub => hub.id), ['metro']);
  assert.deepEqual((await service.searchHubs('THƯ VIỆN'.normalize('NFD'))).map(hub => hub.id), ['library']);
  assert.deepEqual(await service.searchHubs('unknown'), []);
  assert.equal((await service.listAvailableVehicles('metro')).length, 2);
  assert.deepEqual(await service.listAvailableVehicles('metro', 'electric_motorbike'), [
    { id: 'motorbike', vehicleType: 'electric_motorbike', batteryPercent: 72 }
  ]);
  assert.deepEqual(await service.listAvailableVehicles('empty'), []);
});

test('bad query shapes and nonexistent hubs are explicit errors', async () => {
  const service = new DiscoveryService(createDiscoveryFixture());
  for (const q of [['metro'], { value: 'metro' }, null]) {
    await assert.rejects(service.searchHubs(q), { code: 'INVALID_INPUT' });
  }
  for (const type of ['car', '', ['electric_bicycle'], null]) {
    await assert.rejects(service.listAvailableVehicles('metro', type), { code: 'INVALID_INPUT' });
  }
  await assert.rejects(service.listAvailableVehicles('missing'), { code: 'HUB_NOT_FOUND' });
  await assert.rejects(service.listAvailableVehicles(' '), { code: 'INVALID_INPUT' });
});

test('search does not expose inventory-only fields or invent missing locations', async () => {
  const inventory = createDiscoveryFixture();
  inventory.listHubs = async () => [{ id: 'a', name: 'Hub A', internalNote: 'private' }];
  const service = new DiscoveryService(inventory);
  assert.deepEqual(await service.searchHubs(), [{ id: 'a', name: 'Hub A', location: null }]);
});
