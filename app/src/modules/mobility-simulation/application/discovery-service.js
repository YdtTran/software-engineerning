const { DiscoveryError, searchText, vehicleType } = require('../domain/discovery');

class DiscoveryService {
  constructor(inventory) {
    for (const method of ['listHubs', 'getHubById', 'getAvailableVehicles']) {
      if (typeof inventory?.[method] !== 'function') {
        throw new TypeError(`Discovery requires inventory.${method}().`);
      }
    }
    this.inventory = inventory;
  }

  async searchHubs(q) {
    const query = searchText(q);
    const hubs = await this.inventory.listHubs();
    return hubs
      .filter(hub => [hub.id, hub.name].some(value => value.normalize('NFC').toLowerCase().includes(query)))
      .map(hub => ({ id: hub.id, name: hub.name, location: hub.location ?? null }));
  }

  async listAvailableVehicles(hubId, type) {
    if (typeof hubId !== 'string' || !hubId.trim()) {
      throw new DiscoveryError('INVALID_INPUT', 'hubId must be a non-empty string.');
    }
    const filter = vehicleType(type);
    if (!await this.inventory.getHubById(hubId)) {
      throw new DiscoveryError('HUB_NOT_FOUND', 'Hub not found.');
    }
    // Operations owns eligibility rules and live commitments; never reimplement
    // availability by reading physical inventory tables inside Mobility.
    const vehicles = await this.inventory.getAvailableVehicles(hubId, filter);
    return vehicles.map(vehicle => ({
      id: vehicle.id,
      vehicleType: vehicle.vehicleType,
      batteryPercent: vehicle.batteryPercent
    }));
  }
}

module.exports = { DiscoveryService };
