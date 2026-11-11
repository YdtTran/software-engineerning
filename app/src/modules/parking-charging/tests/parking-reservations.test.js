const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createOperationsModule } = require('../../operations');
const { createParkingChargingModule } = require('../index');

const MIGRATIONS = [
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
];

function setupFixture({ nowFn = () => new Date() } = {}) {
  const db = new DatabaseSync(':memory:');
  const dbDir = path.resolve(__dirname, '../../../../db');
  for (const relPath of MIGRATIONS) {
    db.exec(fs.readFileSync(path.join(dbDir, relPath), 'utf8'));
  }
  db.exec('PRAGMA user_version = 12;');

  // Provision private vehicles for owner user-1 and owner user-2
  db.exec(`
    INSERT INTO electric_vehicles (id, hub_id, vehicle_type, battery_percent, status, owner_id, connector_type)
    VALUES
      ('PV-101', 'bku', 'electric_motorbike', 80, 'Available', 'user-1', 'type2'),
      ('PV-102', 'bku', 'electric_motorbike', 75, 'Available', 'user-2', 'type2'),
      ('PV-103', 'bku', 'electric_bicycle', 65, 'Available', 'user-1', 'ccs2');
  `);

  const ops = createOperationsModule({ db });
  const pc = createParkingChargingModule({
    client: ops.inventoryRepo.client,
    inventoryInterface: ops.inventoryInterface,
    incidentReporter: ops.incidentService,
    clock: nowFn
  });

  return { db, ops, pc };
}

function isoOffset(minutes, baseMs = Date.now()) {
  return new Date(baseMs + minutes * 60000).toISOString();
}

test('advance availability supports half-open adjacent intervals and rejects invalid ranges', async () => {
  const { db, pc } = setupFixture();
  const base = Date.now();
  const t1Start = isoOffset(60, base);
  const t1End = isoOffset(120, base);
  const adjStart = t1End;
  const adjEnd = isoOffset(180, base);
  const overlapStart = isoOffset(90, base);
  const overlapEnd = isoOffset(150, base);

  const actor = { id: 'user-1', role: 'customer' };
  const initialAvail = await pc.parkingService.getParkingAvailability({
    actor,
    hubId: 'bku',
    privateVehicleId: 'PV-101',
    pool: 'advance',
    plannedArrival: t1Start,
    plannedCheckout: t1End
  });
  assert.ok(initialAvail.availableSlots.length > 0);
  const targetSlot = initialAvail.availableSlots[0].id;

  const created = await pc.parkingService.createReservation({
    actor,
    vehicleId: 'PV-101',
    hubId: 'bku',
    pool: 'advance',
    slotId: targetSlot,
    plannedArrival: t1Start,
    plannedCheckout: t1End
  });
  assert.equal(created.status, 'Reserved');

  const adjAvail = await pc.parkingService.getParkingAvailability({
    actor,
    hubId: 'bku',
    pool: 'advance',
    plannedArrival: adjStart,
    plannedCheckout: adjEnd
  });
  assert.ok(adjAvail.availableSlots.some(s => s.id === targetSlot));

  const overlapAvail = await pc.parkingService.getParkingAvailability({
    actor,
    hubId: 'bku',
    pool: 'advance',
    plannedArrival: overlapStart,
    plannedCheckout: overlapEnd
  });
  assert.ok(!overlapAvail.availableSlots.some(s => s.id === targetSlot));

  await assert.rejects(
    pc.parkingService.getParkingAvailability({
      actor,
      hubId: 'bku',
      pool: 'advance',
      plannedArrival: t1End,
      plannedCheckout: t1Start
    }),
    { code: 'INVALID_INTERVAL', status: 422 }
  );

  db.close();
});

