const { test } = require('node:test');
const assert = require('node:assert/strict');
const { IncidentService } = require('../application/incident-service');

const setup = trip => {
  const saved = [];
  const service = new IncidentService({createIncident: async i => saved.push(i)}, {client:{get: async () => ({id:'v'}), transaction: async fn => fn()}}, {getTrip: async () => trip});
  return {service, saved};
};
test('trip incidents use the authenticated owner and trusted trip vehicle', async () => {
  const {service, saved} = setup({id:'t', userId:'u', vehicleId:'v', status:'Active'});
  await service.reportTripIncident({tripId:'t', userId:'u', vehicleId:'forged', description:'failure'});
  assert.equal(saved[0].resourceId, 'v');
});
test('trip incidents reject another user and completed trips', async () => {
  for (const trip of [{id:'t',userId:'other',vehicleId:'v',status:'Active'}, {id:'t',userId:'u',vehicleId:'v',status:'Completed'}, null]) {
    const {service,saved} = setup(trip);
    await assert.rejects(service.reportTripIncident({tripId:'t',userId:'u',description:'failure'}));
    assert.equal(saved.length, 0);
  }
});

test('vehicle with an unresolved trip incident is not rentable after return', async () => {
  const { DatabaseSync } = require('node:sqlite');
  const fs = require('node:fs');
  const path = require('node:path');
  const { SQLiteClient } = require('../infrastructure/sqlite-client');
  const { SQLiteInventoryRepository } = require('../infrastructure/sqlite-inventory-repo');
  const { SQLiteIncidentRepository } = require('../infrastructure/sqlite-incident-repo');
  const db = new DatabaseSync(':memory:');
  const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql', 'seed.sql', 'migrations/0002_operations_schema.sql', 'migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base, file), 'utf8'));
  db.exec("UPDATE electric_vehicles SET status='InUse', trip_id='t' WHERE id='EB-024'");
  const client = new SQLiteClient(db);
  const inventory = new SQLiteInventoryRepository(client);
  const service = new IncidentService(new SQLiteIncidentRepository(client), inventory, {getTrip: async () => ({id:'t', userId:'u', vehicleId:'EB-024', status:'Active'})});
  await service.reportTripIncident({tripId:'t',userId:'u',description:'failure'});
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status, 'InUse');
  await inventory.returnVehicle('EB-024', 'metro', 'metro-A01', 90, 't');
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status, 'Faulty');
  db.close();
});

test('equipment incident validates resource and isolates reserved vehicle', async () => {
  const { DatabaseSync } = require('node:sqlite');
  const fs = require('node:fs'); const path = require('node:path');
  const { SQLiteClient } = require('../infrastructure/sqlite-client');
  const { SQLiteInventoryRepository } = require('../infrastructure/sqlite-inventory-repo');
  const { SQLiteIncidentRepository } = require('../infrastructure/sqlite-incident-repo');
  const db = new DatabaseSync(':memory:'); const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql', 'seed.sql', 'migrations/0002_operations_schema.sql', 'migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base, file), 'utf8'));
  const client = new SQLiteClient(db);
  const service = new IncidentService(new SQLiteIncidentRepository(client), new SQLiteInventoryRepository(client));
  await assert.rejects(service.reportEquipmentIncident({reporterId:'op',reporterRole:'Operator',resourceKind:'vehicle',resourceId:'missing',description:'broken'}));
  assert.equal(db.prepare('SELECT count(*) AS n FROM incidents').get().n,0);
  db.exec("UPDATE electric_vehicles SET status='Reserved' WHERE id='EB-024'");
  await service.reportEquipmentIncident({reporterId:'op',reporterRole:'Operator',resourceKind:'vehicle',resourceId:'EB-024',description:'broken'});
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Faulty');
  db.close();
});

test('emergency deadline starts at report receipt and cannot be extended by assignment', () => {
  const { Incident } = require('../domain/incident');
  const incident = new Incident({id:'i',reporterId:'op',resourceKind:'vehicle',resourceId:'v',description:'fire',severity:'Emergency',reportedAt:'2026-01-01T00:00:00.000Z'});
  incident.handle({assignmentId:'m',technicianId:'t',customSlaMinutes:30,now:new Date('2026-01-01T00:00:30.000Z')});
  assert.equal(incident.assignment.slaDeadline,'2026-01-01T00:01:00.000Z');
});

