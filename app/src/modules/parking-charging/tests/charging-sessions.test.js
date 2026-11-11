const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { SQLiteClient } = require('../../operations/infrastructure/sqlite-client');
const { createOperationsModule } = require('../../operations');
const { createParkingChargingModule, createChargingGuard } = require('../index');

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

function setupFixture({ vehicleBattery = 35 } = {}) {
  const db = new DatabaseSync(':memory:');
  const dbDir = path.resolve(__dirname, '../../../../db');
  for (const relPath of MIGRATIONS) {
    db.exec(fs.readFileSync(path.join(dbDir, relPath), 'utf8'));
  }
  db.exec('PRAGMA user_version = 12;');

  db.prepare(`
    INSERT INTO electric_vehicles (id, hub_id, vehicle_type, battery_percent, status, owner_id, connector_type)
    VALUES
      ('PV-201', 'bku', 'electric_motorbike', ?, 'Available', 'user-1', 'type2'),
      ('PV-202', 'bku', 'electric_motorbike', 40, 'Available', 'user-2', 'type2');
  `).run(vehicleBattery);

  const client = new SQLiteClient(db);
  const chargingGuard = createChargingGuard(client);
  const ops = createOperationsModule({ client, chargingGuard });
  const pc = createParkingChargingModule({
    client,
    inventoryInterface: ops.inventoryInterface,
    incidentReporter: ops.incidentService,
    chargingGuard
  });

  return { db, client, ops, pc, chargingGuard };
}

async function createParkedOccupancy(pc, actor, vehicleId = 'PV-201', hubId = 'bku') {
  const res = await pc.parkingService.createReservation({
    actor,
    vehicleId,
    hubId,
    pool: 'immediate'
  });
  return pc.parkingService.checkInReservation({
    actor,
    reservationId: res.id,
    hubId,
    ticketCode: res.ticketCode
  });
}

let allocSeq = 0;
async function seedReservedAllocation(pc, ops, { requestId, pointId, hubId = 'bku', powerKw = 7.4 }) {
  allocSeq += 1;
  const now = new Date();
  const alloc = await pc.chargingRepo.insertAllocation({
    allocationId: `alloc_${requestId}_${allocSeq}`,
    pointId,
    requestId,
    hubId,
    startAt: now.toISOString(),
    endAt: new Date(now.getTime() + 3600000).toISOString(),
    allocatedPowerKw: powerKw,
    reservedPowerKw: powerKw,
    state: 'Reserved',
    createdAt: now.toISOString(),
    releasedAt: null
  });
  await ops.inventoryInterface.updateChargingPointStatus(pointId, 'Reserved');
  return alloc;
}

test('UC07 charging request validation, queueing, unowned rejection, and pre-connection cancel', async () => {
  const { db, ops, pc } = setupFixture({ vehicleBattery: 35 });
  const owner1 = { id: 'user-1', role: 'customer' };
  const owner2 = { id: 'user-2', role: 'customer' };

  const occ = await createParkedOccupancy(pc, owner1);

  await assert.rejects(
    pc.chargingService.submitChargingRequest({ actor: owner2, occupancyId: occ.occupancyId, targetBatteryPercent: 80 }),
    { code: 'FORBIDDEN_OPERATION', status: 403 }
  );
  await assert.rejects(
    pc.chargingService.submitChargingRequest({ actor: owner1, occupancyId: occ.occupancyId, targetBatteryPercent: 35 }),
    { code: 'INVALID_BATTERY_TARGET', status: 422 }
  );
  await assert.rejects(
    pc.chargingService.submitChargingRequest({ actor: owner1, occupancyId: occ.occupancyId, targetBatteryPercent: 101 }),
    { code: 'INVALID_BATTERY_TARGET', status: 422 }
  );

  const req = await pc.chargingService.submitChargingRequest({
    actor: owner1,
    occupancyId: occ.occupancyId,
    targetBatteryPercent: 80
  });
  assert.equal(req.status, 'Queued');
  assert.equal(req.sessionId, null);

  // Reserve a port without energizing yet, then cancel -> clears hold and keeps parking occupancy intact
  const pointId = db.prepare("SELECT id FROM charging_points WHERE hub_id = 'bku' ORDER BY code ASC LIMIT 1").get().id;
  await seedReservedAllocation(pc, ops, { requestId: req.id, pointId });

  const cancelled = await pc.chargingService.cancelChargingRequest({ actor: owner1, requestId: req.id });
  assert.equal(cancelled.status, 'Cancelled');
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointId).status, 'Available');
  assert.equal((await pc.parkingService.getOccupancy({ actor: owner1, occupancyId: occ.occupancyId })).actualCheckoutAt, null);

  db.close();
});

