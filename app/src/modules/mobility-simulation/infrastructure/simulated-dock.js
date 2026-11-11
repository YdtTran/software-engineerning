// Explicit local-demo adapter. No real lock or IoT protocol is implied.
class SimulatedDock {
  constructor(inventory) { this.inventory = inventory; }
  async execute(command) {
    const snapshot = await this.inventory.captureNetworkSnapshot();
    const vehicle = snapshot.vehicles.find(row => row.id === command.vehicleId);
    if (!vehicle) return null;
    if (command.kind === 'pickup' && vehicle.hubId !== command.hubId) return null;
    return { commandId: command.id, vehicleId: command.vehicleId, hubId: command.hubId,
      slotId: command.slotId ?? null, unlocked: command.kind === 'pickup',
      arrived: command.kind === 'return', locked: command.kind === 'return',
      batteryPercent: vehicle.batteryPercent, distanceKm: null, simulated: true };
  }
}

module.exports = { SimulatedDock };
