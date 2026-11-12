const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');
const { initializeDatabase } = require('../../db/initialize');

test('initializer refuses unversioned nonempty and future-version databases without altering their records', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mobility-initialize-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'db.sqlite');
  let db = new DatabaseSync(file); db.exec("CREATE TABLE existing(value TEXT); INSERT INTO existing VALUES ('preserved')"); db.close();
  assert.throws(() => initializeDatabase(file), /nonempty/);
  db = new DatabaseSync(file); assert.equal(db.prepare('SELECT value FROM existing').get().value, 'preserved'); db.exec('PRAGMA user_version=999'); db.close();
  assert.throws(() => initializeDatabase(file), /Unsupported/);
});

test('published Minh draft versions 8 and 9 upgrade to the merged sequence without losing trips or saved outcomes', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mobility-legacy-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.resolve(__dirname, '../../db');
  const files = fs.readdirSync(path.join(source, 'migrations')).filter(file => /^\d+.*\.sql$/.test(file)).sort();
  for (const version of [8, 9]) {
    const file = path.join(directory, `legacy-${version}.sqlite`);
    let db = new DatabaseSync(file);
    for (const migration of files.slice(0, 7)) db.exec(fs.readFileSync(path.join(source, 'migrations', migration), 'utf8'));
    db.exec(fs.readFileSync(path.join(source, 'seed.sql'), 'utf8'));
    db.exec(fs.readFileSync(path.join(source, 'migrations/0010_mobility_lifecycle.sql'), 'utf8'));
    db.exec(`INSERT INTO vehicle_reservations VALUES ('r','u','EB-024','metro','Fulfilled','ticket','2026-01-01T00:00:00Z','2026-01-01T00:15:00Z','t');
      INSERT INTO mobility_trips(id,reservation_id,user_id,vehicle_id,status,started_at) VALUES ('t','r','u','EB-024','Active','2026-01-01T00:00:01Z');
      UPDATE electric_vehicles SET status='InUse',trip_id='t' WHERE id='EB-024';
      INSERT INTO mobility_outcomes VALUES ('scope','hash',200,'{"id":"t"}');`);
    if (version === 9) {
      db.exec(fs.readFileSync(path.join(source, 'migrations/0011_simulation_results.sql'), 'utf8'));
      db.exec("INSERT INTO simulation_results VALUES ('sim','op','2026-01-01T00:00:00Z','{}','{\"id\":\"sim\"}')");
    }
    db.exec(`PRAGMA user_version=${version}`); db.close();
    initializeDatabase(file);
    db = new DatabaseSync(file);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 12);
    assert.ok(db.prepare("SELECT name FROM sqlite_schema WHERE name = 'parking_reservations'").get());
    assert.ok(db.prepare('PRAGMA table_info(incidents)').all().some(column => column.name === 'isolation_verified_at'));
    assert.ok(db.prepare('PRAGMA table_info(transfer_destination_slots)').all().some(column => column.name === 'assigned_vehicle_id'));
    assert.equal(db.prepare("SELECT status FROM mobility_trips WHERE id='t'").get().status, 'Active');
    assert.equal(db.prepare("SELECT ticket_code FROM vehicle_reservations WHERE id='r'").get().ticket_code, 'ticket');
    assert.equal(db.prepare('SELECT response_json FROM mobility_outcomes').get().response_json, '{"id":"t"}');
    if (version === 9) assert.equal(db.prepare('SELECT id FROM simulation_results').get().id, 'sim');
    db.close();
    initializeDatabase(file);
  }
});
