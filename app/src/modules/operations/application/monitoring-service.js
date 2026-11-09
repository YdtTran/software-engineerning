/**
 * Monitoring Application Service (UC08)
 * Module: Operations
 * 
 * Provides real-time network overview, capacity utilization, battery summaries,
 * and automated alert level calculation conforming to BR10 / FR-NI03:
 * - RED: Occupancy rate >= 95% OR Available vehicles == 0
 * - YELLOW (if not Red): Occupancy rate >= 85% OR Available vehicle ratio <= 10%
 * - GREEN: Normal operational conditions
 */

class MonitoringService {
  /**
   * @param {import('../infrastructure/sqlite-inventory-repo').SQLiteInventoryRepository} inventoryRepo
   */
  constructor(inventoryRepo) {
    if (!inventoryRepo) {
      throw new Error('MonitoringService requires an inventory repository instance.');
    }
    this.inventoryRepo = inventoryRepo;
  }

  /**
   * Calculate alert level for a hub according to BR10 / FR-NI03
   * @param {number} occupancyRate Parking occupancy percentage [0..100]
   * @param {number} availableVehicles Count of available vehicles
   * @param {number} totalVehicles Total vehicles at hub
   * @returns {{ alertLevel: 'RED'|'YELLOW'|'GREEN', reasons: string[] }}
   */
  static evaluateAlertLevel(occupancyRate, availableVehicles, totalVehicles) {
    const reasons = [];

    // RED check: occupancy >= 95% OR 0 available vehicles
    const isOccupancyCritical = occupancyRate >= 95;
    const isOutOfVehicles = availableVehicles === 0;

    if (isOccupancyCritical || isOutOfVehicles) {
      if (isOccupancyCritical) reasons.push(`Critical parking occupancy (${occupancyRate.toFixed(1)}% >= 95%)`);
      if (isOutOfVehicles) reasons.push('Zero available vehicles at hub');
      return { alertLevel: 'RED', reasons };
    }

    // YELLOW check (if not red): occupancy >= 85% OR available vehicle ratio <= 10%
    const isOccupancyWarning = occupancyRate >= 85;
    const availableVehicleRatio = totalVehicles > 0 ? (availableVehicles / totalVehicles) * 100 : 0;
    const isVehicleDepleted = availableVehicleRatio <= 10;

    if (isOccupancyWarning || isVehicleDepleted) {
      if (isOccupancyWarning) reasons.push(`High parking occupancy warning (${occupancyRate.toFixed(1)}% >= 85%)`);
      if (isVehicleDepleted) reasons.push(`Low vehicle availability warning (${availableVehicleRatio.toFixed(1)}% <= 10%)`);
      return { alertLevel: 'YELLOW', reasons };
    }

    return { alertLevel: 'GREEN', reasons: ['Operating within normal parameters'] };
  }

  /**
   * Get full network overview of all Mobility Hubs (UC08)
   * Response conforms to API_CONTRACTS.md: GET /operations/hubs
   */
  async getNetworkOverview() {
    const snapshot = await this.inventoryRepo.captureNetworkSnapshot();
    const hubsSummary = [];

    for (const hub of snapshot.hubs) {
      const hubSlots = snapshot.slots.filter(s => s.hubId === hub.id);
      const hubVehicles = snapshot.vehicles.filter(v => v.hubId === hub.id);
      const hubPoints = snapshot.chargingPoints.filter(cp => cp.hubId === hub.id);

      // 1. Capacity metrics
      const totalSlots = hubSlots.length;
      const occupiedSlots = hubSlots.filter(s => s.status === 'occupied').length;
      const heldSlots = hubSlots.filter(s => s.status === 'held_for_transfer' || s.status === 'reserved').length;
      const availableSlots = hubSlots.filter(s => s.status === 'available').length;
      const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

      // 2. Vehicle metrics
      const totalVehicles = hubVehicles.length;
      const availableVehicles = hubVehicles.filter(v => v.status === 'available').length;
      const inUseVehicles = hubVehicles.filter(v => v.status === 'in_use').length;
      const inTransferVehicles = hubVehicles.filter(v => v.status === 'in_transfer').length;
      const faultedVehicles = hubVehicles.filter(v => v.status === 'faulted').length;

      const batterySum = hubVehicles.reduce((acc, v) => acc + (v.batteryPercent || 0), 0);
      const avgBattery = totalVehicles > 0 ? Math.round(batterySum / totalVehicles) : 0;
      const lowBatteryCount = hubVehicles.filter(v => (v.batteryPercent || 0) < 20).length;
      const highBatteryCount = hubVehicles.filter(v => (v.batteryPercent || 0) >= 80).length;

      // 3. Charging points metrics
      const totalPoints = hubPoints.length;
      const availablePoints = hubPoints.filter(cp => cp.status === 'available').length;
      const chargingPoints = hubPoints.filter(cp => cp.status === 'charging').length;
      const faultedPoints = hubPoints.filter(cp => cp.status === 'faulted').length;

      // 4. BR10 Alert Evaluation
      const { alertLevel, reasons } = MonitoringService.evaluateAlertLevel(
        occupancyRate,
        availableVehicles,
        totalVehicles
      );

      hubsSummary.push({
        hubId: hub.id,
        hubName: hub.name,
        observationTime: snapshot.capturedAt,
        alert: {
          level: alertLevel,
          reasons
        },
        capacity: {
          totalSlots,
          occupiedSlots,
          heldSlots,
          availableSlots,
          occupancyRate: Number(occupancyRate.toFixed(1))
        },
        vehicles: {
          total: totalVehicles,
          available: availableVehicles,
          inUse: inUseVehicles,
          inTransfer: inTransferVehicles,
          faulted: faultedVehicles,
          avgBatteryPercent: avgBattery,
          lowBatteryCount,
          highBatteryCount
        },
        charging: {
          totalPoints,
          availablePoints,
          chargingPoints,
          faultedPoints
        }
      });
    }

    return hubsSummary;
  }
}

module.exports = {
  MonitoringService
};
