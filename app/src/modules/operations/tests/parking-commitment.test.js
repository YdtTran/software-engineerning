const {test}=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs'); const path=require('node:path'); const {DatabaseSync}=require('node:sqlite');
const {SQLiteClient}=require('../infrastructure/sqlite-client'); const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo');
function setup(){const db=new DatabaseSync(':memory:'); const base=path.resolve(__dirname,'../../../../db'); for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8')); const repo=new SQLiteInventoryRepository(new SQLiteClient(db)); return {db,repo};}
function at(hours){return new Date(Date.now()+hours*3600000).toISOString();}
test('future commitments can coexist with occupancy but overlapping intervals cannot',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='advance',status='Occupied',occupancy_id='existing' WHERE id='bku-A01'");
 const first={pool:'advance',hubId:'bku',plannedArrival:at(24),plannedCheckout:at(26),expiresAt:at(25)};
 await repo.holdSlotForReservation('bku-A01','future-1',first);
 await assert.rejects(repo.holdSlotForReservation('bku-A01','overlap',{...first,plannedArrival:at(25),plannedCheckout:at(27)}));
 await repo.holdSlotForReservation('bku-A01','future-2',{...first,plannedArrival:first.plannedCheckout,plannedCheckout:at(28),expiresAt:at(27)});
 assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status,'Occupied');
 db.close();
});
test('check-in and checkout preserve future commitments and physical occupancy',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='advance' WHERE id='bku-A01'");
 const now=Date.now(), stamp=ms=>new Date(now+ms).toISOString();
 db.prepare("INSERT INTO parking_commitments (reservation_id,slot_id,pool,starts_at,ends_at,expires_at,status) VALUES (?,?,?,?,?,?,'Reserved')").run('arriving','bku-A01','advance',stamp(-60000),stamp(3600000),stamp(1800000));
 await repo.holdSlotForReservation('bku-A01','future',{pool:'advance',hubId:'bku',plannedArrival:stamp(7200000),plannedCheckout:stamp(10800000),expiresAt:stamp(9000000)});
 await repo.occupySlot('bku-A01','visit','arriving','bku');
 assert.equal(db.prepare("SELECT status FROM parking_commitments WHERE reservation_id='arriving'").get().status,'Fulfilled');
 await assert.rejects(repo.releaseSlotHold('bku-A01','arriving'));
 await repo.vacateSlot('bku-A01','visit');
 assert.equal(db.prepare("SELECT status FROM parking_commitments WHERE reservation_id='future'").get().status,'Reserved');
 assert.ok(db.prepare("SELECT released_at FROM parking_commitments WHERE reservation_id='arriving'").get().released_at); db.close();
});
test('expired commitment releases only its own hold',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='immediate' WHERE id='bku-A01'");
 await repo.holdSlotForReservation('bku-A01','short',{pool:'immediate',hubId:'bku',expiresAt:at(1)});
 db.exec("UPDATE parking_commitments SET expires_at='2000-01-01T00:00:00.000Z' WHERE reservation_id='short'");
 await repo.expireSlotHold('bku-A01','short');
 assert.equal(db.prepare("SELECT status FROM parking_commitments WHERE reservation_id='short'").get().status,'Expired');
 assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status,'Available'); db.close();
});
test('transfer cannot consume capacity already committed for a future interval',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='advance' WHERE id='bku-A01'");
 await repo.holdSlotForReservation('bku-A01','future',{pool:'advance',hubId:'bku',plannedArrival:at(24),plannedCheckout:at(26),expiresAt:at(25)});
 const {SQLiteTransferRepository}=require('../infrastructure/sqlite-transfer-repo'); const {Transfer}=require('../domain/transfer');
 const transfers=new SQLiteTransferRepository(repo.client); const transfer=new Transfer({id:'transfer',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['EB-024'],destinationSlotIds:['bku-A01'],createdBy:'op'});
 await assert.rejects(transfers.createTransfer(transfer),{code:'SLOT_HOLD_FAILED'});
 assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Available'); db.close();
});
test('availability uses pool and half-open intervals',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='advance' WHERE id IN ('bku-A01','bku-A02')");
 const start=at(24), end=at(26); await repo.holdSlotForReservation('bku-A01','r1',{pool:'advance',hubId:'bku',plannedArrival:start,plannedCheckout:end,expiresAt:at(25)});
 const overlapping=await repo.getAvailableSlots('bku','advance',{plannedArrival:at(25),plannedCheckout:at(27)});
 assert.ok(!overlapping.some(s=>s.id==='bku-A01')); assert.ok(overlapping.some(s=>s.id==='bku-A02'));
 const adjacent=await repo.getAvailableSlots('bku','advance',{plannedArrival:end,plannedCheckout:at(28)});
 assert.ok(adjacent.some(s=>s.id==='bku-A01')); db.close();
});
test('expired or early check-in cannot consume a physical slot',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='advance' WHERE id='bku-A01'");
 await repo.holdSlotForReservation('bku-A01','early',{pool:'advance',hubId:'bku',plannedArrival:at(24),plannedCheckout:at(26),expiresAt:at(25)});
 await assert.rejects(repo.occupySlot('bku-A01','visit','early','bku'));
 assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status,'Available'); db.close();
});
test('return cannot overwrite a future parking commitment',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='advance' WHERE id='bku-A01'");
 await repo.holdSlotForReservation('bku-A01','future',{pool:'advance',hubId:'bku',plannedArrival:at(24),plannedCheckout:at(26),expiresAt:at(25)});
 await repo.reserveVehicle('EB-024','r','metro'); await repo.claimVehiclePickup('EB-024','r','metro'); await repo.pickupVehicle('EB-024','trip','r','metro');
 await assert.rejects(repo.returnVehicle('EB-024','bku','bku-A01',80,'trip'),{code:'SLOT_UNAVAILABLE'});
 assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'InUse'); db.close();
});
test('new parking slots require and persist a fixed pool',async()=>{
 const {db,repo}=setup(); const {InventoryService}=require('../application/inventory-service'); const service=new InventoryService(repo);
 await assert.rejects(service.createResource({kind:'slot',hubId:'bku',attributes:{id:'new-slot',code:'X'}}),{code:'INVALID_INPUT'});
 const slot=await service.createResource({kind:'slot',hubId:'bku',attributes:{id:'new-slot',code:'X',pool:'advance'}});
 assert.equal(slot.attributes.pool,'advance'); assert.equal(db.prepare("SELECT pool FROM parking_slots WHERE id='new-slot'").get().pool,'advance'); db.close();
});
test('concurrent overlapping commitments on separate connections have one winner',async t=>{
 const os=require('node:os'), {Worker}=require('node:worker_threads'); const dir=fs.mkdtempSync(path.join(os.tmpdir(),'parking-race-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'db.sqlite'), db=new DatabaseSync(file), base=path.resolve(__dirname,'../../../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 db.exec("UPDATE parking_slots SET pool='advance' WHERE id='bku-A01'");
 const barrier=new SharedArrayBuffer(4), client=require.resolve('../infrastructure/sqlite-client'), repo=require.resolve('../infrastructure/sqlite-inventory-repo');
 const req={pool:'advance',hubId:'bku',plannedArrival:at(24),plannedCheckout:at(26),expiresAt:at(25)};
 const code=`const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite'); const {SQLiteClient}=require(workerData.client),{SQLiteInventoryRepository}=require(workerData.repo);(async()=>{const db=new DatabaseSync(workerData.file);db.exec('PRAGMA busy_timeout=5000'); const repo=new SQLiteInventoryRepository(new SQLiteClient(db));const b=new Int32Array(workerData.barrier);Atomics.add(b,0,1);Atomics.notify(b,0);while(Atomics.load(b,0)<2) Atomics.wait(b,0,1);try{await repo.holdSlotForReservation('bku-A01',workerData.id,workerData.req);parentPort.postMessage('ok')}catch(e){parentPort.postMessage(e.code||e.message)}db.close()})().catch(e=>{throw e});`;
 const results=await Promise.all(['one','two'].map(id=>new Promise((resolve,reject)=>{const w=new Worker(code,{eval:true,workerData:{id,req,file,barrier,client,repo}});w.once('message',resolve);w.once('error',reject)})));
 assert.equal(results.filter(x=>x==='ok').length,1,JSON.stringify(results)); assert.equal(db.prepare("SELECT count(*) AS n FROM parking_commitments WHERE status='Reserved'").get().n,1); db.close();
});
test('owning module can atomically roll back its reservation and slot commitment',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='advance' WHERE id='bku-A01'; CREATE TABLE external_reservations(id TEXT PRIMARY KEY)");
 await assert.rejects(repo.client.transaction(async()=>{
  await repo.client.run("INSERT INTO external_reservations VALUES ('r')");
  await repo.holdSlotForReservation('bku-A01','r',{pool:'advance',hubId:'bku',plannedArrival:at(24),plannedCheckout:at(26),expiresAt:at(25)});
  throw new Error('rollback');
 }),/rollback/);
 assert.equal(db.prepare('SELECT count(*) AS n FROM external_reservations').get().n,0);
 assert.equal(db.prepare('SELECT count(*) AS n FROM parking_commitments').get().n,0); db.close();
});
test('future commitment and transfer contend atomically on separate connections',async t=>{
 const os=require('node:os'), {Worker}=require('node:worker_threads'); const dir=fs.mkdtempSync(path.join(os.tmpdir(),'parking-transfer-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'db.sqlite'), db=new DatabaseSync(file), base=path.resolve(__dirname,'../../../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql','migrations/0007_vehicle_pickup_claim.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 db.exec("UPDATE parking_slots SET pool='advance' WHERE id='bku-A01'");
 const barrier=new SharedArrayBuffer(4), client=require.resolve('../infrastructure/sqlite-client'), inventory=require.resolve('../infrastructure/sqlite-inventory-repo'), transfers=require.resolve('../infrastructure/sqlite-transfer-repo'), domain=require.resolve('../domain/transfer');
 const req={pool:'advance',hubId:'bku',plannedArrival:at(24),plannedCheckout:at(26),expiresAt:at(25)};
 const code=`const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');const {SQLiteClient}=require(workerData.client),{SQLiteInventoryRepository}=require(workerData.inventory),{SQLiteTransferRepository}=require(workerData.transfers),{Transfer}=require(workerData.domain);(async()=>{const db=new DatabaseSync(workerData.file);db.exec('PRAGMA busy_timeout=5000');const client=new SQLiteClient(db),b=new Int32Array(workerData.barrier);Atomics.add(b,0,1);Atomics.notify(b,0);while(Atomics.load(b,0)<2)Atomics.wait(b,0,1);try{if(workerData.kind==='parking')await new SQLiteInventoryRepository(client).holdSlotForReservation('bku-A01','reservation',workerData.req);else await new SQLiteTransferRepository(client).createTransfer(new Transfer({id:'transfer',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['EB-024'],destinationSlotIds:['bku-A01'],createdBy:'op'}));parentPort.postMessage('ok')}catch(e){parentPort.postMessage(e.code||e.message)}db.close()})().catch(e=>{throw e});`;
 const results=await Promise.all(['parking','transfer'].map(kind=>new Promise((resolve,reject)=>{const w=new Worker(code,{eval:true,workerData:{kind,file,barrier,client,inventory,transfers,domain,req}});w.once('message',resolve);w.once('error',reject)})));
 assert.equal(results.filter(x=>x==='ok').length,1,JSON.stringify(results)); db.close();
});
test('reservation expiry is rechecked after waiting for the transaction lock',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='immediate' WHERE id='bku-A01'");
 let release,started; const gate=new Promise(resolve=>release=resolve), entered=new Promise(resolve=>started=resolve);
 const blocker=repo.client.transaction(async()=>{started(); await gate;}); await entered;
 const pending=repo.holdSlotForReservation('bku-A01','expired-while-waiting',{pool:'immediate',hubId:'bku',expiresAt:new Date(Date.now()+30).toISOString()});
 await new Promise(resolve=>setTimeout(resolve,60)); release(); await blocker;
 await assert.rejects(pending,{code:'INVALID_INPUT'}); assert.equal(db.prepare('SELECT count(*) AS n FROM parking_commitments').get().n,0); db.close();
});
test('duplicate reservation identifiers produce a domain conflict',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='advance' WHERE id IN ('bku-A01','bku-A02')");
 const req={pool:'advance',hubId:'bku',plannedArrival:at(24),plannedCheckout:at(26),expiresAt:at(25)};
 await repo.holdSlotForReservation('bku-A01','same',req);
 await assert.rejects(repo.holdSlotForReservation('bku-A02','same',req),{code:'RESERVATION_CONFLICT'}); db.close();
});
test('slot holds and check-ins must match the expected hub',async()=>{
 const {db,repo}=setup(); db.exec("UPDATE parking_slots SET pool='immediate' WHERE id='bku-A01'");
 const req={pool:'immediate',hubId:'metro',expiresAt:at(1)};
 await assert.rejects(repo.holdSlotForReservation('bku-A01','wrong',req),{code:'SLOT_UNAVAILABLE'});
 await repo.holdSlotForReservation('bku-A01','right',{...req,hubId:'bku'});
 await assert.rejects(repo.occupySlot('bku-A01','visit','right','metro'),{code:'SLOT_UNAVAILABLE'});
 assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A01'").get().status,'Held'); db.close();
});
