const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { SQLiteClient } = require('../../operations/infrastructure/sqlite-client');
const {
  ParkingChargingError,
  forbidden,
  conflict,
  unprocessable,
  deviceUnconfirmed,
  mapErrorToHttpStatus
} = require('../domain/errors');
const { SimulatedDeviceAdapter } = require('../infrastructure/simulated-device-adapter');
const { createParkingChargingModule } = require('../index');

test('domain errors expose exact HTTP statuses and envelopes', () => {
  assert.equal(mapErrorToHttpStatus(forbidden()), 403);
  assert.equal(mapErrorToHttpStatus(conflict('SLOT_OCCUPIED', 'Blocked')), 409);
  assert.equal(mapErrorToHttpStatus(unprocessable('POOL_MISMATCH', 'Wrong pool')), 422);
  assert.equal(mapErrorToHttpStatus(deviceUnconfirmed()), 503);
  assert.equal(mapErrorToHttpStatus(new ParkingChargingError(404, 'CUSTOM', 'Missing')), 404);
  assert.equal(mapErrorToHttpStatus({ code: 'SLOT_UNAVAILABLE' }), 409);
  assert.equal(mapErrorToHttpStatus(new Error('boom')), 500);
});

test('SimulatedDeviceAdapter handles deterministic ack, scripted retry timeout, and faults', async () => {
  const adapter = new SimulatedDeviceAdapter();

  const arrival = await adapter.verifyArrival({ hubId: 'metro', slotId: 'metro-A01', reservationId: 'r1', vehicleId: 'pv-1', commandId: 'cmd-arr' });
  assert.equal(arrival.confirmed, true);
  assert.equal(arrival.faulted, false);
  assert.equal(arrival.commandId, 'cmd-arr');

  // Script 2 timeouts followed by ACK with preserved commandId
  adapter.scriptOutcomes('metro-C01', 'power_on', ['timeout', 'timeout', 'ack']);
  const results = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    results.push(await adapter.powerOn({ pointId: 'metro-C01', requestId: 'req-1', powerKw: 7.4, commandId: 'cmd-on-1', attempt }));
  }
  assert.deepEqual(results.map(r => r.confirmed), [false, false, true]);
  assert.equal(results[0].code, 'TIMEOUT');
  assert.equal(adapter.getHistory('metro-C01', 'power_on').length, 3);
  assert.ok(adapter.getHistory('metro-C01', 'power_on').every(h => h.commandId === 'cmd-on-1'));

  // Sticky fault isolation
  adapter.scriptOutcomes('metro-C02', 'power_off', ['fault']);
  const firstFault = await adapter.powerOff({ pointId: 'metro-C02', sessionId: 's1', requestId: 'req-2', commandId: 'cmd-off-1', attempt: 1 });
  assert.equal(firstFault.confirmed, false);
  assert.equal(firstFault.faulted, true);
  assert.equal(firstFault.code, 'HARDWARE_FAULT');

  const subsequent = await adapter.unplug({ pointId: 'metro-C02', allocationId: 'a1', requestId: 'req-2', commandId: 'cmd-unplug-1' });
  assert.equal(subsequent.confirmed, false);
  assert.equal(subsequent.faulted, true);

  adapter.setFaulted('metro-C02', false);
  const recovered = await adapter.verifyPointSafety({ pointId: 'metro-C02', commandId: 'cmd-safe-1' });
  assert.equal(recovered.confirmed, true);
});

test('module scaffold shares the provided SQLiteClient instance', async () => {
  const db = new DatabaseSync(':memory:');
  const base = path.resolve(__dirname, '../../../../db');
  for (const f of [
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
  ]) {
    db.exec(fs.readFileSync(path.join(base, f), 'utf8'));
  }
  const sharedClient = new SQLiteClient(db);
  const mod = createParkingChargingModule({ client: sharedClient });
  assert.equal(mod.client, sharedClient);
  const hub = await mod.parkingRepo.getHubById('metro');
  assert.equal(hub.powerLimitKw, 22.0);
  assert.equal(hub.immediateHoldTtlMinutes, 15);
  db.close();
});
