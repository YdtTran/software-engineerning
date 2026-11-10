const { test } = require('node:test');
const assert = require('node:assert/strict');
const { backendFixture } = require('./fixtures/backend-fixture');

async function activeTrip(service) {
  const reservation = (await service.reserve('rider', { vehicleId: 'EB-024', hubId: 'metro' }, 'reserve')).data;
  return (await service.pickup('rider', reservation.id, { vehicleCode: 'EB-024' }, 'pickup')).data;
}
test('return and private-parking reservation compete for the same physical destination', async t => {
  const { service, inventory, db } = backendFixture(t);
  const trip = await activeTrip(service);
  const results = await Promise.allSettled([
    service.returnTrip('rider', trip.id, { hubId: 'bku', slotId: 'bku-A01', confirmed: true }, 'return'),
    inventory.holdSlotForReservation('bku-A01', 'private', { hubId: 'bku', pool: 'immediate', expiresAt: new Date(Date.now() + 600000).toISOString() })
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const slot = db.prepare("SELECT * FROM parking_slots WHERE id='bku-A01'").get();
  if (results[0].status === 'fulfilled') assert.equal(slot.parked_vehicle_id, trip.vehicleId);
  else { assert.equal(slot.reservation_id, 'private'); assert.equal((await service.getTrip('rider', trip.id)).status, 'Active'); }
});
test('return and Operations transfer cannot both consume the same destination capacity', async t => {
  const { service, operations, db } = backendFixture(t);
  const trip = await activeTrip(service);
  const results = await Promise.allSettled([
    service.returnTrip('rider', trip.id, { hubId: 'bku', slotId: 'bku-A01', confirmed: true }, 'return'),
    operations.transferService.createTransfer({ sourceHubId: 'metro', destinationHubId: 'bku', vehicleIds: ['EB-100'], destinationSlotIds: ['bku-A01'], createdBy: 'operator' })
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const slot = db.prepare("SELECT * FROM parking_slots WHERE id='bku-A01'").get();
  assert.ok(!(slot.parked_vehicle_id && slot.transfer_hold_id));
  if (results[1].status === 'fulfilled') assert.equal((await service.getTrip('rider', trip.id)).status, 'Active');
});