test('pool mismatch, unowned vehicle, shared vehicle, and 10-min cancel cutoff are enforced', async () => {
  const { db, pc } = setupFixture();
  const owner1 = { id: 'user-1', role: 'customer' };
  const owner2 = { id: 'user-2', role: 'customer' };

  const immSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'immediate' LIMIT 1").get().id;
  const advSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'advance' LIMIT 1").get().id;

  await assert.rejects(
    pc.parkingService.createReservation({
      actor: owner2,
      vehicleId: 'PV-101',
      hubId: 'bku',
      pool: 'immediate',
      slotId: immSlot
    }),
    { code: 'FORBIDDEN_OPERATION', status: 403 }
  );

  const sharedVehicleId = db.prepare("SELECT id FROM electric_vehicles WHERE owner_id IS NULL LIMIT 1").get().id;
  await assert.rejects(
    pc.parkingService.createReservation({
      actor: owner1,
      vehicleId: sharedVehicleId,
      hubId: 'bku',
      pool: 'immediate'
    }),
    { code: 'VEHICLE_NOT_ELIGIBLE', status: 422 }
  );

  await assert.rejects(
    pc.parkingService.createReservation({
      actor: owner1,
      vehicleId: 'PV-101',
      hubId: 'bku',
      pool: 'advance',
      slotId: immSlot,
      plannedArrival: isoOffset(30),
      plannedCheckout: isoOffset(90)
    }),
    { code: 'POOL_MISMATCH', status: 422 }
  );

  // Advance reservation inside 10-minute window cannot be cancelled
  const soonStart = isoOffset(5);
  const soonEnd = isoOffset(65);
  const resSoon = await pc.parkingService.createReservation({
    actor: owner1,
    vehicleId: 'PV-101',
    hubId: 'bku',
    pool: 'advance',
    slotId: advSlot,
    plannedArrival: soonStart,
    plannedCheckout: soonEnd
  });
  await assert.rejects(
    pc.parkingService.cancelReservation({ actor: owner1, reservationId: resSoon.id }),
    { code: 'CANCELLATION_WINDOW_CLOSED', status: 422 }
  );

  // Immediate reservation cancels cleanly and frees slot
  const resImm = await pc.parkingService.createReservation({
    actor: owner1,
    vehicleId: 'PV-101',
    hubId: 'bku',
    pool: 'immediate',
    slotId: immSlot
  });
  assert.equal(db.prepare('SELECT status FROM parking_slots WHERE id = ?').get(immSlot).status, 'Held');
  const cancelled = await pc.parkingService.cancelReservation({ actor: owner1, reservationId: resImm.id });
  assert.equal(cancelled.status, 'Cancelled');
  assert.equal(db.prepare('SELECT status FROM parking_slots WHERE id = ?').get(immSlot).status, 'Available');

  db.close();
});

