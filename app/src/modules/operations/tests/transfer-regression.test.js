const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { SQLiteClient } = require('../infrastructure/sqlite-client');
const { SQLiteTransferRepository } = require('../infrastructure/sqlite-transfer-repo');
const { Transfer } = require('../domain/transfer');

test('a vehicle cannot be claimed by two transfers', async () => {
  const db = new DatabaseSync(':memory:');
  const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql', 'seed.sql', 'migrations/0002_operations_schema.sql', 'migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql']) db.exec(fs.readFileSync(path.join(base, file), 'utf8'));
  const repo = new SQLiteTransferRepository(new SQLiteClient(db));
  const order = (id, slot) => new Transfer({ id, sourceHubId: 'metro', destinationHubId: 'bku', vehicleIds: ['EB-024'], destinationSlotIds: [slot], createdBy: 'op' });
  const results = await Promise.allSettled([repo.createTransfer(order('t1', 'bku-A01')), repo.createTransfer(order('t2', 'bku-A02'))]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM transfers').get().n, 1);
  db.close();
});

test('rerouting arrival releases old holds and persists replacement slots', async () => {
  const db = new DatabaseSync(':memory:');
  const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql', 'seed.sql', 'migrations/0002_operations_schema.sql', 'migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql']) db.exec(fs.readFileSync(path.join(base, file), 'utf8'));
  const repo = new SQLiteTransferRepository(new SQLiteClient(db));
  const transfer = new Transfer({ id: 'route', sourceHubId: 'metro', destinationHubId: 'bku', vehicleIds: ['EB-024'], destinationSlotIds: ['bku-A01'], createdBy: 'op' });
  await repo.createTransfer(transfer);
  transfer.depart({});
  await repo.departTransfer(transfer);
  transfer.arrive({ observedVehicleIds: ['EB-024'], replacementDestinationHubId: 'dorm-a', replacementSlotIds: ['dorm-a-A01'] });
  await repo.arriveTransfer(transfer);
  assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status, 'Available');
  assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='dorm-a-A01'").get().status, 'Occupied');
  assert.deepEqual((await repo.getTransferById('route')).destinationSlotIds, ['dorm-a-A01']);
  assert.equal(db.prepare("SELECT hub_id FROM electric_vehicles WHERE id='EB-024'").get().hub_id, 'dorm-a');
  db.close();
});

test('reservation and transfer cannot both claim the same vehicle', async () => {
  const { SQLiteInventoryRepository } = require('../infrastructure/sqlite-inventory-repo');
  const db = new DatabaseSync(':memory:');
  const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql', 'seed.sql', 'migrations/0002_operations_schema.sql', 'migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql']) db.exec(fs.readFileSync(path.join(base, file), 'utf8'));
  const client = new SQLiteClient(db);
  const inventory = new SQLiteInventoryRepository(client);
  const transferRepo = new SQLiteTransferRepository(client);
  const transfer = new Transfer({ id: 'race', sourceHubId: 'metro', destinationHubId: 'bku', vehicleIds: ['EB-024'], destinationSlotIds: ['bku-A01'], createdBy: 'op' });
  const results = await Promise.allSettled([inventory.reserveVehicle('EB-024', 'res', 'metro'), transferRepo.createTransfer(transfer)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  db.close();
});

test('failed rerouting keeps original holds and vehicle in transit', async () => {
  const db = new DatabaseSync(':memory:');
  const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql', 'seed.sql', 'migrations/0002_operations_schema.sql', 'migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql']) db.exec(fs.readFileSync(path.join(base, file), 'utf8'));
  const repo = new SQLiteTransferRepository(new SQLiteClient(db));
  const transfer = new Transfer({ id: 'failed-route', sourceHubId: 'metro', destinationHubId: 'bku', vehicleIds: ['EB-024'], destinationSlotIds: ['bku-A01'], createdBy: 'op' });
  await repo.createTransfer(transfer);
  transfer.depart({});
  await repo.departTransfer(transfer);
  db.exec("UPDATE parking_slots SET status='Occupied' WHERE id='dorm-a-A01'");
  transfer.arrive({ observedVehicleIds: ['EB-024'], replacementDestinationHubId: 'dorm-a', replacementSlotIds: ['dorm-a-A01'] });
  await assert.rejects(repo.arriveTransfer(transfer), {code:'SLOT_HOLD_FAILED'});
  assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status, 'Held');
  assert.equal(db.prepare("SELECT status FROM transfers WHERE id='failed-route'").get().status, 'InTransit');
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status, 'InTransit');
  db.close();
});