test('resolving one incident does not reactivate a resource with another open incident', async () => {
  const { DatabaseSync } = require('node:sqlite'); const fs = require('node:fs'); const path = require('node:path');
  const { SQLiteClient } = require('../infrastructure/sqlite-client'); const { SQLiteInventoryRepository } = require('../infrastructure/sqlite-inventory-repo');
  const { SQLiteIncidentRepository } = require('../infrastructure/sqlite-incident-repo');
  const db = new DatabaseSync(':memory:'); const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql', 'seed.sql', 'migrations/0002_operations_schema.sql', 'migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base, file), 'utf8'));
  const client = new SQLiteClient(db); const service = new IncidentService(new SQLiteIncidentRepository(client), new SQLiteInventoryRepository(client));
  const first = await service.reportEquipmentIncident({reporterId:'op',reporterRole:'Operator',resourceKind:'vehicle',resourceId:'EB-024',description:'one'});
  await service.reportEquipmentIncident({reporterId:'op',reporterRole:'Operator',resourceKind:'vehicle',resourceId:'EB-024',description:'two'});
  await service.handleIncident(first.id, {technicianId:'tech'});
  await service.resolveIncident(first.id);
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Faulty');
  db.close();
});

test('resolving a vehicle fault preserves its existing reservation', async () => {
  const {DatabaseSync} = require('node:sqlite'); const fs=require('node:fs'); const path=require('node:path');
  const {SQLiteClient}=require('../infrastructure/sqlite-client'); const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo'); const {SQLiteIncidentRepository}=require('../infrastructure/sqlite-incident-repo');
  const db=new DatabaseSync(':memory:'); const base=path.resolve(__dirname,'../../../../db');
  for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
  const client=new SQLiteClient(db); const inventory=new SQLiteInventoryRepository(client); const service=new IncidentService(new SQLiteIncidentRepository(client),inventory);
  await inventory.reserveVehicle('EB-024','r1','metro');
  const incident=await service.reportEquipmentIncident({reporterId:'op',reporterRole:'Operator',resourceKind:'vehicle',resourceId:'EB-024',description:'fault'});
  await service.handleIncident(incident.id, {technicianId:'tech'});
  await service.resolveIncident(incident.id);
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Reserved');
  await inventory.releaseVehicleHold('EB-024','r1'); db.close();
});