test('verified check-in retries gate command up to 3x reusing same commandId and operator assistance records identity', async () => {
  const { db, pc } = setupFixture();
  const owner1 = { id: 'user-1', role: 'customer' };
  const operator = { id: 'op-1', role: 'operator' };

  const res = await pc.parkingService.createReservation({
    actor: owner1,
    vehicleId: 'PV-101',
    hubId: 'bku',
    pool: 'immediate'
  });

  // 3 timeouts -> 503 DEVICE_UNCONFIRMED, reservation stays Reserved
  pc.deviceAdapter.scriptOutcomes(res.slotId, 'verify_arrival', ['timeout', 'timeout', 'timeout']);
  await assert.rejects(
    pc.parkingService.checkInReservation({
      actor: operator,
      reservationId: res.id,
      hubId: 'bku',
      ticketCode: res.ticketCode
    }),
    { code: 'DEVICE_UNCONFIRMED', status: 503 }
  );
  const failedCmd = db.prepare('SELECT * FROM device_commands WHERE reference_id = ?').get(res.id);
  assert.equal(failedCmd.status, 'Failed');
  assert.equal(failedCmd.attempt_count, 3);
  assert.equal((await pc.parkingService.getReservation({ actor: owner1, reservationId: res.id })).status, 'Reserved');

  // Retry succeeds on 2nd attempt reusing the exact same commandId
  pc.deviceAdapter.scriptOutcomes(res.slotId, 'verify_arrival', ['timeout', 'ack']);
  const checkedIn = await pc.parkingService.checkInReservation({
    actor: operator,
    reservationId: res.id,
    hubId: 'bku',
    ticketCode: res.ticketCode
  });
  assert.equal(checkedIn.status, 'Fulfilled');
  assert.equal(checkedIn.assistedBy, 'op-1');

  const ackedCmd = db.prepare('SELECT * FROM device_commands WHERE reference_id = ?').get(res.id);
  assert.equal(ackedCmd.command_id, failedCmd.command_id);
  assert.equal(ackedCmd.status, 'Acked');
  assert.equal(ackedCmd.attempt_count, 2);

  // Early and expired check-in rejections on advance bookings
  const advSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'advance' LIMIT 1").get().id;
  const futureAdv = await pc.parkingService.createReservation({
    actor: owner1,
    vehicleId: 'PV-101',
    hubId: 'bku',
    pool: 'advance',
    slotId: advSlot,
    plannedArrival: isoOffset(30),
    plannedCheckout: isoOffset(90)
  });
  await assert.rejects(
    pc.parkingService.checkInReservation({
      actor: owner1,
      reservationId: futureAdv.id,
      hubId: 'bku',
      ticketCode: futureAdv.ticketCode
    }),
    { code: 'EARLY_CHECKIN', status: 422 }
  );
  await assert.rejects(
    pc.parkingService.checkInReservation({
      actor: owner1,
      reservationId: futureAdv.id,
      hubId: 'bku',
      ticketCode: 'PK-WRONG'
    }),
    { code: 'INVALID_INPUT', status: 422 }
  );
  db.prepare("UPDATE parking_reservations SET planned_arrival = ?, expires_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(isoOffset(-30), futureAdv.id);
  await assert.rejects(
    pc.parkingService.checkInReservation({
      actor: owner1,
      reservationId: futureAdv.id,
      hubId: 'bku',
      ticketCode: futureAdv.ticketCode
    }),
    { code: 'RESERVATION_EXPIRED', status: 422 }
  );

  db.close();
});

test('LIM-01 overstay returns 409 SLOT_OCCUPIED with alternatives and linked operator replacement', async () => {
  const { db, pc } = setupFixture();
  const owner1 = { id: 'user-1', role: 'customer' };
  const owner2 = { id: 'user-2', role: 'customer' };
  const operator = { id: 'op-1', role: 'operator' };

  const advSlots = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'advance' ORDER BY code ASC").all().map(r => r.id);
  assert.ok(advSlots.length >= 2);
  const slotA = advSlots[0];

  // Seed valid active overdue occupancy on slotA directly + future advance reservation res2 on slotA
  const res1Start = isoOffset(-90);
  const res1End = isoOffset(-30);
  db.prepare(`
    INSERT INTO parking_reservations (id, user_id, vehicle_id, hub_id, slot_id, pool, ticket_code, planned_arrival, planned_checkout, expires_at, status, created_at)
    VALUES ('res_overstay', 'user-1', 'PV-101', 'bku', ?, 'advance', 'PK-OVER1', ?, ?, ?, 'Fulfilled', ?)
  `).run(slotA, res1Start, res1End, res1End, res1Start);
  db.prepare(`
    INSERT INTO parking_commitments (reservation_id, slot_id, pool, starts_at, ends_at, expires_at, occupancy_id, status)
    VALUES ('res_overstay', ?, 'advance', ?, ?, ?, 'occ_overstay', 'Fulfilled')
  `).run(slotA, res1Start, res1End, res1End);
  db.prepare(`
    INSERT INTO parking_occupancies (id, reservation_id, user_id, vehicle_id, hub_id, slot_id, actual_checkin_at, scheduled_checkout_at, created_at)
    VALUES ('occ_overstay', 'res_overstay', 'user-1', 'PV-101', 'bku', ?, ?, ?, ?)
  `).run(slotA, res1Start, res1End, res1Start);
  db.prepare("UPDATE parking_slots SET status = 'Occupied', occupancy_id = 'occ_overstay', parked_vehicle_id = 'PV-101' WHERE id = ?").run(slotA);

  // Incoming advance reservation res2 (arrival already reached: simulate arrival window active via SQL update)
  const res2 = await pc.parkingService.createReservation({
    actor: owner2,
    vehicleId: 'PV-102',
    hubId: 'bku',
    pool: 'advance',
    slotId: slotA,
    plannedArrival: isoOffset(5),
    plannedCheckout: isoOffset(120)
  });
  const arriveNow = isoOffset(-1);
  db.prepare('UPDATE parking_reservations SET planned_arrival = ? WHERE id = ?').run(arriveNow, res2.id);
  db.prepare('UPDATE parking_commitments SET starts_at = ? WHERE reservation_id = ?').run(arriveNow, res2.id);

  let conflictErr;
  try {
    await pc.parkingService.checkInReservation({
      actor: owner2,
      reservationId: res2.id,
      hubId: 'bku',
      ticketCode: res2.ticketCode
    });
    assert.fail('Expected SLOT_OCCUPIED error');
  } catch (err) {
    conflictErr = err;
  }

  assert.equal(conflictErr.status, 409);
  assert.equal(conflictErr.code, 'SLOT_OCCUPIED');
  assert.equal(conflictErr.details.blockingOccupancyId, 'occ_overstay');
  assert.ok(conflictErr.details.sameHubAlternatives.length >= 1);
  assert.equal(conflictErr.details.escalated, false);

  // Existing overstaying occupancy and original reservation remain intact
  assert.equal(db.prepare('SELECT actual_checkout_at FROM parking_occupancies WHERE id = ?').get('occ_overstay').actual_checkout_at, null);
  assert.equal(db.prepare('SELECT status FROM parking_reservations WHERE id = ?').get(res2.id).status, 'Reserved');

  // Operator issues replacement reservation linked to conflicted reservation
  const altSlot = conflictErr.details.sameHubAlternatives[0].id;
  const resolved = await pc.parkingService.createReplacementReservation({
    actor: operator,
    conflictId: conflictErr.details.conflictId,
    slotId: altSlot
  });
  assert.equal(resolved.conflict.status, 'Resolved');
  assert.equal(resolved.originalReservation.id, res2.id);
  assert.equal(resolved.replacementReservation.replacesReservationId, res2.id);
  assert.equal(resolved.replacementReservation.assistedBy, 'op-1');
  assert.equal(resolved.replacementReservation.slotId, altSlot);

  db.close();
});

test('LIM-01 escalates to operations incident when no alternative slot exists at any hub', async () => {
  const { db, pc } = setupFixture();
  const owner2 = { id: 'user-2', role: 'customer' };

  const immSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'immediate' ORDER BY code ASC LIMIT 1").get().id;
  const res2 = await pc.parkingService.createReservation({
    actor: owner2,
    vehicleId: 'PV-102',
    hubId: 'bku',
    pool: 'immediate',
    slotId: immSlot
  });

  // Occupy all immediate slots across every hub so zero alternatives remain
  db.prepare(`
    UPDATE parking_slots
    SET status = 'Occupied', reservation_id = NULL, occupancy_id = 'occ_blocker_' || id
    WHERE pool = 'immediate'
  `).run();

  let err;
  try {
    await pc.parkingService.checkInReservation({
      actor: owner2,
      reservationId: res2.id,
      hubId: 'bku',
      ticketCode: res2.ticketCode
    });
  } catch (e) {
    err = e;
  }

  assert.equal(err.code, 'SLOT_OCCUPIED');
  assert.equal(err.details.sameHubAlternatives.length, 0);
  assert.equal(err.details.nearbyHubAlternatives.length, 0);
  assert.equal(err.details.escalated, true);
  assert.ok(err.details.incidentId);

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(err.details.incidentId);
  assert.equal(incident.resource_kind, 'slot');
  assert.equal(incident.resource_id, immSlot);
  assert.equal(incident.status, 'Open');

  db.close();
});

test('check-out enforces charging disconnection, queued confirmation, BR08b V07 fees, and null fee for immediate without schedule', async () => {
  const nowRef = { now: new Date() };
  const { db, pc } = setupFixture({ nowFn: () => nowRef.now });
  const owner1 = { id: 'user-1', role: 'customer' };

  // 1. Immediate checkout without scheduledCheckoutAt -> finalFee: null
  const immRes = await pc.parkingService.createReservation({
    actor: owner1,
    vehicleId: 'PV-101',
    hubId: 'bku',
    pool: 'immediate'
  });
  const immIn = await pc.parkingService.checkInReservation({
    actor: owner1,
    reservationId: immRes.id,
    hubId: 'bku',
    ticketCode: immRes.ticketCode
  });

  // Insert queued charging request blocking default checkout
  db.prepare(`
    INSERT INTO charging_requests (id, user_id, vehicle_id, occupancy_id, hub_id, battery_at_request, target_battery_percent, needed_by, status, created_at, updated_at)
    VALUES ('creq_1', 'user-1', 'PV-101', ?, 'bku', 50, 90, ?, 'Queued', ?, ?)
  `).run(immIn.occupancyId, isoOffset(60), isoOffset(0), isoOffset(0));

  await assert.rejects(
    pc.parkingService.checkOutOccupancy({ actor: owner1, occupancyId: immIn.occupancyId }),
    { code: 'CHARGING_REQUEST_QUEUED', status: 409 }
  );

  // Also test active allocation blocking checkout even with cancelQueuedCharging=true
  const pointId = db.prepare("SELECT id FROM charging_points WHERE hub_id = 'bku' LIMIT 1").get().id;
  db.prepare(`
    INSERT INTO charging_allocations (allocation_id, point_id, request_id, hub_id, allocated_power_kw, reserved_power_kw, start_at, end_at, state, created_at, released_at)
    VALUES ('alloc_block', ?, 'creq_1', 'bku', 7.4, 7.4, ?, ?, 'Charging', ?, NULL)
  `).run(pointId, isoOffset(0), isoOffset(60), isoOffset(0));
  await assert.rejects(
    pc.parkingService.checkOutOccupancy({ actor: owner1, occupancyId: immIn.occupancyId, cancelQueuedCharging: true }),
    { code: 'CHARGING_ACTIVE', status: 409 }
  );

  // Release allocation so only Queued request remains, then cancelQueuedCharging=true succeeds with finalFee: null
  db.prepare("UPDATE charging_allocations SET released_at = ?, allocated_power_kw = 0, state = 'Complete' WHERE allocation_id = 'alloc_block'").run(isoOffset(0));
  const immOut = await pc.parkingService.checkOutOccupancy({
    actor: owner1,
    occupancyId: immIn.occupancyId,
    cancelQueuedCharging: true
  });
  assert.ok(immOut.actualCheckoutAt);
  assert.equal(immOut.finalFee, null);
  assert.equal(db.prepare("SELECT status FROM charging_requests WHERE id = 'creq_1'").get().status, 'Cancelled');

  // 2. BR08b V07 exact boundaries: 15m overstay grace at 20000/hour -> 16m past scheduled = 20000, 76m = 40000
  const advSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'advance' LIMIT 1").get().id;
  const futureStart = isoOffset(300);
  const futureEnd = isoOffset(420);
  // Seed a later reservation on advSlot to verify checkout leaves future commitments intact
  db.prepare(`
    INSERT INTO parking_reservations (id, user_id, vehicle_id, hub_id, slot_id, pool, ticket_code, planned_arrival, planned_checkout, expires_at, status, created_at)
    VALUES ('res_future', 'user-2', 'PV-102', 'bku', ?, 'advance', 'PK-FUT1', ?, ?, ?, 'Reserved', ?)
  `).run(advSlot, futureStart, futureEnd, futureEnd, isoOffset(0));
  db.prepare(`
    INSERT INTO parking_commitments (reservation_id, slot_id, pool, starts_at, ends_at, expires_at, status)
    VALUES ('res_future', ?, 'advance', ?, ?, ?, 'Reserved')
  `).run(advSlot, futureStart, futureEnd, futureEnd);

  const occPastBase = Date.now();
  const sched10_00 = new Date(occPastBase).toISOString();
  db.prepare(`
    INSERT INTO parking_reservations (id, user_id, vehicle_id, hub_id, slot_id, pool, ticket_code, planned_arrival, planned_checkout, expires_at, status, created_at)
    VALUES ('res_v07', 'user-1', 'PV-101', 'bku', ?, 'advance', 'PK-V07A', ?, ?, ?, 'Fulfilled', ?)
  `).run(advSlot, new Date(occPastBase - 3600000).toISOString(), sched10_00, sched10_00, sched10_00);
  db.prepare(`
    INSERT INTO parking_commitments (reservation_id, slot_id, pool, starts_at, ends_at, expires_at, occupancy_id, status)
    VALUES ('res_v07', ?, 'advance', ?, ?, ?, 'occ_v07', 'Fulfilled')
  `).run(advSlot, new Date(occPastBase - 3600000).toISOString(), sched10_00, sched10_00);
  db.prepare(`
    INSERT INTO parking_occupancies (id, reservation_id, user_id, vehicle_id, hub_id, slot_id, actual_checkin_at, scheduled_checkout_at, created_at)
    VALUES ('occ_v07', 'res_v07', 'user-1', 'PV-101', 'bku', ?, ?, ?, ?)
  `).run(advSlot, new Date(occPastBase - 3600000).toISOString(), sched10_00, sched10_00);
  db.prepare("UPDATE parking_slots SET status = 'Occupied', occupancy_id = 'occ_v07', parked_vehicle_id = 'PV-101' WHERE id = ?").run(advSlot);

  // Set clock to +16 minutes (1 min past 15m grace -> 1 billable hour = 20000)
  nowRef.now = new Date(occPastBase + 16 * 60000);
  const outV07 = await pc.parkingService.checkOutOccupancy({ actor: owner1, occupancyId: 'occ_v07' });
  assert.equal(outV07.finalFee, 20000);
  assert.equal(db.prepare("SELECT status FROM parking_commitments WHERE reservation_id = 'res_future'").get().status, 'Reserved');
  assert.equal(db.prepare('SELECT status FROM parking_slots WHERE id = ?').get(advSlot).status, 'Available');

  db.close();
});

test('FR-NI01 expiry scan expires overdue holds without affecting active occupancies or future commitments', async () => {
  const { db, pc } = setupFixture();
  const owner1 = { id: 'user-1', role: 'customer' };
  const owner2 = { id: 'user-2', role: 'customer' };

  const immSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'immediate' LIMIT 1").get().id;
  const advSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND pool = 'advance' LIMIT 1").get().id;

  const resExp = await pc.parkingService.createReservation({
    actor: owner1,
    vehicleId: 'PV-101',
    hubId: 'bku',
    pool: 'immediate',
    slotId: immSlot
  });
  const resFuture = await pc.parkingService.createReservation({
    actor: owner2,
    vehicleId: 'PV-102',
    hubId: 'bku',
    pool: 'advance',
    slotId: advSlot,
    plannedArrival: isoOffset(60),
    plannedCheckout: isoOffset(120)
  });

  // Backdate resExp expiry to trigger FR-NI01 scan cleanly against SQLite wall-clock
  const pastIso = '2020-01-01T00:00:00.000Z';
  db.prepare('UPDATE parking_reservations SET expires_at = ? WHERE id = ?').run(pastIso, resExp.id);
  db.prepare('UPDATE parking_commitments SET expires_at = ? WHERE reservation_id = ?').run(pastIso, resExp.id);

  // Also add another overdue advance hold on advSlot while advSlot already has resFuture intact
  db.prepare(`
    INSERT INTO parking_reservations (id, user_id, vehicle_id, hub_id, slot_id, pool, ticket_code, planned_arrival, planned_checkout, expires_at, status, created_at)
    VALUES ('res_adv_exp', 'user-1', 'PV-103', 'bku', ?, 'advance', 'PK-ADVE', ?, ?, ?, 'Reserved', ?)
  `).run(advSlot, isoOffset(-40), isoOffset(30), pastIso, isoOffset(-40));
  db.prepare(`
    INSERT INTO parking_commitments (reservation_id, slot_id, pool, starts_at, ends_at, expires_at, status)
    VALUES ('res_adv_exp', ?, 'advance', ?, ?, ?, 'Reserved')
  `).run(advSlot, isoOffset(-40), isoOffset(30), pastIso);

  const scanResult = await pc.parkingService.runExpiryScan();
  assert.ok(scanResult.expiredReservationIds.includes(resExp.id));
  assert.ok(scanResult.expiredReservationIds.includes('res_adv_exp'));
  assert.ok(!scanResult.expiredReservationIds.includes(resFuture.id));

  assert.equal(db.prepare('SELECT status FROM parking_slots WHERE id = ?').get(immSlot).status, 'Available');
  assert.equal(db.prepare('SELECT status FROM parking_reservations WHERE id = ?').get(resExp.id).status, 'Expired');
  assert.equal(db.prepare('SELECT status FROM parking_reservations WHERE id = ?').get(resFuture.id).status, 'Reserved');
  assert.equal(db.prepare('SELECT status FROM parking_commitments WHERE reservation_id = ?').get(resFuture.id).status, 'Reserved');

  db.close();
});