test('departure rolls back when a held vehicle becomes faulty', async () => {
  const db = new DatabaseSync(':memory:'); const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql', 'seed.sql', 'migrations/0002_operations_schema.sql', 'migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql']) db.exec(fs.readFileSync(path.join(base, file), 'utf8'));
  const repo = new SQLiteTransferRepository(new SQLiteClient(db));
  const transfer = new Transfer({id:'faulted',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['EB-024'],destinationSlotIds:['bku-A01'],createdBy:'op'});
  await repo.createTransfer(transfer);
  db.exec("UPDATE electric_vehicles SET status='Faulty' WHERE id='EB-024'");
  transfer.depart({});
  await assert.rejects(repo.departTransfer(transfer));
  assert.equal(db.prepare("SELECT status FROM transfers WHERE id='faulted'").get().status,'Planned');
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Faulty');
  db.close();
});

test('rerouting within a hub may retain a slot already held by the same transfer', async () => {
  const db = new DatabaseSync(':memory:'); const base = path.resolve(__dirname, '../../../../db');
  for (const file of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql']) db.exec(fs.readFileSync(path.join(base,file),'utf8'));
  const repo = new SQLiteTransferRepository(new SQLiteClient(db));
  const transfer = new Transfer({id:'partial-route',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['EB-024','EB-031'],destinationSlotIds:['bku-A01','bku-A02'],createdBy:'op'});
  await repo.createTransfer(transfer); transfer.depart({}); await repo.departTransfer(transfer);
  transfer.arrive({observedVehicleIds:['EB-024','EB-031'],replacementDestinationHubId:'bku',replacementSlotIds:['bku-A01','bku-A03']});
  await repo.arriveTransfer(transfer);
  assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A02'").get().status,'Available');
  assert.deepEqual((await repo.getTransferById(transfer.id)).destinationSlotIds.sort(),['bku-A01','bku-A03']);
  db.close();
});

test('invalid observed vehicle input yields a domain error', () => {
  const transfer = new Transfer({id:'bad-input',sourceHubId:'metro',destinationHubId:'bku',status:'InTransit',vehicleIds:['v'],destinationSlotIds:['s'],createdBy:'op'});
  assert.throws(() => transfer.arrive({observedVehicleIds:null}),{code:'INCOMPLETE_ARRIVAL_SET'});
});

test('faulty vehicle in transit arrives at destination without becoming rentable', async () => {
  const db=new DatabaseSync(':memory:'); const base=path.resolve(__dirname,'../../../../db');
  for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
  const repo=new SQLiteTransferRepository(new SQLiteClient(db));
  const transfer=new Transfer({id:'fault-arrival',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['EB-024'],destinationSlotIds:['bku-A01'],createdBy:'op'});
  await repo.createTransfer(transfer); transfer.depart({}); await repo.departTransfer(transfer);
  db.exec("UPDATE electric_vehicles SET status='Faulty' WHERE id='EB-024'; INSERT INTO incidents(id,reporter_id,reporter_role,resource_kind,resource_id,description,severity,status,reported_at) VALUES('fault','op','Operator','vehicle','EB-024','broken','Standard','Open','now')");
  transfer.arrive({observedVehicleIds:['EB-024']}); await repo.arriveTransfer(transfer);
  const row=db.prepare("SELECT status,hub_id FROM electric_vehicles WHERE id='EB-024'").get();
  assert.equal(row.status,'Faulty'); assert.equal(row.hub_id,'bku'); db.close();
});

test('duplicate transfer IDs are rejected before persistence', () => {
  assert.throws(()=>new Transfer({id:'dup-v',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['v','v'],destinationSlotIds:['s1','s2']}),{code:'INVALID_INPUT'});
  assert.throws(()=>new Transfer({id:'dup-s',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['v1','v2'],destinationSlotIds:['s','s']}),{code:'INVALID_INPUT'});
});

test('ineligible vehicle or late slot failure rolls back the whole transfer', async () => {
 const db=new DatabaseSync(':memory:'); const base=path.resolve(__dirname,'../../../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 const repo=new SQLiteTransferRepository(new SQLiteClient(db));
 const order=(id,vehicles,slots)=>new Transfer({id,sourceHubId:'metro',destinationHubId:'bku',vehicleIds:vehicles,destinationSlotIds:slots,createdBy:'op'});
 await assert.rejects(repo.createTransfer(order('low',['EB-024','EM-012'],['bku-A01','bku-A02'])));
 await assert.rejects(repo.createTransfer(order('wrong',['EB-024','EB-111'],['bku-A01','bku-A02'])));
 db.exec("UPDATE parking_slots SET status='Occupied' WHERE id='bku-A02'");
 await assert.rejects(repo.createTransfer(order('partial',['EB-024','EB-031'],['bku-A01','bku-A02'])));
 assert.equal(db.prepare('SELECT count(*) AS n FROM transfers').get().n,0);
 assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Available');
 assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status,'Available'); db.close();
});
