const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { SQLiteClient } = require('../infrastructure/sqlite-client');
const { SQLiteInventoryRepository } = require('../infrastructure/sqlite-inventory-repo');
const { InventoryService } = require('../application/inventory-service');
function setup() {
  const db = new DatabaseSync(':memory:');
  const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql', 'seed.sql', 'migrations/0002_operations_schema.sql', 'migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base, file), 'utf8'));
  db.exec("UPDATE parking_slots SET pool='immediate'");
  const repo = new SQLiteInventoryRepository(new SQLiteClient(db));
  return { db, repo, service: new InventoryService(repo) };
}
test('administration cannot modify or delete a transfer-held vehicle', async () => {
  const {db,repo,service} = setup();
  db.exec("UPDATE electric_vehicles SET status='TransferHeld' WHERE id='EB-024'");
  await assert.rejects(service.updateResource('EB-024', {hubId:'bku'}));
  await assert.rejects(repo.deleteVehicle('EB-024'));
  assert.equal(db.prepare("SELECT hub_id FROM electric_vehicles WHERE id='EB-024'").get().hub_id, 'metro');
  db.close();
});
test('administration cannot force a vehicle into a lifecycle state', async () => {
  const {db,service} = setup();
  await assert.rejects(service.updateResource('EB-024', {status:'InUse'}));
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status, 'Available');
  db.close();
});

test('only the reservation owning a vehicle or slot can release it', async () => {
  const {db,repo} = setup();
  await repo.reserveVehicle('EB-024','reservation-a','metro');
  await assert.rejects(repo.releaseVehicleHold('EB-024','reservation-b'));
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Reserved');
  await repo.releaseVehicleHold('EB-024','reservation-a');
  await repo.holdSlotForReservation('bku-A01','reservation-a',{pool:'immediate',hubId:'bku',expiresAt:new Date(Date.now()+3600000).toISOString()});
  await assert.rejects(repo.releaseSlotHold('bku-A01','reservation-b'));
  assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status,'Held');
  await repo.releaseSlotHold('bku-A01','reservation-a');
  db.close();
});

test('pickup, return and parking occupancy require the owning identities', async () => {
  const {db,repo} = setup();
  await repo.reserveVehicle('EB-024','reservation-a','metro');
  await assert.rejects(repo.pickupVehicle('EB-024','trip-a','reservation-b','metro'));
  await repo.claimVehiclePickup('EB-024','reservation-a','metro');
  await repo.pickupVehicle('EB-024','trip-a','reservation-a','metro');
  await assert.rejects(repo.returnVehicle('EB-024','bku','bku-A01',80,'trip-b'));
  await repo.holdSlotForReservation('bku-A01','slot-a',{pool:'immediate',hubId:'bku',expiresAt:new Date(Date.now()+3600000).toISOString()});
  await assert.rejects(repo.returnVehicle('EB-024','bku','bku-A01',80,'trip-a','slot-b'));
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'InUse');
  await repo.returnVehicle('EB-024','bku','bku-A01',80,'trip-a','slot-a');
  await assert.rejects(repo.vacateSlot('bku-A01','other'));
  await repo.vacateSlot('bku-A01','trip-a');
  db.close();
});

test('a parking action cannot consume or release a transfer hold', async () => {
  const {SQLiteTransferRepository} = require('../infrastructure/sqlite-transfer-repo');
  const {Transfer} = require('../domain/transfer');
  const {db,repo} = setup();
  const transfers = new SQLiteTransferRepository(repo.client);
  await transfers.createTransfer(new Transfer({id:'owned-transfer',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['EB-024'],destinationSlotIds:['bku-A01'],createdBy:'op'}));
  await assert.rejects(repo.releaseSlotHold('bku-A01','unrelated'));
  await assert.rejects(repo.occupySlot('bku-A01','occupancy','unrelated','bku'));
  assert.equal(db.prepare("SELECT transfer_hold_id FROM parking_slots WHERE id='bku-A01'").get().transfer_hold_id,'owned-transfer');
  db.close();
});

