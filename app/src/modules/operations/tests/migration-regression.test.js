const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const init = path.resolve(__dirname, '../../../../db/init.sh');

test('fresh initialization applies all migrations and repeat is safe', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'operations-migrate-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const shim = path.join(dir, 'sqlite3');
  fs.writeFileSync(shim, `#!/usr/bin/env node\nconst {DatabaseSync}=require('node:sqlite'); const fs=require('fs'); const a=process.argv.slice(2).filter(x=>x!=='-batch'&&x!=='-bail'); if(a[0]==='-cmd') a.splice(0,2); const db=new DatabaseSync(a[0]); const sql=a[1]||fs.readFileSync(0,'utf8'); if(sql.trim()==='PRAGMA user_version;') console.log(db.prepare(sql).get().user_version); else db.exec(sql); db.close();\n`, { mode: 0o755 });
  const file = path.join(dir, 'db.sqlite');
  const run = () => spawnSync(init, [file], { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, NODE_NO_WARNINGS: '1' } });
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  let db = new DatabaseSync(file);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
  assert.ok(db.prepare("SELECT name FROM sqlite_schema WHERE name = 'transfers'").get());
  const count = db.prepare('SELECT count(*) AS n FROM mobility_hubs').get().n;
  db.close();
  result = run();
  assert.equal(result.status, 0, result.stderr);
  db = new DatabaseSync(file);
  assert.equal(db.prepare('SELECT count(*) AS n FROM mobility_hubs').get().n, count);
  db.close();
});

test('version 1 upgrades without data loss and failed migration rolls back', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'operations-upgrade-'));
  t.after(() => fs.rmSync(dir, {recursive:true,force:true}));
  const source = path.resolve(__dirname, '../../../../db');
  const scripts = path.join(dir,'db'); fs.cpSync(source,scripts,{recursive:true,filter: p => !p.includes('/.local')});
  fs.writeFileSync(path.join(dir,'sqlite3'), `#!/usr/bin/env node\nconst {DatabaseSync}=require('node:sqlite'); const fs=require('fs'); const a=process.argv.slice(2).filter(x=>x!=='-batch'&&x!=='-bail'); if(a[0]==='-cmd') a.splice(0,2); const db=new DatabaseSync(a[0]); const sql=a[1]||fs.readFileSync(0,'utf8'); if(sql.trim()==='PRAGMA user_version;') console.log(db.prepare(sql).get().user_version); else db.exec(sql); db.close();\n`,{mode:0o755});
  const file=path.join(dir,'upgrade.sqlite'); let db=new DatabaseSync(file);
  db.exec(fs.readFileSync(path.join(scripts,'migrations/0001_hub_inventory.sql'),'utf8'));
  db.exec(fs.readFileSync(path.join(scripts,'seed.sql'),'utf8'));
  db.exec("INSERT INTO mobility_hubs VALUES ('custom','Preserved'); PRAGMA user_version=1"); db.close();
  const migration=path.join(scripts,'migrations/0002_operations_schema.sql');
  const sql=fs.readFileSync(migration,'utf8'); fs.appendFileSync(migration,'\nTHIS IS INVALID SQL;\n');
  const run=()=>spawnSync(path.join(scripts,'init.sh'),[file],{encoding:'utf8',env:{...process.env,PATH:`${dir}:${process.env.PATH}`,NODE_NO_WARNINGS:'1'}});
  assert.notEqual(run().status,0);
  db=new DatabaseSync(file); assert.equal(db.prepare('PRAGMA user_version').get().user_version,1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM pragma_table_info('electric_vehicles') WHERE name='status'").get().n,0); db.close();
  fs.writeFileSync(migration,sql);
  const result=run(); assert.equal(result.status,0,result.stderr);
  db=new DatabaseSync(file); assert.equal(db.prepare('PRAGMA user_version').get().user_version,8);
  assert.equal(db.prepare("SELECT name FROM mobility_hubs WHERE id='custom'").get().name,'Preserved'); db.close();
});

test('ownership migration reconstructs active transfer holds without claiming legacy reservations', () => {
  const db = new DatabaseSync(':memory:'); const base = path.resolve(__dirname,'../../../../db');
  for (const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0003_idempotency.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
  db.exec("INSERT INTO transfers(id,source_hub_id,destination_hub_id,status,created_at,created_by) VALUES('t','metro','bku','Planned','now','op'); INSERT INTO transfer_vehicles VALUES('t','EB-024'); INSERT INTO transfer_destination_slots VALUES('t','bku-A01'); UPDATE electric_vehicles SET status='TransferHeld' WHERE id='EB-024'; UPDATE parking_slots SET status='Held' WHERE id='bku-A01'; UPDATE parking_slots SET status='Held' WHERE id='bku-A02';");
  db.exec(fs.readFileSync(path.join(base,'migrations/0004_inventory_ownership.sql'),'utf8'));
  assert.equal(db.prepare("SELECT transfer_hold_id FROM electric_vehicles WHERE id='EB-024'").get().transfer_hold_id,'t');
  assert.equal(db.prepare("SELECT transfer_hold_id FROM parking_slots WHERE id='bku-A01'").get().transfer_hold_id,'t');
  assert.equal(db.prepare("SELECT reservation_id FROM parking_slots WHERE id='bku-A02'").get().reservation_id,null);
  db.close();
});

test('legacy vehicle holds with unknown expiry remain locked for reconciliation', async () => {
 const {SQLiteClient}=require('../infrastructure/sqlite-client'); const {SQLiteInventoryRepository}=require('../infrastructure/sqlite-inventory-repo');
 const db=new DatabaseSync(':memory:'), base=path.resolve(__dirname,'../../../../db');
 for(const f of ['migrations/0001_hub_inventory.sql','seed.sql','migrations/0002_operations_schema.sql','migrations/0003_idempotency.sql','migrations/0004_inventory_ownership.sql','migrations/0005_parked_vehicle.sql','migrations/0006_parking_commitments.sql']) db.exec(fs.readFileSync(path.join(base,f),'utf8'));
 db.exec("UPDATE electric_vehicles SET status='Reserved',reservation_id='legacy' WHERE id='EB-024'");
 db.exec(fs.readFileSync(path.join(base,'migrations/0007_vehicle_pickup_claim.sql'),'utf8'));
 const repo=new SQLiteInventoryRepository(new SQLiteClient(db));
 await assert.rejects(repo.claimVehiclePickup('EB-024','legacy','metro'),{code:'VEHICLE_CANNOT_PICKUP'});
 assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='EB-024'").get().status,'Reserved'); db.close();
});
