const { test } = require('node:test');
const assert = require('node:assert/strict');
const { backendFixture } = require('./fixtures/backend-fixture');
const { createMobilitySimulationModule } = require('../index');

const reserveInput = { vehicleId: 'EB-024', hubId: 'metro' };
const returnInput = { hubId: 'bku', slotId: 'bku-A01', confirmed: true };
async function startTrip(service, actor = 'rider', vehicleId = 'EB-024') {
  const reservation = (await service.reserve(actor, { vehicleId, hubId: 'metro' }, `reserve-${vehicleId}`)).data;
  return (await service.pickup(actor, reservation.id, { vehicleCode: vehicleId }, `pickup-${vehicleId}`)).data;
}

test('reservation contention has one winner; outcomes survive module recreation', async t => {
  const { service, client, inventory, db, device } = backendFixture(t);
  const attempts = await Promise.allSettled([
    service.reserve('a', reserveInput, 'a'), service.reserve('b', reserveInput, 'b')
  ]);
  assert.equal(attempts.filter(attempt => attempt.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(attempt => attempt.status === 'rejected').reason.code, 'VEHICLE_NOT_AVAILABLE');
  const winner = attempts[0].status === 'fulfilled' ? 'a' : 'b';
  const result = attempts.find(attempt => attempt.status === 'fulfilled').value;
  const restarted = createMobilitySimulationModule({ client, inventory, device }).rentalService;
  assert.deepEqual(await restarted.reserve(winner, { hubId: 'metro', vehicleId: 'EB-024' }, winner), result);
  await assert.rejects(restarted.reserve(winner, { vehicleId: 'EM-012', hubId: 'metro' }, winner), { code: 'IDEMPOTENCY_KEY_REUSED' });
  assert.equal(db.prepare('SELECT count(*) AS n FROM vehicle_reservations').get().n, 1);
  assert.equal(new Date(result.data.expiresAt) - new Date(result.data.createdAt) <= 900000, true);
});

test('reservation and inventory roll back together when persistence fails', async t => {
  const { service, db } = backendFixture(t);
  db.exec("CREATE TRIGGER reject_reservation BEFORE INSERT ON vehicle_reservations BEGIN SELECT RAISE(ABORT, 'fixture'); END");
  await assert.rejects(service.reserve('rider', reserveInput, 'reserve'));
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status, 'Available');
  assert.equal(db.prepare('SELECT count(*) AS n FROM mobility_outcomes').get().n, 0);
});

test('wrong codes, expired tickets and other users cannot start a trip', async t => {
  const { service, db } = backendFixture(t);
  const reservation = (await service.reserve('rider', reserveInput, 'reserve')).data;
  await assert.rejects(service.getReservation('other', reservation.id), { code: 'FORBIDDEN_OPERATION' });
  await assert.rejects(service.pickup('other', reservation.id, { vehicleCode: 'EB-024' }, 'forged'), { code: 'FORBIDDEN_OPERATION' });
  await assert.rejects(service.pickup('rider', reservation.id, { vehicleCode: 'EM-012' }, 'wrong'), { code: 'VEHICLE_CODE_MISMATCH' });
  assert.equal((await service.getReservation('rider', reservation.id)).status, 'Reserved');
  db.exec("UPDATE vehicle_reservations SET expires_at='2000-01-01T00:00:00.000Z'; UPDATE electric_vehicles SET reservation_expires_at='2000-01-01T00:00:00.000Z' WHERE id='EB-024'");
  await assert.rejects(service.pickup('rider', reservation.id, { vehicleCode: 'EB-024' }, 'expired'), { code: 'RESERVATION_EXPIRED' });
  assert.equal((await service.getReservation('rider', reservation.id)).status, 'Expired');
  assert.equal(db.prepare('SELECT count(*) AS n FROM mobility_trips').get().n, 0);
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status, 'Available');
  assert.equal(db.prepare("SELECT count(*) AS n FROM mobility_events WHERE kind='ReservationExpired'").get().n, 1);
});

