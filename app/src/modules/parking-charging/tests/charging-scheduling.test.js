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

function setupFixture({ hubPowerLimitKw = 17.0, pointRatedKw = 11.0 } = {}) {
  const db = new DatabaseSync(':memory:');
  const dbDir = path.resolve(__dirname, '../../../../db');
  for (const relPath of MIGRATIONS) {
    db.exec(fs.readFileSync(path.join(dbDir, relPath), 'utf8'));
  }
  db.exec('PRAGMA user_version = 12;');

  // Set BR15 example limit (e.g., 0.85 * 20kW = 17.0 kW) and higher per-point rating on bku
  db.prepare('UPDATE mobility_hubs SET power_limit_kw = ? WHERE id = ?').run(hubPowerLimitKw, 'bku');
  db.prepare("UPDATE charging_points SET rated_power_kw = ?, connector_type = 'type2' WHERE hub_id = 'bku'").run(pointRatedKw);

  // Add one extra compatible type2 port (bku-CP03) and one fast ccs2 port (bku-CP99) at bku
  db.exec(`
    INSERT INTO charging_points (id, hub_id, code, status, connector_type, rated_power_kw)
    VALUES
      ('bku-CP03', 'bku', 'CP03', 'Available', 'type2', ${Number(pointRatedKw)}),
      ('bku-CP99', 'bku', 'CP99', 'Available', 'ccs2', ${Number(pointRatedKw)});
  `);

  db.exec(`
    INSERT INTO electric_vehicles (id, hub_id, vehicle_type, battery_percent, status, owner_id, connector_type)
    VALUES
      ('PV-301', 'bku', 'electric_motorbike', 45, 'Available', 'user-1', 'type2'),
      ('PV-302', 'bku', 'electric_motorbike', 45, 'Available', 'user-2', 'type2'),
      ('PV-303', 'bku', 'electric_motorbike', 15, 'Available', 'user-3', 'type2'),
      ('PV-304', 'bku', 'electric_motorbike', 8,  'Available', 'user-4', 'type2'),
      ('PV-305', 'bku', 'electric_motorbike', 50, 'Available', 'user-5', 'ccs2'),
      ('PV-306', 'bku', 'electric_motorbike', 82, 'Available', 'user-6', 'type2');
  `);

  const client = new SQLiteClient(db);
  const chargingGuard = createChargingGuard(client);
  const ops = createOperationsModule({ client, chargingGuard });
  const pc = createParkingChargingModule({
    client,
    inventoryInterface: ops.inventoryInterface,
    incidentReporter: ops.incidentService,
    chargingGuard
  });

  return { db, client, ops, pc };
}

async function parkVehicle(pc, userId, vehicleId, hubId = 'bku') {
  const actor = { id: userId, role: 'customer' };
  const res = await pc.parkingService.createReservation({ actor, vehicleId, hubId, pool: 'immediate' });
  return pc.parkingService.checkInReservation({ actor, reservationId: res.id, hubId, ticketCode: res.ticketCode });
}

