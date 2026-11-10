const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MonitoringService } = require('../application/monitoring-service');
const { applyMigrations } = require('./fixtures/operations-fixtures');

test('monitoring counts canonical and legacy resource states', async () => {
  const snapshot = { capturedAt: 'now', hubs: [{id:'h',name:'Hub'}],
    vehicles: ['Available','available','InUse','in_use','TransferHeld','in_transfer','Faulty','faulted'].map((status, i) => ({ id: String(i), hubId:'h', status, batteryPercent:80 })),
    slots: ['Occupied','occupied','Held','held_for_transfer','Available','available'].map(status => ({hubId:'h',status})),
    chargingPoints: ['Available','idle','Charging','charging','Fault','faulted'].map(status => ({hubId:'h',status})) };
  const [hub] = await new MonitoringService({captureNetworkSnapshot: async () => snapshot}).getNetworkOverview();
  assert.deepEqual([hub.vehicles.available,hub.vehicles.inUse,hub.vehicles.inTransfer,hub.vehicles.faulted], [2,2,2,2]);
  assert.deepEqual([hub.capacity.occupiedSlots,hub.capacity.heldSlots,hub.capacity.availableSlots], [2,2,2]);
  assert.deepEqual([hub.charging.availablePoints,hub.charging.chargingPoints,hub.charging.faultedPoints], [2,2,2]);
});

test('monitoring counts a current advance commitment as held', async () => {
 const {DatabaseSync}=require('node:sqlite'); const fs=require('node:fs'); const path=require('node:path');
 const {SQLiteClient}=require('../infrastructure/sqlite-client'); const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo');
 const db=new DatabaseSync(':memory:');
 applyMigrations(db);
 db.exec("UPDATE parking_slots SET pool='advance' WHERE id='bku-A01'");
 const stamp=minutes=>new Date(Date.now()+minutes*60000).toISOString();
 db.prepare("INSERT INTO parking_commitments(reservation_id,slot_id,pool,starts_at,ends_at,expires_at,status) VALUES('r','bku-A01','advance',?,?,?,'Reserved')").run(stamp(-10),stamp(60),stamp(30));
 const service=new MonitoringService(new SQLiteInventoryRepository(new SQLiteClient(db)));
 const hub=(await service.getNetworkOverview()).find(h=>h.hubId==='bku');
 assert.equal(hub.capacity.heldSlots,1);assert.equal(hub.capacity.availableSlots,hub.capacity.totalSlots-1);db.close();
});

test('monitoring tracks transfer holds, cancellation, incidents and maintenance', async () => {
 const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const path=require('node:path');const {createOperationsModule}=require('../index');
 const db=new DatabaseSync(':memory:');
 applyMigrations(db);
 const app=createOperationsModule({db}); const hubs=async()=>Object.fromEntries((await app.monitoringService.getNetworkOverview()).map(h=>[h.hubId,h]));
 const before=await hubs(); const transfer=await app.transferService.createTransfer({sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['EB-024'],destinationSlotIds:['bku-A01'],createdBy:'op'});
 const held=await hubs();assert.equal(held.metro.vehicles.available,before.metro.vehicles.available-1);assert.equal(held.metro.vehicles.inTransfer,before.metro.vehicles.inTransfer+1);assert.equal(held.bku.capacity.heldSlots,before.bku.capacity.heldSlots+1);
 await app.transferService.cancelTransfer(transfer.id,{reason:'cancelled'});const cancelled=await hubs();assert.equal(cancelled.metro.vehicles.available,before.metro.vehicles.available);assert.equal(cancelled.bku.capacity.heldSlots,before.bku.capacity.heldSlots);
 const incident=await app.incidentService.reportEquipmentIncident({resourceKind:'vehicle',resourceId:'EB-024',description:'fault',reporterId:'op',reporterRole:'Operator'});
 const faulted=await hubs();assert.equal(faulted.metro.vehicles.faulted,before.metro.vehicles.faulted+1);
 await app.incidentService.handleIncident(incident.id,{technicianId:'tech'});await app.incidentService.resolveIncident(incident.id);
 const repaired=await hubs();assert.equal(repaired.metro.vehicles.available,before.metro.vehicles.available);assert.equal(repaired.metro.vehicles.faulted,before.metro.vehicles.faulted);db.close();
});