test('pickup and cancellation compete; pickup creates one trip and vacates its source slot', async t => {
  const { service, db } = backendFixture(t);
  db.exec("UPDATE parking_slots SET status='Occupied', parked_vehicle_id='EB-024', occupancy_id='old-trip' WHERE id='metro-A01'");
  const reservation = (await service.reserve('rider', reserveInput, 'reserve')).data;
  const results = await Promise.allSettled([
    service.pickup('rider', reservation.id, { vehicleCode: 'EB-024' }, 'pickup'),
    service.cancel('rider', reservation.id, {}, 'cancel')
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  if (results[0].status === 'fulfilled') {
    const trip = results[0].value.data;
    const replay = await service.pickup('rider', reservation.id, { vehicleCode: 'EB-024' }, 'pickup');
    assert.equal(replay.data.id, trip.id);
    assert.equal(db.prepare('SELECT count(*) AS n FROM mobility_trips').get().n, 1);
    assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='metro-A01'").get().status, 'Available');
  } else {
    assert.equal((await service.getReservation('rider', reservation.id)).status, 'Cancelled');
    assert.equal(db.prepare('SELECT count(*) AS n FROM mobility_trips').get().n, 0);
  }
});

test('unconfirmed pickup uses three durable attempts, retains its claim and can reconcile after restart', async t => {
  let calls = 0, lastCommand;
  const device = { execute: async command => { calls++; lastCommand = command; return null; } };
  const { service, client, inventory, db } = backendFixture(t, { device });
  const reservation = (await service.reserve('rider', reserveInput, 'reserve')).data;
  await assert.rejects(service.pickup('rider', reservation.id, { vehicleCode: 'EB-024' }, 'pickup'), { code: 'DEVICE_UNCONFIRMED' });
  assert.equal(calls, 3);
  assert.equal(db.prepare("SELECT pickup_claimed FROM electric_vehicles WHERE id='EB-024'").get().pickup_claimed, 1);
  db.exec("UPDATE vehicle_reservations SET expires_at='2000-01-01T00:00:00Z'");
  assert.equal(await service.expireReservations(), 0);
  await assert.rejects(service.cancel('rider', reservation.id, {}, 'cancel'), { code: 'RESERVATION_CONFLICT' });
  const restarted = createMobilitySimulationModule({ client, inventory, device: {
    inspect: async command => ({ commandId: command.id, vehicleId: command.vehicleId, hubId: command.hubId, unlocked: true }),
    execute: async () => { throw new Error('Must not send an extra unlock'); }
  } }).rentalService;
  const trip = (await restarted.pickup('rider', reservation.id, { vehicleCode: 'EB-024' }, 'pickup')).data;
  assert.equal(trip.status, 'Active');
  assert.equal(db.prepare('SELECT id FROM mobility_commands').get().id, lastCommand.id);
  assert.equal(db.prepare('SELECT attempts FROM mobility_commands').get().attempts, 3);
});

test('same-command concurrency shares one device execution outside the SQLite transaction', async t => {
  let calls = 0;
  const fixture = backendFixture(t);
  fixture.service.device = { execute: async command => {
    calls++;
    assert.ok(!fixture.client.context.getStore()?.active);
    await new Promise(resolve => setTimeout(resolve, 5));
    return fixture.device.execute(command);
  } };
  const reservation = (await fixture.service.reserve('rider', reserveInput, 'reserve')).data;
  const results = await Promise.all(Array.from({ length: 4 }, () => fixture.service.pickup('rider', reservation.id, { vehicleCode: 'EB-024' }, 'pickup')));
  assert.equal(calls, 1);
  assert.equal(new Set(results.map(result => result.data.id)).size, 1);
});

test('return and replay close one trip and consume exactly one destination slot', async t => {
  const { service, db } = backendFixture(t);
  const trip = await startTrip(service);
  await assert.rejects(service.returnTrip('other', trip.id, returnInput, 'other'), { code: 'FORBIDDEN_OPERATION' });
  await assert.rejects(service.returnTrip('rider', trip.id, { ...returnInput, confirmed: false }, 'not-confirmed'), { code: 'RETURN_NOT_CONFIRMED' });
  const results = await Promise.all(Array.from({ length: 3 }, () => service.returnTrip('rider', trip.id, returnInput, 'return')));
  assert.ok(results.every(result => result.data.status === 'Completed'));
  assert.deepEqual(await service.returnTrip('rider', trip.id, returnInput, 'return'), results[0]);
  assert.equal((await service.returnTrip('rider', trip.id, returnInput, 'another-retry')).data.id, trip.id);
  assert.equal(db.prepare('SELECT count(*) AS n FROM parking_slots WHERE parked_vehicle_id=?').get(trip.vehicleId).n, 1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM mobility_trips').get().n, 1);
  assert.equal(results[0].data.distance, null);
});

test('unconfirmed return preserves the active trip and capacity claim', async t => {
  const { service, db, device } = backendFixture(t);
  const trip = await startTrip(service);
  service.device = { execute: async command => ({ commandId: 'wrong', ...command, locked: false }) };
  await assert.rejects(service.returnTrip('rider', trip.id, returnInput, 'return'), { code: 'DEVICE_UNCONFIRMED' });
  assert.equal((await service.getTrip('rider', trip.id)).status, 'Active');
  assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status, 'Held');
  await assert.rejects(service.returnTrip('rider', trip.id, { ...returnInput, slotId: 'bku-A02' }, 'new-slot'), { code: 'RETURN_PENDING' });
  service.device = { inspect: command => device.execute(command) };
  assert.equal((await service.returnTrip('rider', trip.id, returnInput, 'return')).data.status, 'Completed');
});

test('failed return persistence rolls back inventory but preserves confirmed device evidence', async t => {
  const { service, db } = backendFixture(t);
  const trip = await startTrip(service);
  db.exec("CREATE TRIGGER reject_close BEFORE UPDATE ON mobility_trips WHEN NEW.status='Completed' BEGIN SELECT RAISE(ABORT,'fixture'); END");
  await assert.rejects(service.returnTrip('rider', trip.id, returnInput, 'return'));
  assert.equal((await service.getTrip('rider', trip.id)).status, 'Active');
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status, 'InUse');
  assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status, 'Held');
  db.exec('DROP TRIGGER reject_close');
  service.device = null;
  assert.equal((await service.returnTrip('rider', trip.id, returnInput, 'return')).data.status, 'Completed');
});