test('administration cannot overwrite an active slot or charging point', async () => {
  const {db,repo,service}=setup();
  await repo.holdSlotForReservation('bku-A01','held-reservation',{pool:'immediate',hubId:'bku',expiresAt:new Date(Date.now()+3600000).toISOString()});
  await assert.rejects(service.updateResource('bku-A01',{status:'Available'}));
  db.exec("UPDATE charging_points SET status='Charging' WHERE id=(SELECT id FROM charging_points LIMIT 1)");
  const point=db.prepare('SELECT id FROM charging_points LIMIT 1').get().id;
  await assert.rejects(service.updateResource(point,{status:'Available'}));
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id=?').get(point).status,'Charging');
  db.close();
});

test('charging interface rejects unknown and invalid transitions', async () => {
  const {db,repo}=setup(); repo.chargingGuard={assertTransition:async()=>{}}; const id=db.prepare('SELECT id FROM charging_points LIMIT 1').get().id;
  await assert.rejects(repo.updateChargingPointStatus(id,'invented'));
  await repo.updateChargingPointStatus(id,'Reserved');
  await assert.rejects(repo.updateChargingPointStatus(id,'Complete'));
  await repo.updateChargingPointStatus(id,'Starting');
  await repo.updateChargingPointStatus(id,'Charging');
  await assert.rejects(repo.updateChargingPointStatus(id,'Available'));
  db.close();
});

test('new inventory cannot start in an active lifecycle state', async () => {
 const {db,service}=setup();
 await assert.rejects(service.createResource({kind:'vehicle',hubId:'metro',attributes:{id:'new-v',status:'InUse'}}));
 await assert.rejects(service.createResource({kind:'slot',hubId:'metro',attributes:{id:'new-s',code:'new',status:'Held'}}));
 await assert.rejects(service.createResource({kind:'charging_point',hubId:'metro',attributes:{id:'new-c',code:'new',status:'Charging'}}));
 db.close();
});

test('charging point cannot be reactivated while an incident remains unresolved', async () => {
 const {SQLiteIncidentRepository}=require('../infrastructure/sqlite-incident-repo'); const {IncidentService}=require('../application/incident-service');
 const {db,repo}=setup(); repo.chargingGuard={assertTransition:async()=>{}}; const id=db.prepare('SELECT id FROM charging_points LIMIT 1').get().id;
 const service=new IncidentService(new SQLiteIncidentRepository(repo.client),repo);
 await service.reportEquipmentIncident({resourceKind:'charging_point',resourceId:id,description:'fault'});
 await repo.updateChargingPointStatus(id,'Repair');
 await assert.rejects(repo.updateChargingPointStatus(id,'Available'));
 assert.equal(db.prepare('SELECT status FROM charging_points WHERE id=?').get(id).status,'Repair'); db.close();
});

test('a faulty vehicle with a live reservation cannot be deleted or reassigned', async () => {
 const {db,repo,service}=setup(); await repo.reserveVehicle('EB-024','r1','metro');
 db.exec("UPDATE electric_vehicles SET status='Faulty' WHERE id='EB-024'");
 await assert.rejects(repo.deleteVehicle('EB-024'));
 await assert.rejects(service.updateResource('EB-024',{hubId:'bku'}));
 assert.equal(db.prepare("SELECT hub_id FROM electric_vehicles WHERE id='EB-024'").get().hub_id,'metro'); db.close();
});

test('reservations and returns enforce hub and physical capacity', async () => {
 const {db,repo}=setup();
 await assert.rejects(repo.reserveVehicle('EB-024','wrong-hub','bku'));
 await repo.reserveVehicle('EB-024','correct','metro');
 await assert.rejects(repo.pickupVehicle('EB-024','trip','correct','bku'));
 await repo.claimVehiclePickup('EB-024','correct','metro');
 await repo.pickupVehicle('EB-024','trip','correct','metro');
 await assert.rejects(repo.returnVehicle('EB-024','bku',null,90,'trip'));
 await assert.rejects(repo.returnVehicle('EB-024','bku','bku-A01',150,'trip'));
 assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'InUse'); db.close();
});

