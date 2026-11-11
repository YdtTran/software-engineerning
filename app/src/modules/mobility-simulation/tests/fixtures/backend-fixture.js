const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createOperationsModule } = require('../../../operations');
const { createMobilitySimulationModule } = require('../../index');
const { SimulatedDock } = require('../../infrastructure/simulated-dock');

function backendFixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mobility-lifecycle-'));
  const db = new DatabaseSync(path.join(directory, 'test.sqlite'));
  const base = path.resolve(__dirname, '../../../../../db');
  const migrations = fs.readdirSync(path.join(base, 'migrations')).filter(file => /^\d+.*\.sql$/.test(file)).sort();
  for (const file of migrations) db.exec(fs.readFileSync(path.join(base, 'migrations', file), 'utf8'));
  db.exec(fs.readFileSync(path.join(base, 'seed.sql'), 'utf8'));
  db.exec("UPDATE parking_slots SET pool='immediate'");
  const operations = createOperationsModule({ db });
  const inventory = operations.inventoryInterface;
  const client = inventory.client;
  const device = options.device === undefined ? new SimulatedDock(inventory) : options.device;
  const module = createMobilitySimulationModule({ inventory, client, device, deviceTimeoutMs: 20 });
  t.after(() => { db.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  return { db, inventory, client, operations, device, module, service: module.rentalService };
}

module.exports = { backendFixture };
