const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { SQLiteClient } = require('../infrastructure/sqlite-client');

test('a synchronous SQLite serialization API is not mistaken for a callback driver', async () => {
  const db = new DatabaseSync(':memory:');
  if (typeof db.serialize !== 'function') db.serialize = () => new Uint8Array();
  const client = new SQLiteClient(db);
  await client.exec('CREATE TABLE synchronous_api(value TEXT)');
  await client.run("INSERT INTO synchronous_api VALUES ('ok')");
  assert.equal((await client.get('SELECT value FROM synchronous_api')).value, 'ok');
  db.close();
});

test('transaction rolls back asynchronous callback failures', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE entries (value TEXT)');
  const client = new SQLiteClient(db);
  await assert.rejects(client.transaction(async () => {
    await client.run("INSERT INTO entries VALUES ('first')");
    await Promise.resolve();
    throw new Error('failure');
  }), /failure/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM entries').get().n, 0);
  db.close();
});

test('unrelated operations wait until transaction rollback', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE entries (value TEXT)');
  const client = new SQLiteClient(db);
  let started;
  const entered = new Promise(resolve => { started = resolve; });
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const txn = client.transaction(async () => {
    await client.run("INSERT INTO entries VALUES ('rolled back')");
    started();
    await wait;
    throw new Error('failure');
  });
  await entered;
  const outside = client.run("INSERT INTO entries VALUES ('kept')");
  release();
  await assert.rejects(txn, /failure/);
  await outside;
  assert.deepEqual(db.prepare('SELECT value FROM entries').all().map(row => row.value), ['kept']);
  db.close();
});

test('application connections enforce foreign keys', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('CREATE TABLE parent (id INTEGER PRIMARY KEY); CREATE TABLE child (parent_id INTEGER REFERENCES parent(id))');
  const client = new SQLiteClient(db);
  await assert.rejects(client.run('INSERT INTO child VALUES (42)'), /FOREIGN KEY/);
  db.close();
});

test('better-sqlite3 commits and rolls back asynchronous transaction callbacks', async t => {
  let Database;
  try { Database = require('better-sqlite3'); } catch { t.skip('better-sqlite3 is not installed'); return; }
  const db = new Database(':memory:'); db.exec('CREATE TABLE entries (value TEXT)');
  const client = new SQLiteClient(db);
  await client.transaction(async () => { await client.run("INSERT INTO entries VALUES ('committed')"); await Promise.resolve(); });
  await assert.rejects(client.transaction(async () => { await client.run("INSERT INTO entries VALUES ('rolled back')"); await Promise.resolve(); throw new Error('failure'); }), /failure/);
  assert.deepEqual(db.prepare('SELECT value FROM entries').all().map(row=>row.value),['committed']);
  db.close();
});

test('callbacks spawned by a finished transaction cannot enter a later transaction', async () => {
  const db=new DatabaseSync(':memory:'); db.exec('CREATE TABLE entries(value TEXT)'); const client=new SQLiteClient(db);
  let fire, finished; const gate=new Promise(resolve=>fire=resolve); const callbackDone=new Promise(resolve=>finished=resolve);
  await client.transaction(async()=>{ gate.then(async()=>{await client.run("INSERT INTO entries VALUES ('outside')"); finished();}); });
  let started, release; const entered=new Promise(resolve=>started=resolve); const pause=new Promise(resolve=>release=resolve);
  const tx=client.transaction(async()=>{await client.run("INSERT INTO entries VALUES ('rollback')"); started(); await pause; throw new Error('rollback');});
  await entered; fire(); await new Promise(resolve=>setImmediate(resolve)); release();
  await assert.rejects(tx,/rollback/); await callbackDone;
  assert.deepEqual(db.prepare('SELECT value FROM entries').all().map(r=>r.value),['outside']); db.close();
});

test('parallel nested transactions preserve their savepoint boundaries', async () => {
  const db=new DatabaseSync(':memory:'); db.exec('CREATE TABLE entries(value TEXT)'); const client=new SQLiteClient(db);
  await client.transaction(async()=>{
    await Promise.all([
      client.transaction(async()=>{await client.run("INSERT INTO entries VALUES ('first')");}),
      client.transaction(async()=>{await client.run("INSERT INTO entries VALUES ('second')"); await new Promise(resolve=>setImmediate(resolve));})
    ]);
  });
  assert.equal(db.prepare('SELECT count(*) AS n FROM entries').get().n,2); db.close();
});

test('sqlite3 callback driver commits and rolls back asynchronous transactions', async t => {
  let sqlite3; try {sqlite3=require('sqlite3');} catch {t.skip('sqlite3 package is not installed'); return;}
  const db=new sqlite3.Database(':memory:'); const client=new SQLiteClient(db);
  await client.exec('CREATE TABLE entries(value TEXT)');
  await client.transaction(async()=>{await client.run("INSERT INTO entries VALUES ('committed')");});
  await assert.rejects(client.transaction(async()=>{await client.run("INSERT INTO entries VALUES ('rollback')"); throw new Error('failure');}),/failure/);
  assert.deepEqual((await client.all('SELECT value FROM entries')).map(row=>row.value),['committed']);
  await new Promise((resolve,reject)=>db.close(err=>err?reject(err):resolve()));
});

test('client refuses an already-open transaction with foreign keys disabled', async () => {
  const db=new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys = OFF; BEGIN'); const client=new SQLiteClient(db);
  await assert.rejects(client.run('SELECT 1'), /foreign keys/i);
  db.exec('ROLLBACK'); db.close();
});

test('nested failure rolls back its savepoint without losing outer changes', async () => {
 const db=new DatabaseSync(':memory:'); db.exec('CREATE TABLE entries(value TEXT)'); const client=new SQLiteClient(db);
 await client.transaction(async()=>{
  await client.run("INSERT INTO entries VALUES ('outer')");
  await assert.rejects(client.transaction(async()=>{await client.run("INSERT INTO entries VALUES ('nested')"); throw new Error('nested failure');}),/nested failure/);
  await client.run("INSERT INTO entries VALUES ('after')");
 });
 assert.deepEqual(db.prepare('SELECT value FROM entries').all().map(row=>row.value),['outer','after']); db.close();
});
