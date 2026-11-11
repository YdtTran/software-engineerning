function createDiscoveryFixture() {
  const hubs = [
    { id: 'metro', name: 'Ga Metro ĐHQG', location: null },
    { id: 'library', name: 'Thư viện Trung tâm', location: null },
    { id: 'empty', name: 'Hub không có xe', location: null }
  ];
  // Read-only, already-eligible inventory projections. Eligibility itself is
  // verified against the real Operations adapter in the integration suite.
  const available = [
    { id: 'bike', hubId: 'metro', vehicleType: 'electric_bicycle', batteryPercent: 86 },
    { id: 'motorbike', hubId: 'metro', vehicleType: 'electric_motorbike', batteryPercent: 72 }
  ];
  return {
    listHubs: async () => structuredClone(hubs),
    getHubById: async id => structuredClone(hubs.find(hub => hub.id === id)),
    getAvailableVehicles: async (hubId, type) => structuredClone(available.filter(vehicle =>
      vehicle.hubId === hubId && (!type || vehicle.vehicleType === type)))
  };
}

module.exports = { createDiscoveryFixture };
