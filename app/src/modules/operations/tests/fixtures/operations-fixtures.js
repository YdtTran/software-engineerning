/**
 * Test Fixtures for Operations Module
 * Module: Operations (Tests)
 * 
 * Provides isolated mock datasets conforming to Step 5.1:
 * - 1 Hub with excess vehicles (hub-source)
 * - 1 Hub with deficit / high occupancy (hub-dest)
 * - 1 vehicle with battery < 80% (ineligible for transfer)
 * - 1 vehicle with battery >= 80% (eligible for transfer)
 * - 1 faulted charging point (CP-FAULT)
 * - 1 vehicle in active trip (for incident reporting without disruption)
 */

const fixtures = {
  hubs: [
    { id: 'hub-source', name: 'Hub Nguồn (Dư xe)' },
    { id: 'hub-dest', name: 'Hub Đích (Thiếu xe, sắp đầy)' },
    { id: 'hub-backup', name: 'Hub Dự phòng' }
  ],

  vehicles: [
    // Eligible for transfer: >= 80% battery, available
    { id: 'EB-ELIGIBLE-1', hubId: 'hub-source', vehicleType: 'electric_bicycle', batteryPercent: 90, status: 'Available' },
    { id: 'EB-ELIGIBLE-2', hubId: 'hub-source', vehicleType: 'electric_bicycle', batteryPercent: 85, status: 'Available' },

    // Ineligible for transfer: < 80% battery (BR13 violation)
    { id: 'EB-LOW-BATTERY', hubId: 'hub-source', vehicleType: 'electric_bicycle', batteryPercent: 72, status: 'Available' },

    // Ineligible for transfer: already in use / reserved
    { id: 'EB-RESERVED', hubId: 'hub-source', vehicleType: 'electric_bicycle', batteryPercent: 95, status: 'Reserved' },
    { id: 'EB-ACTIVE-TRIP', hubId: 'hub-source', vehicleType: 'electric_bicycle', batteryPercent: 88, status: 'InUse' },

    // Faulted vehicle
    { id: 'EB-FAULTED', hubId: 'hub-source', vehicleType: 'electric_bicycle', batteryPercent: 40, status: 'Faulty' },

    // Destination hub vehicle
    { id: 'EB-DEST-1', hubId: 'hub-dest', vehicleType: 'electric_motorbike', batteryPercent: 82, status: 'Available' }
  ],

  slots: [
    // Source hub slots
    { id: 'slot-src-1', hubId: 'hub-source', code: 'S-01', status: 'Occupied' },
    { id: 'slot-src-2', hubId: 'hub-source', code: 'S-02', status: 'Occupied' },
    { id: 'slot-src-3', hubId: 'hub-source', code: 'S-03', status: 'Available' },

    // Destination hub slots (limited capacity to test high occupancy BR10)
    { id: 'slot-dst-1', hubId: 'hub-dest', code: 'D-01', status: 'Available' },
    { id: 'slot-dst-2', hubId: 'hub-dest', code: 'D-02', status: 'Available' },
    { id: 'slot-dst-3', hubId: 'hub-dest', code: 'D-03', status: 'Occupied' },
    { id: 'slot-dst-4', hubId: 'hub-dest', code: 'D-04', status: 'Occupied' },

    // Backup hub slots
    { id: 'slot-bak-1', hubId: 'hub-backup', code: 'B-01', status: 'Available' },
    { id: 'slot-bak-2', hubId: 'hub-backup', code: 'B-02', status: 'Available' }
  ],

  chargingPoints: [
    { id: 'cp-src-1', hubId: 'hub-source', code: 'CP-S1', status: 'Available' },
    { id: 'cp-dst-1', hubId: 'hub-dest', code: 'CP-D1', status: 'Charging' },
    { id: 'cp-faulted', hubId: 'hub-dest', code: 'CP-FAULT', status: 'Fault' }
  ]
};

const path = require('node:path');
const fs = require('node:fs');

const MIGRATION_FILES = [
  'migrations/0001_hub_inventory.sql',
  'seed.sql',
  'migrations/0002_operations_schema.sql',
  'migrations/0003_idempotency.sql',
  'migrations/0004_inventory_ownership.sql',
  'migrations/0005_parked_vehicle.sql',
  'migrations/0006_parking_commitments.sql',
  'migrations/0007_vehicle_pickup_claim.sql',
  'migrations/0008_incident_isolation.sql',
  'migrations/0009_transfer_slot_assignment.sql',
  'migrations/0010_mobility_lifecycle.sql',
  'migrations/0011_simulation_results.sql'
];

function applyMigrations(db, baseDir = path.resolve(__dirname, '../../../../../db')) {
  for (const file of MIGRATION_FILES) {
    db.exec(fs.readFileSync(path.join(baseDir, file), 'utf8'));
  }
}

module.exports = {
  fixtures,
  MIGRATION_FILES,
  applyMigrations
};
