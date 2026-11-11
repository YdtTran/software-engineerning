const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function initializeDatabase(filename = path.join(__dirname, '.local', 'hub.sqlite'), directory = __dirname) {
  const resolved = path.resolve(filename);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const files = fs.readdirSync(path.join(directory, 'migrations')).filter(file => /^\d+.*\.sql$/.test(file)).sort();
  files.forEach((file, index) => {
    if (Number(file.match(/^\d+/)[0]) !== index + 1) throw new Error('Migration versions must be contiguous and unique.');
  });
  const db = new DatabaseSync(resolved);
  try {
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    let version = db.prepare('PRAGMA user_version').get().user_version;
    if (version > files.length) throw new Error(`Unsupported database version ${version}.`);
    // Earlier Minh branch commits used 8/9 before upstream independently
    // allocated 0008 to isolation verification and 0009 to transfer slot assignments.
    // Preserve those exact demo schemas and their data, then align their version with main's sequence.
    if ([8, 9, 10].includes(version)) {
      const hasTable = table => !!db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name=?").get(table);
      const hasMobility = ['vehicle_reservations', 'mobility_trips', 'mobility_commands', 'mobility_outcomes', 'mobility_events'].every(hasTable);
      const isolated = hasTable('incidents') && db.prepare('PRAGMA table_info(incidents)').all().some(column => column.name === 'isolation_verified_at');
      const hasSlotAssign = hasTable('transfer_destination_slots') && db.prepare('PRAGMA table_info(transfer_destination_slots)').all().some(column => column.name === 'assigned_vehicle_id');
      if (hasMobility && (!isolated || !hasSlotAssign)) {
        db.exec('BEGIN IMMEDIATE');
        try {
          if (!isolated) {
            db.exec(fs.readFileSync(path.join(directory, 'migrations', '0008_incident_isolation.sql'), 'utf8'));
          }
          if (!hasSlotAssign) {
            db.exec(fs.readFileSync(path.join(directory, 'migrations', '0009_transfer_slot_assignment.sql'), 'utf8'));
          }
          version = hasTable('simulation_results') ? 11 : 10;
          db.exec(`PRAGMA user_version=${version}`);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
    }
    while (version < files.length) {
      db.exec('BEGIN IMMEDIATE');
      try {
        version = db.prepare('PRAGMA user_version').get().user_version;
        if (version >= files.length) { db.exec('COMMIT'); break; }
        if (version === 0 && db.prepare("SELECT name FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' LIMIT 1").get()) {
          throw new Error('Refusing to initialize an unversioned, nonempty database.');
        }
        db.exec(fs.readFileSync(path.join(directory, 'migrations', files[version]), 'utf8'));
        if (version === 0) db.exec(fs.readFileSync(path.join(directory, 'seed.sql'), 'utf8'));
        db.exec(`PRAGMA user_version=${version + 1}`);
        db.exec('COMMIT');
        version++;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    return resolved;
  } finally { db.close(); }
}

if (require.main === module) process.stdout.write(initializeDatabase(process.argv[2]) + '\n');
module.exports = { initializeDatabase };