test('activation retries power_on up to 3x with shared commandId and quarantines on 3 failures', async () => {
  const { db, ops, pc } = setupFixture({ vehicleBattery: 30 });
  const owner1 = { id: 'user-1', role: 'customer' };
  const operator = { id: 'op-1', role: 'operator' };

  const occ = await createParkedOccupancy(pc, owner1);
  const points = db.prepare("SELECT id FROM charging_points WHERE hub_id = 'bku' ORDER BY code ASC").all().map(r => r.id);
  const pointA = points[0];
  const pointB = points[1];

  // Case 1: Succeeds on 3rd attempt reusing identical command_id
  const req1 = await pc.chargingService.submitChargingRequest({
    actor: owner1,
    occupancyId: occ.occupancyId,
    targetBatteryPercent: 80
  });
  const alloc1 = await seedReservedAllocation(pc, ops, { requestId: req1.id, pointId: pointA });
  pc.deviceAdapter.scriptOutcomes(pointA, 'power_on', ['timeout', 'timeout', 'ack']);

  const session = await pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc1.allocationId });
  assert.equal(session.status, 'Active');
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointA).status, 'Charging');

  const cmd = db.prepare('SELECT * FROM device_commands WHERE reference_id = ?').get(req1.id);
  assert.equal(cmd.status, 'Acked');
  assert.equal(cmd.attempt_count, 3);

  // Pre-connection cancel rejected once session is Active
  await assert.rejects(
    pc.chargingService.cancelChargingRequest({ actor: owner1, requestId: req1.id }),
    { code: 'CHARGING_ACTIVE', status: 409 }
  );

  // Case 2: 3 timeouts isolate pointB to Fault + FaultUncertain + incident with zero Active session
  const occ2 = await createParkedOccupancy(pc, { id: 'user-2', role: 'customer' }, 'PV-202');
  const req2 = await pc.chargingService.submitChargingRequest({
    actor: { id: 'user-2', role: 'customer' },
    occupancyId: occ2.occupancyId,
    targetBatteryPercent: 85
  });
  const alloc2 = await seedReservedAllocation(pc, ops, { requestId: req2.id, pointId: pointB, powerKw: 7.4 });
  pc.deviceAdapter.scriptOutcomes(pointB, 'power_on', ['timeout', 'timeout', 'timeout']);

  await assert.rejects(
    pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc2.allocationId }),
    { code: 'DEVICE_UNCONFIRMED', status: 503 }
  );
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointB).status, 'Fault');
  const uncertainAlloc = await pc.chargingRepo.getAllocationById(alloc2.allocationId);
  assert.equal(uncertainAlloc.state, 'FaultUncertain');
  assert.equal(uncertainAlloc.releasedAt, null);
  assert.equal(uncertainAlloc.allocatedPowerKw, 7.4);
  assert.equal(await pc.chargingRepo.getActiveSessionByPoint(pointB), undefined);
  assert.equal(await pc.chargingRepo.hasUnresolvedIncident('charging_point', pointB), true);

  db.close();
});

