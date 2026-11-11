/**
 * Parking & Charging Module Entry Point
 * Module: Parking & Charging (Triết)
 *
 * Manages UC06 (parking availability, reservations, check-in/out, LIM-01),
 * UC07 / UC07A (charging requests & safe session lifecycle), UC12 (priority queue & BR15 budget),
 * FR-NI01 (overdue hold expiry), FR-NI04 (dynamic queue rebalancing), and SC02 chargingGuard.
 */

const { SQLiteClient } = require('../operations/infrastructure/sqlite-client');
const { SQLiteInventoryRepository } = require('../operations/infrastructure/sqlite-inventory-repo');
const { SimulatedDeviceAdapter } = require('./infrastructure/simulated-device-adapter');
const { SQLiteParkingRepository } = require('./infrastructure/sqlite-parking-repo');
const { SQLiteChargingRepository } = require('./infrastructure/sqlite-charging-repo');
const { createChargingGuard } = require('./infrastructure/charging-guard');
const { ParkingService } = require('./application/parking-service');
const { ChargingService } = require('./application/charging-service');
const { SchedulerService } = require('./application/scheduler-service');
const { IdempotencyHelper } = require('./api/idempotency-helper');
const { ParkingChargingController } = require('./api/parking-charging-controller');
const { createParkingChargingRouter } = require('./api/parking-charging-router');

function createParkingChargingModule({
  client = null,
  db = null,
  inventoryInterface = null,
  incidentReporter = null,
  deviceAdapter = null,
  idempotencyStore = null,
  chargingGuard = null,
  clock = () => new Date()
} = {}) {
  const sqliteClient = client || (db ? new SQLiteClient(db) : null);
  if (!sqliteClient) {
    throw new Error('createParkingChargingModule requires a SQLiteClient or db connection.');
  }

  const adapter = deviceAdapter || new SimulatedDeviceAdapter();
  const resolvedGuard = chargingGuard || createChargingGuard(sqliteClient, clock);
  const resolvedInventory = inventoryInterface || new SQLiteInventoryRepository(sqliteClient, resolvedGuard);
  const parkingRepo = new SQLiteParkingRepository(sqliteClient);
  const chargingRepo = new SQLiteChargingRepository(sqliteClient);

  const parkingService = new ParkingService({
    client: sqliteClient,
    parkingRepo,
    chargingRepo,
    inventoryInterface: resolvedInventory,
    incidentReporter,
    deviceAdapter: adapter,
    clock
  });

  const chargingService = new ChargingService({
    client: sqliteClient,
    parkingRepo,
    chargingRepo,
    inventoryInterface: resolvedInventory,
    incidentReporter,
    deviceAdapter: adapter,
    clock
  });

  const schedulerService = new SchedulerService({
    client: sqliteClient,
    chargingRepo,
    inventoryInterface: resolvedInventory,
    chargingService,
    deviceAdapter: adapter,
    clock
  });

  chargingService.setRebalanceHook((hubId, triggerRequestId, opts = {}) =>
    schedulerService.rebalanceHubQueue(hubId, { triggerRequestId, ...opts })
  );

  const resolvedIdempotency = idempotencyStore && typeof idempotencyStore.execute === 'function'
    ? idempotencyStore
    : new IdempotencyHelper(sqliteClient);

  const controller = new ParkingChargingController({
    client: sqliteClient,
    parkingService,
    chargingService,
    schedulerService,
    idempotencyHelper: resolvedIdempotency
  });
  const router = createParkingChargingRouter(controller);

  return {
    client: sqliteClient,
    deviceAdapter: adapter,
    chargingGuard: resolvedGuard,
    parkingRepo,
    chargingRepo,
    inventoryInterface: resolvedInventory,
    incidentReporter,
    idempotencyStore: resolvedIdempotency,
    parkingService,
    chargingService,
    schedulerService,
    controller,
    router,
    clock
  };
}

module.exports = {
  createParkingChargingModule,
  createChargingGuard,
  SimulatedDeviceAdapter
};