test('return competes with private parking and transfer holds; future commitments are preserved', async t => {
  const { service, inventory, db } = backendFixture(t);
  const trip = await startTrip(service);
  await inventory.holdSlotForReservation('bku-A01', 'private', { hubId: 'bku', pool: 'immediate', expiresAt: new Date(Date.now() + 600000).toISOString() });
  await assert.rejects(service.returnTrip('rider', trip.id, returnInput, 'held'), { code: 'SLOT_UNAVAILABLE' });
  assert.equal((await service.getTrip('rider', trip.id)).status, 'Active');
  assert.equal(db.prepare("SELECT reservation_id FROM parking_slots WHERE id='bku-A01'").get().reservation_id, 'private');
  await inventory.releaseSlotHold('bku-A01', 'private');
  await inventory.holdSlotForReservation('bku-A01', 'future', { hubId: 'bku', pool: 'immediate', expiresAt: new Date(Date.now() + 600000).toISOString() });
  db.exec("UPDATE parking_commitments SET starts_at='2099-01-01T00:00:00Z',ends_at='2099-01-02T00:00:00Z',expires_at='2099-01-01T01:00:00Z'; UPDATE parking_slots SET status='Available',reservation_id=NULL WHERE id='bku-A01'");
  await assert.rejects(service.returnTrip('rider', trip.id, returnInput, 'future'), { code: 'SLOT_UNAVAILABLE' });
});

test('low-battery returns are classified by Operations and cannot be rented immediately', async t => {
  const { service, inventory, device } = backendFixture(t);
  const trip = await startTrip(service);
  service.device = { execute: async command => ({ ...await device.execute(command), batteryPercent: 12 }) };
  const result = await service.returnTrip('rider', trip.id, returnInput, 'return');
  assert.equal(result.data.batteryPercent, 12);
  assert.ok(!(await inventory.getAvailableVehicles('bku')).some(vehicle => vehicle.id === trip.vehicleId));
});