test('UC07A UserStop, TargetReached, PriorityYield, unconfirmed power-off quarantine, and unplug separation', async () => {
  const { db, ops, pc } = setupFixture({ vehicleBattery: 40 });
  const owner1 = { id: 'user-1', role: 'customer' };
  const owner2 = { id: 'user-2', role: 'customer' };
  const operator = { id: 'op-1', role: 'operator' };

  const points = db.prepare("SELECT id FROM charging_points WHERE hub_id = 'bku' ORDER BY code ASC").all().map(r => r.id);
  const pointA = points[0];
  const pointB = points[1];

  // 1. UserStop early below target -> Interrupted/UserStop, request Cancelled, point Complete until confirmUnplug
  const occ1 = await createParkedOccupancy(pc, owner1, 'PV-201');
  const req1 = await pc.chargingService.submitChargingRequest({
    actor: owner1,
    occupancyId: occ1.occupancyId,
    targetBatteryPercent: 90
  });
  const alloc1 = await seedReservedAllocation(pc, ops, { requestId: req1.id, pointId: pointA });
  const s1 = await pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc1.allocationId });

  pc.deviceAdapter.setBatteryReading('PV-201', 55);
  const stopped1 = await pc.chargingService.stopSession({ actor: owner1, sessionId: s1.id, stopReason: 'UserStop' });
  assert.equal(stopped1.status, 'Interrupted');
  assert.equal(stopped1.stopReason, 'UserStop');
  assert.equal(stopped1.requestStatus, 'Cancelled');
  assert.equal(stopped1.connectorReleased, false);
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointA).status, 'Complete');
  assert.equal((await pc.chargingRepo.getAllocationById(alloc1.allocationId)).allocatedPowerKw, 0);

  // Parking checkout still blocked until unplug
  await assert.rejects(
    pc.parkingService.checkOutOccupancy({ actor: owner1, occupancyId: occ1.occupancyId }),
    { code: 'CHARGING_ACTIVE', status: 409 }
  );

  // Unplug releases point to Available while keeping occupancy Parked
  const unplugged = await pc.chargingService.confirmUnplug({ actor: owner1, pointId: pointA });
  assert.equal(unplugged.status, 'Available');
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointA).status, 'Available');
  assert.equal((await pc.parkingService.getOccupancy({ actor: owner1, occupancyId: occ1.occupancyId })).actualCheckoutAt, null);

  // 2. TargetReached via telemetry progress -> Completed / request Completed
  const req1b = await pc.chargingService.submitChargingRequest({
    actor: owner1,
    occupancyId: occ1.occupancyId,
    targetBatteryPercent: 80
  });
  const alloc1b = await seedReservedAllocation(pc, ops, { requestId: req1b.id, pointId: pointA });
  const s1b = await pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc1b.allocationId });
  const done1b = await pc.chargingService.reportChargingProgress({ actor: operator, sessionId: s1b.id, batteryPercent: 82 });
  assert.equal(done1b.status, 'Completed');
  assert.equal(done1b.stopReason, 'TargetReached');
  assert.equal(done1b.requestStatus, 'Completed');
  await pc.chargingService.confirmUnplug({ actor: owner1, pointId: pointA });

  // 3. PriorityYield returns request to Queued, then unconfirmed power_off on retry quarantines point
  const occ2 = await createParkedOccupancy(pc, owner2, 'PV-202');
  const req2 = await pc.chargingService.submitChargingRequest({
    actor: owner2,
    occupancyId: occ2.occupancyId,
    targetBatteryPercent: 95
  });
  const alloc2 = await seedReservedAllocation(pc, ops, { requestId: req2.id, pointId: pointB, powerKw: 7.4 });
  const s2 = await pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc2.allocationId });

  pc.deviceAdapter.setBatteryReading('PV-202', 82);
  const yielded = await pc.chargingService.stopSession({ actor: operator, sessionId: s2.id, stopReason: 'PriorityYield' });
  assert.equal(yielded.status, 'Interrupted');
  assert.equal(yielded.stopReason, 'PriorityYield');
  assert.equal(yielded.requestStatus, 'Queued');
  await pc.chargingService.confirmUnplug({ actor: owner2, pointId: pointB });

  // Activate again then fail power_off 3x -> 503 DEVICE_UNCONFIRMED, point Fault, FaultUncertain retains 7.4 kW
  const alloc2b = await seedReservedAllocation(pc, ops, { requestId: req2.id, pointId: pointB, powerKw: 7.4 });
  const s2b = await pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc2b.allocationId });
  pc.deviceAdapter.scriptOutcomes(pointB, 'power_off', ['timeout', 'timeout', 'timeout']);
  await assert.rejects(
    pc.chargingService.stopSession({ actor: owner2, sessionId: s2b.id, stopReason: 'UserStop' }),
    { code: 'DEVICE_UNCONFIRMED', status: 503 }
  );
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointB).status, 'Fault');
  assert.equal((await pc.chargingRepo.getAllocationById(alloc2b.allocationId)).state, 'FaultUncertain');
  assert.equal((await pc.chargingRepo.getAllocationById(alloc2b.allocationId)).allocatedPowerKw, 7.4);

  db.close();
});