test('concurrent maintenance assignments do not replace each other', async () => {
  const {DatabaseSync}=require('node:sqlite'); const fs=require('node:fs'); const path=require('node:path');
  const {SQLiteClient}=require('../infrastructure/sqlite-client'); const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo'); const {SQLiteIncidentRepository}=require('../infrastructure/sqlite-incident-repo');
  const db=new DatabaseSync(':memory:'); const base=path.resolve(__dirname,'../../../../db');
  for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
  const client=new SQLiteClient(db); const service=new IncidentService(new SQLiteIncidentRepository(client),new SQLiteInventoryRepository(client));
  const incident=await service.reportEquipmentIncident({reporterId:'op',reporterRole:'Operator',resourceKind:'vehicle',resourceId:'EB-024',description:'fault'});
  const results=await Promise.allSettled([service.handleIncident(incident.id,{technicianId:'one'}),service.handleIncident(incident.id,{technicianId:'two'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM maintenance_assignments WHERE incident_id=?').get(incident.id).n,1);
  db.close();
});

test('resolving an incident does not bypass charging point repair', async () => {
  const {DatabaseSync}=require('node:sqlite'); const fs=require('node:fs'); const path=require('node:path');
  const {SQLiteClient}=require('../infrastructure/sqlite-client'); const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo'); const {SQLiteIncidentRepository}=require('../infrastructure/sqlite-incident-repo');
  const db=new DatabaseSync(':memory:'); const base=path.resolve(__dirname,'../../../../db');
  for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
  const client=new SQLiteClient(db); const service=new IncidentService(new SQLiteIncidentRepository(client),new SQLiteInventoryRepository(client));
  const point=db.prepare('SELECT id FROM charging_points LIMIT 1').get().id;
  const incident=await service.reportEquipmentIncident({reporterId:'op',reporterRole:'Operator',resourceKind:'charging_point',resourceId:point,description:'fault'});
  await service.handleIncident(incident.id, {technicianId:'tech'});
  await service.resolveIncident(incident.id);
  assert.equal(db.prepare('SELECT status FROM charging_points WHERE id=?').get(point).status,'Fault'); db.close();
});

test('an incident cannot be resolved before maintenance is assigned', async () => {
 const {Incident}=require('../domain/incident');
 const incident=new Incident({id:'i',reporterId:'op',resourceKind:'vehicle',resourceId:'v',description:'fault'});
 assert.throws(()=>incident.resolve(),{code:'MAINTENANCE_NOT_ASSIGNED'});
});

test('trip incident rejects a trusted trip whose vehicle is not assigned to that trip', async () => {
 const {DatabaseSync}=require('node:sqlite'); const fs=require('node:fs'); const path=require('node:path');
 const {SQLiteClient}=require('../infrastructure/sqlite-client'); const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo'); const {SQLiteIncidentRepository}=require('../infrastructure/sqlite-incident-repo');
 const db=new DatabaseSync(':memory:'); const base=path.resolve(__dirname,'../../../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 const client=new SQLiteClient(db); const inventory=new SQLiteInventoryRepository(client); const service=new IncidentService(new SQLiteIncidentRepository(client),inventory,{getTrip:async()=>({id:'t',userId:'u',vehicleId:'EB-024',status:'Active'})});
 await assert.rejects(service.reportTripIncident({tripId:'t',userId:'u',description:'fault'}));
 assert.equal(db.prepare('SELECT count(*) AS n FROM incidents').get().n,0); db.close();
});

test('trip status and incident creation share the owning database transaction', async () => {
 const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const path=require('node:path');
 const {SQLiteClient}=require('../infrastructure/sqlite-client');const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo');const {SQLiteIncidentRepository}=require('../infrastructure/sqlite-incident-repo');
 const db=new DatabaseSync(':memory:'),base=path.resolve(__dirname,'../../../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql'])db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 db.exec("CREATE TABLE trips(id TEXT PRIMARY KEY, userId TEXT, vehicleId TEXT, status TEXT); INSERT INTO trips VALUES('t','u','EB-024','Active'); UPDATE electric_vehicles SET status='InUse',trip_id='t' WHERE id='EB-024'");
 const client=new SQLiteClient(db),inventory=new SQLiteInventoryRepository(client);let started,release;
 const entered=new Promise(resolve=>started=resolve),gate=new Promise(resolve=>release=resolve);
 const service=new IncidentService(new SQLiteIncidentRepository(client),inventory,{async getTrip(id){const row=await client.get('SELECT * FROM trips WHERE id=?',[id]);started();await gate;return row;}});
 const reporting=service.reportTripIncident({tripId:'t',userId:'u',description:'fault'});await entered;
 let closeFinished=false;const closing=client.run("UPDATE trips SET status='Completed' WHERE id='t'").then(()=>{closeFinished=true});
 await new Promise(resolve=>setImmediate(resolve));const closedBeforeReport=closeFinished;release();await reporting;await closing;
 assert.equal(closedBeforeReport,false,'trip completion must wait for incident commit');db.close();
});

test('emergency report exposes the receipt-based deadline without claiming isolation', async () => {
 const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const path=require('node:path');
 const {SQLiteClient}=require('../infrastructure/sqlite-client');const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo');const {SQLiteIncidentRepository}=require('../infrastructure/sqlite-incident-repo');
 const db=new DatabaseSync(':memory:'),base=path.resolve(__dirname,'../../../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql','migrations/0008_incident_isolation.sql'])db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 const client=new SQLiteClient(db),service=new IncidentService(new SQLiteIncidentRepository(client),new SQLiteInventoryRepository(client));
 const reported=await service.reportEquipmentIncident({resourceKind:'vehicle',resourceId:'EB-024',description:'emergency',severity:'Emergency',reporterId:'op',reporterRole:'Operator'});
 assert.equal(Date.parse(reported.slaDeadline)-Date.parse(reported.reportedAt),60000);
 assert.equal(reported.isolationVerifiedAt,null);assert.equal(reported.isolationSlaMet,null);db.close();
});

test('isolation compliance requires verified evidence and persists the first confirmation', async () => {
 const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const path=require('node:path');
 const {SQLiteClient}=require('../infrastructure/sqlite-client');const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo');const {SQLiteIncidentRepository}=require('../infrastructure/sqlite-incident-repo');
 const db=new DatabaseSync(':memory:'),base=path.resolve(__dirname,'../../../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql','migrations/0008_incident_isolation.sql'])db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 const client=new SQLiteClient(db),repo=new SQLiteIncidentRepository(client),inventory=new SQLiteInventoryRepository(client);
 const service=new IncidentService(repo,inventory,null,{verify:async evidence=>evidence==='verified'});
 const report=await service.reportEquipmentIncident({resourceKind:'vehicle',resourceId:'EB-024',description:'emergency',severity:'Emergency',reporterId:'op',reporterRole:'Operator'});
 await assert.rejects(service.confirmIsolation(report.id,'unverified'),{code:'DEVICE_UNCONFIRMED'});
 assert.equal((await service.getIncident(report.id)).isolationVerifiedAt,null);
 const confirmed=await service.confirmIsolation(report.id,'verified');assert.ok(confirmed.isolationVerifiedAt);assert.equal(confirmed.isolationSlaMet,true);
 const again=await service.confirmIsolation(report.id,'verified');assert.equal(again.isolationVerifiedAt,confirmed.isolationVerifiedAt);db.close();
});
