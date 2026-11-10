const { DiscoveryService } = require('./application/discovery-service');
const { createDiscoveryRouter } = require('./api/discovery-router');
const express = require('express');
const { SQLiteRentalRepository } = require('./infrastructure/sqlite-rental-repository');
const { RentalService } = require('./application/rental-service');
const { createRentalRouter } = require('./api/rental-router');

function createMobilitySimulationModule({ inventory, client = null, device = null, deviceTimeoutMs } = {}) {
  const discoveryService = new DiscoveryService(inventory);
  const router = express.Router();
  router.use(createDiscoveryRouter(discoveryService));
  let rentalRepository = null, rentalService = null;
  if (client) {
    rentalRepository = new SQLiteRentalRepository(client);
    rentalService = new RentalService({ repository: rentalRepository, inventory, device, deviceTimeoutMs });
    router.use(createRentalRouter(rentalService));
  }
  return { discoveryService, rentalService, rentalRepository, router };
}

module.exports = { createMobilitySimulationModule };