test('UC12 priority queue ranking, <10% jump-ahead, FIFO tie-breaking, and manual overrides', async () => {
  const { db, pc } = setupFixture();
  const operator = { id: 'op-1', role: 'operator' };
  const neededSame = new Date(Date.now() + 3600000).toISOString();

  // Customer cannot inspect hub schedule
  await assert.rejects(
    pc.schedulerService.getHubChargingSchedule({ actor: { id: 'user-1', role: 'customer' }, hubId: 'bku' }),
    { code: 'FORBIDDEN_OPERATION', status: 403 }
  );

  // Park and queue: PV-301 (45%), PV-302 (45% same neededBy), PV-303 (15% emergency), EB-001 shared w/ reservation
  const occ1 = await parkVehicle(pc, 'user-1', 'PV-301');
  const occ2 = await parkVehicle(pc, 'user-2', 'PV-302');
  const occ3 = await parkVehicle(pc, 'user-3', 'PV-303');

  const req1 = await pc.chargingService.submitChargingRequest({
    actor: { id: 'user-1', role: 'customer' },
    occupancyId: occ1.occupancyId,
    targetBatteryPercent: 90,
    neededBy: neededSame
  });
  const req2 = await pc.chargingService.submitChargingRequest({
    actor: { id: 'user-2', role: 'customer' },
    occupancyId: occ2.occupancyId,
    targetBatteryPercent: 90,
    neededBy: neededSame
  });
  const req3 = await pc.chargingService.submitChargingRequest({
    actor: { id: 'user-3', role: 'customer' },
    occupancyId: occ3.occupancyId,
    targetBatteryPercent: 90,
    neededBy: new Date(Date.now() + 7200000).toISOString()
  });

  // Shared fleet vehicle at bku with reservation outranks regular private requests
  const sharedId = db.prepare("SELECT id FROM electric_vehicles WHERE hub_id = 'bku' AND owner_id IS NULL LIMIT 1").get().id;
  db.prepare("UPDATE electric_vehicles SET battery_percent = 30, reservation_id = 'trip_res_1' WHERE id = ?").run(sharedId);
  const reqShared = await pc.chargingService.submitChargingRequest({
    actor: operator,
    vehicleId: sharedId,
    targetBatteryPercent: 95,
    neededBy: neededSame
  });

  // Urgent <10% arrives last -> must dynamically jump to queue position 0
  const occ4 = await parkVehicle(pc, 'user-4', 'PV-304');
  const reqUrgent = await pc.chargingService.submitChargingRequest({
    actor: { id: 'user-4', role: 'customer' },
    occupancyId: occ4.occupancyId,
    targetBatteryPercent: 80,
    neededBy: new Date(Date.now() + 10800000).toISOString()
  });

  let schedule = await pc.schedulerService.getHubChargingSchedule({ actor: operator, hubId: 'bku' });
  assert.deepEqual(
    schedule.queue.map(r => r.id),
    [reqUrgent.id, req3.id, reqShared.id, req1.id, req2.id]
  );

  // Operator overrides req2 ahead of req1 (urgent <10% remains strictly ahead of >=10% safety boundary)
  schedule = await pc.schedulerService.overrideChargingSchedule({
    actor: operator,
    hubId: 'bku',
    overrides: [{ requestId: req2.id, priorityRank: 1 }]
  });
  assert.deepEqual(
    schedule.queue.map(r => r.id),
    [reqUrgent.id, req2.id, req3.id, reqShared.id, req1.id]
  );

  db.close();
});

