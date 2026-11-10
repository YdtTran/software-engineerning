const { DiscoveryService } = require('./application/discovery-service');
const { createDiscoveryRouter } = require('./api/discovery-router');

function createMobilitySimulationModule({ inventory } = {}) {
  const discoveryService = new DiscoveryService(inventory);
  return { discoveryService, router: createDiscoveryRouter(discoveryService) };
}

module.exports = { createMobilitySimulationModule };
