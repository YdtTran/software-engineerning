const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createOperationsModule } = require('../index');
const { applyMigrations } = require('./fixtures/operations-fixtures');

async function createResource(app, request) {
  const result = {statusCode:200,body:null};
  const res = {status(code) {result.statusCode=code; return this;},json(body) {result.body=body; return this;}};
  await app.controller.createResource({...request,method:'POST',path:'/operations/resources'},res);
  return result;
}

test('duplicate request survives a process restart and rejects a different payload', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-idem-'));
  t.after(() => fs.rmSync(dir, {recursive:true,force:true}));
  const file = path.join(dir, 'db.sqlite');
  let db = new DatabaseSync(file);
  applyMigrations(db);
  const request = (batteryPercent=80) => ({user:{id:'op',role:'operator'},headers:{'idempotency-key':'K'},body:{kind:'vehicle',hubId:'metro',attributes:{id:'idem-vehicle',batteryPercent}}});
  let app = createOperationsModule({db});
  const first = await createResource(app,request());
  assert.equal(first.statusCode,201);
  db.close();
  require('../api/idempotency').defaultIdempotencyStore.clear();
  db = new DatabaseSync(file);
  app = createOperationsModule({db});
  const repeat = await createResource(app,request());
  assert.equal(repeat.statusCode,201);
  assert.deepEqual(repeat.body,first.body);
  const conflict = await createResource(app,request(90));
  assert.equal(conflict.statusCode,409);
  assert.equal(conflict.body.error.code,'IDEMPOTENCY_KEY_REUSED');
  db.close();
});

test('concurrent duplicate writes share a committed result and failed writes retry', async () => {
  const { SQLiteClient } = require('../infrastructure/sqlite-client');
  const { SQLiteIdempotencyStore } = require('../api/idempotency');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE idempotency_outcomes (scope TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, status_code INTEGER NOT NULL, response_body TEXT NOT NULL, expires_at INTEGER NOT NULL); CREATE TABLE writes (id INTEGER)');
  const client = new SQLiteClient(db);
  const store = new SQLiteIdempotencyStore(client);
  const req = { headers: {'idempotency-key':'same'}, method:'POST', path:'/a', body:{value:1} };
  let attempts = 0;
  const action = async () => { attempts++; await client.run('INSERT INTO writes VALUES (1)'); return {status:201,body:{id:1}}; };
  const [a,b] = await Promise.all([store.execute(req,'u',action),store.execute(req,'u',action)]);
  assert.deepEqual(a,b);
  assert.equal(attempts,1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM writes').get().n,1);
  const failing = {...req,headers:{'idempotency-key':'fail'}};
  const failure = await store.execute(failing,'u',async () => { await client.run('INSERT INTO writes VALUES (2)'); return {status:409,body:{error:'fail'}}; });
  assert.equal(failure.status,409);
  assert.equal(db.prepare('SELECT count(*) AS n FROM writes').get().n,1);
  assert.equal((await store.execute(failing,'u',action)).status,201);
  assert.equal((await store.execute(req,'other',action)).status,201);
  db.exec('UPDATE idempotency_outcomes SET expires_at=0');
  assert.equal((await store.execute(req,'u',action)).status,201);
  assert.equal(attempts,4);
  db.close();
});

test('same idempotency key serializes writes across separate SQLite connections', async t => {
  const {Worker}=require('node:worker_threads');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ops-idem-race-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'db.sqlite'); const db=new DatabaseSync(file);
  db.exec('CREATE TABLE idempotency_outcomes (scope TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,status_code INTEGER NOT NULL,response_body TEXT NOT NULL,expires_at INTEGER NOT NULL); CREATE TABLE writes(id INTEGER)');
  const barrier=new SharedArrayBuffer(4); const clientPath=require.resolve('../infrastructure/sqlite-client'); const storePath=require.resolve('../api/idempotency');
  const code=`const {parentPort,workerData}=require('node:worker_threads'); const {DatabaseSync}=require('node:sqlite'); const {SQLiteClient}=require(workerData.clientPath); const {SQLiteIdempotencyStore}=require(workerData.storePath);
  (async()=>{const db=new DatabaseSync(workerData.file); db.exec('PRAGMA busy_timeout=5000'); const client=new SQLiteClient(db); const store=new SQLiteIdempotencyStore(client); const b=new Int32Array(workerData.barrier); Atomics.add(b,0,1); Atomics.notify(b,0); while(Atomics.load(b,0)<2) Atomics.wait(b,0,1); const result=await store.execute({headers:{'idempotency-key':'k'},method:'POST',path:'/a',body:{x:1}},'actor',async()=>{await client.run('INSERT INTO writes VALUES (1)'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50); return {status:201,body:{id:'one'}}}); parentPort.postMessage(result); db.close()})().catch(e=>{throw e});`;
  const results=await Promise.all([1,2].map(()=>new Promise((resolve,reject)=>{const w=new Worker(code,{eval:true,workerData:{file,barrier,clientPath,storePath}}); w.once('message',resolve); w.once('error',reject)})));
  assert.deepEqual(results[0],results[1]); assert.equal(db.prepare('SELECT count(*) AS n FROM writes').get().n,1); db.close();
});

test('write without idempotency key is rejected before changing data', async () => {
 const db=new DatabaseSync(':memory:');
 applyMigrations(db);
 const app=createOperationsModule({db}); const result=await createResource(app,{user:{id:'op',role:'operator'},headers:{},body:{kind:'vehicle',hubId:'metro',attributes:{id:'without-key'}}});
 assert.equal(result.statusCode,400); assert.equal(db.prepare("SELECT count(*) AS n FROM electric_vehicles WHERE id='without-key'").get().n,0); db.close();
});