test('picking up a returned shared vehicle vacates its physical slot', async () => {
 const {db,repo}=setup();
 await repo.reserveVehicle('EB-024','r1','metro'); await repo.claimVehiclePickup('EB-024','r1','metro'); await repo.pickupVehicle('EB-024','t1','r1','metro');
 await repo.returnVehicle('EB-024','bku','bku-A01',90,'t1');
 await repo.reserveVehicle('EB-024','r2','bku'); await repo.claimVehiclePickup('EB-024','r2','bku'); await repo.pickupVehicle('EB-024','t2','r2','bku');
 assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status,'Available'); db.close();
});

test('availability queries exclude resources with outstanding commitments', async () => {
 const {db,repo}=setup();
 db.exec("UPDATE electric_vehicles SET reservation_id='legacy' WHERE id='EB-024'; UPDATE parking_slots SET parked_vehicle_id='EB-031' WHERE id='bku-A01'");
 assert.ok(!(await repo.getAvailableVehicles('metro')).some(v=>v.id==='EB-024'));
 assert.ok(!(await repo.getAvailableSlots('bku')).some(s=>s.id==='bku-A01'));
 db.close();
});

test('resource constructors normalize legacy states by resource type and reject unknown states', () => {
 const {ElectricVehicle,ParkingSlot,ChargingPoint}=require('../domain/resource');
 assert.equal(new ParkingSlot({id:'s',hubId:'h',code:'s',status:'held_for_transfer'}).status,'Held');
 assert.equal(new ParkingSlot({id:'s',hubId:'h',code:'s',status:'blocked'}).status,'Suspended');
 assert.equal(new ChargingPoint({id:'c',hubId:'h',code:'c',status:'faulted'}).status,'Fault');
 assert.equal(new ElectricVehicle({id:'v',hubId:'h',vehicleType:'electric_bicycle',batteryPercent:80,status:'in_use'}).status,'InUse');
 assert.throws(()=>new ParkingSlot({id:'s',hubId:'h',code:'s',status:'invented'}),{code:'INVALID_STATE_TRANSITION'});
});

test('administration rejects deleting or relocating a physically parked vehicle', async () => {
 const {db,repo,service}=setup();
 await repo.reserveVehicle('EB-024','r','metro'); await repo.claimVehiclePickup('EB-024','r','metro'); await repo.pickupVehicle('EB-024','t','r','metro'); await repo.returnVehicle('EB-024','bku','bku-A01',90,'t');
 await assert.rejects(repo.deleteVehicle('EB-024'),{code:'CANNOT_DELETE_ACTIVE_VEHICLE'});
 await assert.rejects(service.updateResource('EB-024',{hubId:'metro'}),{code:'INVALID_STATE_TRANSITION'});
 assert.equal(db.prepare("SELECT hub_id FROM electric_vehicles WHERE id='EB-024'").get().hub_id,'bku'); db.close();
});

test('parking query does not pretend unsupported pool compatibility was checked', async () => {
 const {db,repo}=setup(); await assert.rejects(repo.getAvailableSlots('bku','charging'),{code:'INVALID_INPUT'}); db.close();
});

test('charging state cannot change without the owning module safety guard', async () => {
 const {db,repo}=setup(); const id=db.prepare('SELECT id FROM charging_points LIMIT 1').get().id;
 await assert.rejects(repo.updateChargingPointStatus(id,'Reserved'),{code:'CHARGING_GUARD_UNAVAILABLE'});
 assert.equal(db.prepare('SELECT status FROM charging_points WHERE id=?').get(id).status,'Available'); db.close();
});

test('charging guard rejection rolls back its related writes and state change', async () => {
 const {db,repo}=setup(); const id=db.prepare('SELECT id FROM charging_points LIMIT 1').get().id;
 db.exec('CREATE TABLE charging_guard_effects(id TEXT)');
 repo.chargingGuard={async assertTransition({client}){await client.run("INSERT INTO charging_guard_effects VALUES ('pending')"); throw new Error('unverified device');}};
 await assert.rejects(repo.updateChargingPointStatus(id,'Reserved'),/unverified device/);
 assert.equal(db.prepare('SELECT count(*) AS n FROM charging_guard_effects').get().n,0);
 assert.equal(db.prepare('SELECT status FROM charging_points WHERE id=?').get(id).status,'Available'); db.close();
});
test('charging admin status updates cannot bypass the guard', async () => {
 const {db,service}=setup(); const id=db.prepare('SELECT id FROM charging_points LIMIT 1').get().id;
 await assert.rejects(service.updateResource(id,{status:'Fault'}),{code:'CHARGING_GUARD_UNAVAILABLE'});
 assert.equal(db.prepare('SELECT status FROM charging_points WHERE id=?').get(id).status,'Available'); db.close();
});

