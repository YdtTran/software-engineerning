const { test } = require('node:test');
const assert = require('node:assert/strict');
const { backendFixture } = require('./fixtures/backend-fixture');
const { SimulationService } = require('../application/simulation-service');
const { validateScenario } = require('../domain/simulation');

function fixedSnapshot() {
  return {
    capturedAt: '2026-11-10T00:00:00.000Z',
    hubs: [{ id: 'metro', name: 'Metro' }, { id: 'library', name: 'Library' }],
    vehicles: Array.from({ length: 6 }, (_, index) => ({ id: `v${index}`, hubId: index < 4 ? 'metro' : 'library', vehicleType: 'electric_bicycle', batteryPercent: 90, status: 'Available' })),
    slots: Array.from({ length: 12 }, (_, index) => ({ id: `s${index}`, hubId: index < 6 ? 'metro' : 'library', status: 'Available' })),
    chargingPoints: [{ id: 'p1', hubId: 'metro', status: 'Available' }, { id: 'p2', hubId: 'library', status: 'Available' }],
    availableVehicleIds: ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'],
    availableSlotIds: Array.from({ length: 12 }, (_, index) => `s${index}`)
  };
}
const parameters = { durationMinutes: 60, demandPerHour: 40, seed: 7, tripMinutes: 10, chargeMinutes: 20 };
const extras = {
  metro: { demandMultiplier: 4 }, parking: { occupiedPercent: 100 },
  'charging-demand': { chargingMultiplier: 4, chargingRequestsPerHour: 20, powerBudgetKw: 7, portPowerKw: 7 },
  charging: { failedPorts: 1, chargingRequestsPerHour: 20, powerBudgetKw: 7, portPowerKw: 7 },
  clustering: { targetHubId: 'metro', returnBias: 1 }
};
function input(scenario = 'metro') { return { scenario, hubIds: ['metro', 'library'], parameters: { ...parameters, ...extras[scenario] } }; }

test('all five scenarios produce reproducible persisted results without mutating a fixed snapshot or live inventory', async t => {
  const { module, db } = backendFixture(t);
  const snapshot = fixedSnapshot(), original = structuredClone(snapshot);
  const service = new SimulationService({ repository: module.rentalRepository, snapshotProvider: { capture: async () => snapshot } });
  const before = JSON.stringify(db.prepare('SELECT * FROM electric_vehicles ORDER BY id').all());
  for (const scenario of Object.keys(extras)) {
    const first = (await service.run('operator', input(scenario), scenario)).data;
    const second = (await service.run('operator', input(scenario), `${scenario}-repeat`)).data;
    assert.deepEqual(first.baselineMetrics, second.baselineMetrics);
    assert.deepEqual(first.projectedMetrics, second.projectedMetrics);
    assert.equal(first.status, 'Completed');
    assert.equal(first.modelVersion, 'demo-des-v1');
    assert.deepEqual(await service.getResult('another-operator', first.id), first);
    assert.ok(first.assumptions.length > 0);
  }
  assert.deepEqual(snapshot, original);
  assert.equal(JSON.stringify(db.prepare('SELECT * FROM electric_vehicles ORDER BY id').all()), before);
});

test('scenario parameters change the model and respect port power limits', async t => {
  const { module } = backendFixture(t);
  const service = new SimulationService({ repository: module.rentalRepository, snapshotProvider: { capture: async () => fixedSnapshot() } });
  const metro = (await service.run('operator', input(), 'metro')).data;
  assert.ok(metro.projectedMetrics.rentalRequests > metro.baselineMetrics.rentalRequests);
  const parking = (await service.run('operator', input('parking'), 'parking')).data;
  assert.ok(parking.projectedMetrics.hubs.every(hub => hub.peakOccupancyPercent === 100));
  const failed = (await service.run('operator', input('charging'), 'failed')).data;
  assert.ok(failed.projectedMetrics.hubs.every(hub => hub.peakConcurrentCharging === 0));
  assert.ok(failed.projectedMetrics.unservedChargingRequests > 0);
  const charging = (await service.run('operator', input('charging-demand'), 'demand')).data;
  assert.ok(charging.projectedMetrics.chargingRequests > charging.baselineMetrics.chargingRequests);
  assert.ok(charging.projectedMetrics.hubs.every(hub => hub.peakPowerKw <= 7));
});

test('invalid scenarios fail before capture or persistence; missing hubs and impossible port failures fail before saving', async t => {
  const { module, db } = backendFixture(t);
  let captures = 0;
  const service = new SimulationService({ repository: module.rentalRepository, snapshotProvider: { capture: async () => { captures++; return fixedSnapshot(); } } });
  const malformed = [
    { ...input(), scenario: 'unknown' }, { ...input(), hubIds: ['metro', 'metro'] },
    { ...input(), parameters: { ...input().parameters, durationMinutes: -1 } },
    { ...input(), parameters: { ...input().parameters, seed: '7' } },
    { ...input(), parameters: { ...input().parameters, undocumented: 1 } },
    { ...input(), parameters: { ...input().parameters, demandPerHour: 1000, durationMinutes: 240, demandMultiplier: 10 } }
  ];
  for (const value of malformed) await assert.rejects(service.run('operator', value, 'bad'), { code: 'INVALID_SCENARIO' });
  assert.equal(captures, 0);
  await assert.rejects(service.run('operator', { ...input(), hubIds: ['missing'] }, 'missing'), { code: 'HUB_NOT_FOUND' });
  await assert.rejects(service.run('operator', { ...input('charging'), parameters: { ...input('charging').parameters, failedPorts: 2 } }, 'ports'), { code: 'INVALID_SCENARIO' });
  assert.equal(db.prepare('SELECT count(*) AS n FROM simulation_results').get().n, 0);
});

test('simulation retries persist one result and reopen from stored data without recapturing live inventory', async t => {
  const { module, db } = backendFixture(t);
  let captures = 0;
  const service = new SimulationService({ repository: module.rentalRepository, snapshotProvider: { capture: async () => { captures++; return fixedSnapshot(); } } });
  const results = await Promise.all(Array.from({ length: 3 }, () => service.run('operator', input(), 'same')));
  assert.equal(captures, 1);
  assert.equal(new Set(results.map(result => result.data.id)).size, 1);
  const reopened = new SimulationService({ repository: module.rentalRepository, snapshotProvider: { capture: async () => { throw new Error('Offline'); } } });
  assert.deepEqual(await reopened.getResult('operator', results[0].data.id), results[0].data);
  assert.deepEqual(await reopened.run('operator', input(), 'same'), results[0]);
  await assert.rejects(reopened.run('operator', { ...input(), parameters: { ...input().parameters, seed: 9 } }, 'same'), { code: 'IDEMPOTENCY_KEY_REUSED' });
  assert.equal(db.prepare('SELECT count(*) AS n FROM simulation_results').get().n, 1);
  assert.throws(() => validateScenario({ ...input('clustering'), parameters: { ...input('clustering').parameters, targetHubId: 'missing' } }), { code: 'INVALID_SCENARIO' });
});

module.exports = { fixedSnapshot, simulationInput: input };
