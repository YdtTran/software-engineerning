/**
 * Operations Module Entry Point
 * Module: Operations (Duy)
 * 
 * Packages Domain, Infrastructure, Application, and API components into a single cohesive module.
 * Exposes:
 * - `router`: Express-compatible router to mount at `/api/v1`
 * - `inventoryInterface`: Contract provided to Mobility and Parking/Charging modules
 * - `monitoringService`, `transferService`, `incidentService`, `inventoryService`
 */

const { SQLiteClient } = require('./infrastructure/sqlite-client');
const { SQLiteInventoryRepository } = require('./infrastructure/sqlite-inventory-repo');
const { SQLiteTransferRepository } = require('./infrastructure/sqlite-transfer-repo');
const { SQLiteIncidentRepository } = require('./infrastructure/sqlite-incident-repo');

const { InventoryService } = require('./application/inventory-service');
const { MonitoringService } = require('./application/monitoring-service');
const { TransferService } = require('./application/transfer-service');
const { IncidentService } = require('./application/incident-service');

const { OperationsController } = require('./api/operations-controller');
const { createOperationsRouter, routesTable } = require('./api/operations-router');
const { SQLiteIdempotencyStore } = require('./api/idempotency');

function createOperationsModule({ client = null, db = null, tripReader = null, idempotencyStore = null } = {}) {
  const sqliteClient = client || new SQLiteClient(db);
  idempotencyStore = idempotencyStore || new SQLiteIdempotencyStore(sqliteClient);

  // 1. Repositories (Infrastructure)
  const inventoryRepo = new SQLiteInventoryRepository(sqliteClient);
  const transferRepo = new SQLiteTransferRepository(sqliteClient);
  const incidentRepo = new SQLiteIncidentRepository(sqliteClient);

  // 2. Application Services
  const inventoryService = new InventoryService(inventoryRepo);
  const monitoringService = new MonitoringService(inventoryRepo);
  const transferService = new TransferService(transferRepo, inventoryRepo);
  const incidentService = new IncidentService(incidentRepo, inventoryRepo, tripReader);

  // 3. API Controller & Router
  const controller = new OperationsController({
    inventoryService,
    monitoringService,
    transferService,
    incidentService,
    idempotencyStore
  });

  const router = createOperationsRouter(controller);

  return {
    // Services & Repos
    inventoryRepo,
    transferRepo,
    incidentRepo,
    inventoryService,
    monitoringService,
    transferService,
    incidentService,
    controller,
    router,
    routesTable,

    // Public contract provided to other modules (Minh & Triết)
    inventoryInterface: inventoryRepo
  };
}

module.exports = {
  createOperationsModule,
  routesTable
};