test('BR15 exact 0.85 boundary acceptance, 1 kW over-budget rejection, zero double counting, and incompatible connector', async () => {
  const { db, pc } = setupFixture({ hubPowerLimitKw: 17.0, pointRatedKw: 11.0 });
  const operator = { id: 'op-1', role: 'operator' };

  const type2Points = db.prepare("SELECT id FROM charging_points WHERE hub_id = 'bku' AND connector_type = 'type2' ORDER BY code ASC").all().map(r => r.id);
  const pointA = type2Points[0];
  const pointB = type2Points[1];
  const pointC = type2Points[2];

  const occ1 = await parkVehicle(pc, 'user-1', 'PV-301');
  const occ2 = await parkVehicle(pc, 'user-2', 'PV-302');
  const occ3 = await parkVehicle(pc, 'user-3', 'PV-303');
  const occCcs = await parkVehicle(pc, 'user-5', 'PV-305');

  const req1 = await pc.chargingService.submitChargingRequest({ actor: { id: 'user-1', role: 'customer' }, occupancyId: occ1.occupancyId, targetBatteryPercent: 90 });
  const req2 = await pc.chargingService.submitChargingRequest({ actor: { id: 'user-2', role: 'customer' }, occupancyId: occ2.occupancyId, targetBatteryPercent: 90 });
  const req3 = await pc.chargingService.submitChargingRequest({ actor: { id: 'user-3', role: 'customer' }, occupancyId: occ3.occupancyId, targetBatteryPercent: 90 });
  const reqCcs = await pc.chargingService.submitChargingRequest({ actor: { id: 'user-5', role: 'customer' }, occupancyId: occCcs.occupancyId, targetBatteryPercent: 90 });

  // Incompatible connector rejected (ccs2 vehicle on type2 point)
  await assert.rejects(
    pc.schedulerService.allocateChargingRequest({ actor: operator, requestId: reqCcs.id, portId: pointA, powerKw: 7.0 }),
    { code: 'INCOMPATIBLE_CONNECTOR', status: 422 }
  );

  // Over point rated power rejected
  await assert.rejects(
    pc.schedulerService.allocateChargingRequest({ actor: operator, requestId: req1.id, portId: pointA, powerKw: 12.0 }),
    { code: 'INVALID_POWER_REQUEST', status: 422 }
  );

  // Allocate 10.0 kW and activate -> Active session must NOT double count 10.0 as 20.0
  const alloc1 = await pc.schedulerService.allocateChargingRequest({ actor: operator, requestId: req1.id, portId: pointA, powerKw: 10.0 });
  await pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc1.allocationId });

  // Allocate exact remaining 7.0 kW to reach exact 17.0 kW (0.85 * 20kW) boundary
  const alloc2 = await pc.schedulerService.allocateChargingRequest({ actor: operator, requestId: req2.id, portId: pointB, powerKw: 7.0 });
  assert.equal(alloc2.allocatedPowerKw, 7.0);

  const sched = await pc.schedulerService.getHubChargingSchedule({ actor: operator, hubId: 'bku' });
  assert.equal(sched.allocatedPowerKw, 17.0);
  assert.equal(sched.remainingPowerKw, 0);

  // Adding 1.0 kW more rejects with 409 POWER_BUDGET_EXCEEDED without modifying port status
  await assert.rejects(
    pc.schedulerService.allocateChargingRequest({ actor: operator, requestId: req3.id, portId: pointC, powerKw: 1.0 }),
    { code: 'POWER_BUDGET_EXCEEDED', status: 409 }
  );
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointC).status, 'Available');

  // Even if pointB faults uncertainly on activation (3 timeouts -> FaultUncertain), 7.0 kW remains counted in hub budget
  pc.deviceAdapter.scriptOutcomes(pointB, 'power_on', ['timeout', 'timeout', 'timeout']);
  await assert.rejects(
    pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc2.allocationId }),
    { code: 'DEVICE_UNCONFIRMED', status: 503 }
  );
  await assert.rejects(
    pc.schedulerService.allocateChargingRequest({ actor: operator, requestId: req3.id, portId: pointC, powerKw: 1.0 }),
    { code: 'POWER_BUDGET_EXCEEDED', status: 409 }
  );

  db.close();
});