test('vehicles below the rental battery threshold are not offered or reserved', async () => {
 const {db,repo}=setup(); db.exec("UPDATE electric_vehicles SET battery_percent=19 WHERE id='EB-024'");
 assert.ok(!(await repo.getAvailableVehicles('metro')).some(v=>v.id==='EB-024'));
 await assert.rejects(repo.reserveVehicle('EB-024','low','metro'),{code:'VEHICLE_NOT_AVAILABLE'}); db.close();
});

test('reservation pickup rechecks current battery eligibility', async () => {
 const {db,repo}=setup(); await repo.reserveVehicle('EB-024','r-low','metro');
 await repo.claimVehiclePickup('EB-024','r-low','metro');
 db.exec("UPDATE electric_vehicles SET battery_percent=19 WHERE id='EB-024'");
 await assert.rejects(repo.pickupVehicle('EB-024','t-low','r-low','metro'),{code:'VEHICLE_CANNOT_PICKUP'});
 assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Reserved'); db.close();
});

test('an expired vehicle reservation cannot be picked up', async () => {
 const {db,repo}=setup();
 await repo.reserveVehicle('EB-024','expired','metro');
 db.exec("UPDATE electric_vehicles SET reservation_expires_at='2000-01-01T00:00:00.000Z' WHERE id='EB-024'");
 await assert.rejects(repo.claimVehiclePickup('EB-024','expired','metro'),{code:'VEHICLE_CANNOT_PICKUP'});
 assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Reserved'); db.close();
});

test('a claimed pickup blocks expiry and cancellation until pickup reconciliation', async () => {
 const {db,repo}=setup(); await repo.reserveVehicle('EB-024','claim','metro');
 await repo.claimVehiclePickup('EB-024','claim','metro');
 db.exec("UPDATE electric_vehicles SET reservation_expires_at='2000-01-01T00:00:00.000Z' WHERE id='EB-024'");
 await assert.rejects(repo.releaseVehicleHold('EB-024','claim'));
 await assert.rejects(repo.expireVehicleHold('EB-024','claim'));
 await repo.pickupVehicle('EB-024','trip-claim','claim','metro');
 assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'InUse');
 await assert.rejects(repo.expireVehicleHold('EB-024','claim')); db.close();
});
test('reconciled pickup claim can be released then expired', async () => {
 const {db,repo}=setup(); await repo.reserveVehicle('EB-024','claim','metro');
 await repo.claimVehiclePickup('EB-024','claim','metro');
 db.exec("UPDATE electric_vehicles SET reservation_expires_at='2000-01-01T00:00:00.000Z' WHERE id='EB-024'");
 await repo.releasePickupClaim('EB-024','claim'); await repo.expireVehicleHold('EB-024','claim');
 assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Available'); db.close();
});

test('vehicle reservation receives a server-generated fifteen-minute expiry', async () => {
 const {db,repo}=setup(); const before=Date.now();
 const hold=await repo.reserveVehicle('EB-024','server-expiry','metro'); const after=Date.now();
 const expires=Date.parse(hold.expiresAt);
 assert.ok(expires>=before+15*60000 && expires<=after+15*60000);
 assert.equal(db.prepare("SELECT reservation_expires_at FROM electric_vehicles WHERE id='EB-024'").get().reservation_expires_at,hold.expiresAt); db.close();
});

test('physical pickup cannot complete without claiming the reservation', async () => {
 const {db,repo}=setup(); await repo.reserveVehicle('EB-024','unclaimed','metro');
 await assert.rejects(repo.pickupVehicle('EB-024','trip','unclaimed','metro'),{code:'VEHICLE_CANNOT_PICKUP'});
 const row=db.prepare("SELECT status,pickup_claimed FROM electric_vehicles WHERE id='EB-024'").get();
 assert.equal(row.status,'Reserved'); assert.equal(row.pickup_claimed,0); db.close();
});