test('chargingGuard enforces SC02 transitions and gates Fault -> Repair -> Available reactivation', async () => {
  const { db, ops, pc } = setupFixture({ vehicleBattery: 30 });
  const owner1 = { id: 'user-1', role: 'customer' };
  const operator = { id: 'op-1', role: 'operator' };

  const pointId = db.prepare("SELECT id FROM charging_points WHERE hub_id = 'bku' ORDER BY code ASC LIMIT 1").get().id;

  // Cannot skip directly Available -> Reserved via Operations without an allocation
  await assert.rejects(
    ops.inventoryInterface.updateChargingPointStatus(pointId, 'Reserved'),
    { code: 'INVALID_STATE_TRANSITION' }
  );

  // Activate + stop session (leaving point Complete with unreleased connector)
  const occ = await createParkedOccupancy(pc, owner1);
  const req = await pc.chargingService.submitChargingRequest({
    actor: owner1,
    occupancyId: occ.occupancyId,
    targetBatteryPercent: 80
  });
  const alloc = await seedReservedAllocation(pc, ops, { requestId: req.id, pointId });
  const session = await pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc.allocationId });
  await pc.chargingService.stopSession({ actor: owner1, sessionId: session.id, stopReason: 'UserStop' });

  // Operations cannot mark Complete -> Available while allocation / unplug confirmation are missing
  await assert.rejects(
    ops.inventoryInterface.updateChargingPointStatus(pointId, 'Available'),
    { code: 'ALLOCATION_CONFLICT' }
  );

  // Cleanly unplug and Fault the point via Operations incident
  await pc.chargingService.confirmUnplug({ actor: owner1, pointId });
  const inc = await ops.incidentService.reportEquipmentIncident({
    reporterId: 'op-1',
    reporterRole: 'Operator',
    resourceKind: 'charging_point',
    resourceId: pointId,
    description: 'Charger connector latch fault'
  });
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointId).status, 'Fault');

  // Fault -> Repair succeeds when no session is Active
  await ops.inventoryInterface.updateChargingPointStatus(pointId, 'Repair');

  // Repair -> Available blocked while incident still open
  await assert.rejects(
    ops.inventoryInterface.updateChargingPointStatus(pointId, 'Available'),
    { code: 'POINT_UNAVAILABLE' }
  );

  // Resolve incident directly (matching Operations lifecycle) -> still blocked without safety_check device ACK
  db.prepare("UPDATE incidents SET status = 'Resolved' WHERE id = ?").run(inc.id);
  await assert.rejects(
    ops.inventoryInterface.updateChargingPointStatus(pointId, 'Available'),
    { code: 'INVALID_STATE_TRANSITION' }
  );

  // Run confirmed device safety check -> Repair -> Available succeeds once and consumes ACK
  await pc.chargingService.runPointSafetyCheck({ actor: operator, pointId });
  await ops.inventoryInterface.updateChargingPointStatus(pointId, 'Available');
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointId).status, 'Available');

  db.close();
});