test('FR-NI04 blocks preemption below 80%, yields at >=80%, and reassigns faulted point onto safe compatible port', async () => {
  const { db, pc } = setupFixture({ hubPowerLimitKw: 11.0, pointRatedKw: 11.0 });
  const operator = { id: 'op-1', role: 'operator' };

  const type2Points = db.prepare("SELECT id FROM charging_points WHERE hub_id = 'bku' AND connector_type = 'type2' ORDER BY code ASC").all().map(r => r.id);
  const pointA = type2Points[0];
  const pointB = type2Points[1];

  // Ensure pointA charges PV-306 at full 11.0 kW (0 kW remaining at hub)
  const occ6 = await parkVehicle(pc, 'user-6', 'PV-306');
  const req6 = await pc.chargingService.submitChargingRequest({
    actor: { id: 'user-6', role: 'customer' },
    occupancyId: occ6.occupancyId,
    targetBatteryPercent: 100
  });
  const alloc6 = await pc.schedulerService.allocateChargingRequest({ actor: operator, requestId: req6.id, portId: pointA, powerKw: 11.0 });
  const sess6 = await pc.chargingService.activateAllocation({ actor: operator, allocationId: alloc6.allocationId });

  // While PV-306 is at 75% (< 80%), urgent <10% request does NOT preempt
  db.prepare("UPDATE electric_vehicles SET battery_percent = 75 WHERE id = 'PV-306'").run();
  pc.deviceAdapter.setBatteryReading('PV-306', 75);

  const occ4 = await parkVehicle(pc, 'user-4', 'PV-304');
  const reqUrgent = await pc.chargingService.submitChargingRequest({
    actor: { id: 'user-4', role: 'customer' },
    occupancyId: occ4.occupancyId,
    targetBatteryPercent: 85
  });
  assert.equal((await pc.chargingService.getChargingSession({ actor: operator, sessionId: sess6.id })).status, 'Active');

  // Once PV-306 reaches 82% (>= 80%), FR-NI04 rebalance issues PriorityYield, returns req6 to Queued, frees 11 kW, and allocates reqUrgent
  pc.deviceAdapter.setBatteryReading('PV-306', 82);
  const rebalanceRes = await pc.schedulerService.rebalanceHubQueue('bku', { autoAllocate: true });
  assert.deepEqual(rebalanceRes.preemptedSessionIds, [sess6.id]);

  const yieldedSess = await pc.chargingService.getChargingSession({ actor: operator, sessionId: sess6.id });
  assert.equal(yieldedSess.status, 'Interrupted');
  assert.equal(yieldedSess.stopReason, 'PriorityYield');
  assert.equal((await pc.chargingService.getChargingRequest({ actor: operator, requestId: req6.id })).status, 'Queued');

  // Urgent type2 request allocated ONLY onto pointB (skipping pointA 'Complete' and CP99 'ccs2')
  const updatedUrgent = await pc.chargingService.getChargingRequest({ actor: operator, requestId: reqUrgent.id });
  assert.ok(updatedUrgent.allocationId);
  const urgentAlloc = await pc.chargingRepo.getAllocationById(updatedUrgent.allocationId);
  assert.equal(urgentAlloc.pointId, pointB);

  // Simulate fault on pointB while activating/charging reqUrgent -> moves pointB Fault and reassigns to remaining safe compatible point
  const pointC = type2Points[2];
  await pc.chargingService.activateAllocation({ actor: operator, allocationId: urgentAlloc.allocationId });
  const faultResult = await pc.chargingService.handlePointFault({
    actor: operator,
    pointId: pointB,
    description: 'Overcurrent breaker trip on CP-B'
  });
  assert.equal(faultResult.status, 'Fault');
  assert.ok(faultResult.incidentId);
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id = ?').get(pointB).status, 'Fault');

  const reassignedUrgent = await pc.chargingService.getChargingRequest({ actor: operator, requestId: reqUrgent.id });
  assert.equal(reassignedUrgent.status, 'Queued');
  assert.ok(reassignedUrgent.allocationId);
  const reassignedAlloc = await pc.chargingRepo.getAllocationById(reassignedUrgent.allocationId);
  assert.equal(reassignedAlloc.pointId, pointC);

  db.close();
});

test('UC12 accepts charging_points created in Operations Idle status', async () => {
  const { db, ops, pc } = setupFixture({ hubPowerLimitKw: 22.0, pointRatedKw: 7.4 });
  const operator = { id: 'op-1', role: 'operator' };

  const createdPoint = await ops.inventoryService.createResource({
    kind: 'charging_point',
    hubId: 'metro',
    attributes: { id: 'metro-CP-IDLE', code: 'CPIDLE', status: 'Idle' }
  });
  assert.equal(createdPoint.status, 'Idle');

  db.prepare("INSERT INTO electric_vehicles (id, hub_id, vehicle_type, battery_percent, status, owner_id, connector_type) VALUES ('PV-IDLE-1', 'metro', 'electric_motorbike', 35, 'Available', 'user-1', 'type2')").run();
  const occ = await parkVehicle(pc, 'user-1', 'PV-IDLE-1', 'metro');
  const req = await pc.chargingService.submitChargingRequest({
    actor: { id: 'user-1', role: 'customer' },
    occupancyId: occ.occupancyId,
    targetBatteryPercent: 85
  });

  const alloc = await pc.schedulerService.allocateChargingRequest({
    actor: operator,
    requestId: req.id,
    portId: 'metro-CP-IDLE',
    powerKw: 7.4
  });
  assert.equal(alloc.pointId, 'metro-CP-IDLE');
  assert.equal(alloc.pointStatus, 'Reserved');

  db.close();
});
