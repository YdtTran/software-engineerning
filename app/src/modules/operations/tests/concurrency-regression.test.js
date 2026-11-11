const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');
const { applyMigrations } = require('./fixtures/operations-fixtures');
const clientPath = require.resolve('../infrastructure/sqlite-client');
const repoPath = require.resolve('../infrastructure/sqlite-transfer-repo');
const transferPath = require.resolve('../domain/transfer');
const workerCode = `
const { parentPort, workerData } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');
const { SQLiteClient } = require(workerData.clientPath);
const { SQLiteTransferRepository } = require(workerData.repoPath);
const { Transfer } = require(workerData.transferPath);
(async () => {
 const db = new DatabaseSync(workerData.file); db.exec('PRAGMA busy_timeout=5000');
 const repo = new SQLiteTransferRepository(new SQLiteClient(db));
 const existing = workerData.action ? await repo.getTransferById(workerData.id) : null;
 const barrier = new Int32Array(workerData.barrier); Atomics.add(barrier,0,1); Atomics.notify(barrier,0);
 while (Atomics.load(barrier,0) < 2) Atomics.wait(barrier,0,1);
 try {
  if (workerData.action === 'depart') { existing.depart({}); await repo.departTransfer(existing); }
  else if (workerData.action === 'cancel') { existing.cancel({}); await repo.cancelTransfer(existing); }
  else if (workerData.action === 'arrive') { existing.arrive({observedVehicleIds:existing.vehicleIds}); await repo.arriveTransfer(existing); }
  else await repo.createTransfer(new Transfer({id:workerData.id,sourceHubId:'metro',destinationHubId:'bku',vehicleIds:[workerData.vehicle],destinationSlotIds:[workerData.slot],createdBy:'op'}));
  parentPort.postMessage('success');
 } catch (err) { parentPort.postMessage(err.code || err.message); }
 db.close();
})().catch(err => { throw err; });`;

test('separate SQLite connections reject conflicting vehicle and slot claims', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'ops-race-')); t.after(() => fs.rmSync(dir,{recursive:true,force:true}));
  const file = path.join(dir,'race.sqlite'); const db = new DatabaseSync(file);
  applyMigrations(db);
  async function race(first, second) {
    const barrier = new SharedArrayBuffer(4);
    return Promise.all([first,second].map(data => new Promise((resolve,reject) => {
      const worker = new Worker(workerCode,{eval:true,workerData:{...data,file,barrier,clientPath,repoPath,transferPath}});
      worker.once('message',resolve); worker.once('error',reject);
    })));
  }
  let results = await race({id:'v1',vehicle:'EB-024',slot:'bku-A01'},{id:'v2',vehicle:'EB-024',slot:'bku-A02'});
  assert.equal(results.filter(x=>x==='success').length,1,JSON.stringify(results));
  results = await race({id:'s1',vehicle:'EB-031',slot:'bku-A03'},{id:'s2',vehicle:'EB-100',slot:'bku-A03'});
  assert.equal(results.filter(x=>x==='success').length,1,JSON.stringify(results));
  assert.equal(db.prepare('SELECT count(*) AS n FROM transfers').get().n,2);
  const {SQLiteClient} = require(clientPath); const {SQLiteTransferRepository} = require(repoPath); const {Transfer} = require(transferPath);
  const repo = new SQLiteTransferRepository(new SQLiteClient(db));
  await repo.createTransfer(new Transfer({id:'depart-cancel',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['EB-102'],destinationSlotIds:['bku-A04'],createdBy:'op'}));
  results = await race({id:'depart-cancel',action:'depart'},{id:'depart-cancel',action:'cancel'});
  assert.equal(results.filter(x=>x==='success').length,1,JSON.stringify(results));
  const state = db.prepare("SELECT status FROM transfers WHERE id='depart-cancel'").get().status;
  assert.ok(['InTransit','Cancelled'].includes(state));
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-102'").get().status,state === 'InTransit' ? 'InTransit' : 'Available');
  assert.equal(db.prepare("SELECT status FROM parking_slots WHERE id='bku-A04'").get().status,state === 'InTransit' ? 'Held' : 'Available');
  const arriving = new Transfer({id:'arrive-race',sourceHubId:'metro',destinationHubId:'bku',vehicleIds:['EB-104'],destinationSlotIds:['bku-A05'],createdBy:'op'});
  await repo.createTransfer(arriving); arriving.depart({}); await repo.departTransfer(arriving);
  results = await race({id:'arrive-race',action:'arrive'},{id:'arrive-race',action:'arrive'});
  assert.equal(results.filter(x=>x==='success').length,1,JSON.stringify(results));
  assert.equal(db.prepare("SELECT status FROM transfers WHERE id='arrive-race'").get().status,'Completed');
  assert.equal(db.prepare("SELECT parked_vehicle_id FROM parking_slots WHERE id='bku-A05'").get().parked_vehicle_id,'EB-104');
  db.close();
});

test('pickup claim and cancellation have one winner across SQLite connections', async t => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pickup-race-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'race.sqlite'), db=new DatabaseSync(file);
 applyMigrations(db);
 const {SQLiteClient}=require(clientPath), {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo');
 await new SQLiteInventoryRepository(new SQLiteClient(db)).reserveVehicle('EB-024','r','metro');
 const barrier=new SharedArrayBuffer(4), inventory=require.resolve('../infrastructure/sqlite-inventory-repo');
 const code=`const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');const {SQLiteClient}=require(workerData.clientPath),{SQLiteInventoryRepository}=require(workerData.inventory);(async()=>{const db=new DatabaseSync(workerData.file);db.exec('PRAGMA busy_timeout=5000');const repo=new SQLiteInventoryRepository(new SQLiteClient(db)),b=new Int32Array(workerData.barrier);Atomics.add(b,0,1);Atomics.notify(b,0);while(Atomics.load(b,0)<2)Atomics.wait(b,0,1);try{if(workerData.action==='claim')await repo.claimVehiclePickup('EB-024','r','metro');else await repo.releaseVehicleHold('EB-024','r');parentPort.postMessage('ok')}catch(e){parentPort.postMessage(e.code||e.message)}db.close()})().catch(e=>{throw e});`;
 const results=await Promise.all(['claim','cancel'].map(action=>new Promise((resolve,reject)=>{const worker=new Worker(code,{eval:true,workerData:{action,file,barrier,clientPath,inventory}});worker.once('message',resolve);worker.once('error',reject)})));
 assert.equal(results.filter(x=>x==='ok').length,1,JSON.stringify(results));
 const row=db.prepare("SELECT status,pickup_claimed FROM electric_vehicles WHERE id='EB-024'").get();
 assert.ok((row.status==='Reserved'&&row.pickup_claimed===1)||(row.status==='Available'&&row.pickup_claimed===0)); db.close();
});
