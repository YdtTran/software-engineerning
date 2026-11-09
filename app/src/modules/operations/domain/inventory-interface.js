/**
 * Inventory Interface Contract
 * Module: Operations (Domain)
 * 
 * This contract defines the methods that Operations exposes to:
 * - Mobility & Simulation Module (Minh)
 * - Parking & Charging Module (Triết)
 * - Composition Root (server.js) for live/fixed network snapshots
 * 
 * Implementations in infrastructure/ will realize this interface against SQLite.
 */

class InventoryInterface {
  // =========================================================================
  // MOBILITY MODULE CONTRACT (Minh: UC01 - UC05)
  // =========================================================================

  /**
   * Get all currently available shared vehicles at a given Hub.
   * @param {string} hubId
   * @param {string} [vehicleType] Optional: 'electric_bicycle' | 'electric_motorbike'
   * @returns {Promise<Array<{ id: string, vehicleType: string, batteryPercent: number }>>}
   */
  async getAvailableVehicles(hubId, vehicleType = null) {
    throw new Error('Not implemented: getAvailableVehicles');
  }

  /**
   * Hold an available vehicle for a user reservation (UC03).
   * Moves vehicle status from 'available' to 'reserved'.
   * @param {string} vehicleId
   * @param {string} reservationId
   * @returns {Promise<void>}
   */
  async reserveVehicle(vehicleId, reservationId) {
    throw new Error('Not implemented: reserveVehicle');
  }

  /**
   * Release a reserved vehicle back to 'available' if reservation is cancelled/expired.
   * @param {string} vehicleId
   * @returns {Promise<void>}
   */
  async releaseVehicleHold(vehicleId) {
    throw new Error('Not implemented: releaseVehicleHold');
  }

  /**
   * Mark vehicle as 'in_use' when rider confirms pickup at the Hub (UC04).
   * @param {string} vehicleId
   * @param {string} tripId
   * @returns {Promise<void>}
   */
  async pickupVehicle(vehicleId, tripId) {
    throw new Error('Not implemented: pickupVehicle');
  }

  /**
   * Return vehicle to destination hub, update location, battery, and occupy destination slot (UC05).
   * Moves vehicle status from 'in_use' to 'available'.
   * @param {string} vehicleId
   * @param {string} destinationHubId
   * @param {string} slotId
   * @param {number} finalBatteryPercent
   * @returns {Promise<void>}
   */
  async returnVehicle(vehicleId, destinationHubId, slotId, finalBatteryPercent) {
    throw new Error('Not implemented: returnVehicle');
  }

  // =========================================================================
  // PARKING & CHARGING MODULE CONTRACT (Triết: UC06, UC07, UC12)
  // =========================================================================

  /**
   * Query available parking slots at a given hub.
   * @param {string} hubId
   * @param {string} [pool]
   * @returns {Promise<Array<{ id: string, code: string, status: string }>>}
   */
  async getAvailableSlots(hubId, pool = null) {
    throw new Error('Not implemented: getAvailableSlots');
  }

  /**
   * Hold a slot for private vehicle reservation (UC06-S1).
   * @param {string} slotId
   * @param {string} reservationId
   * @returns {Promise<void>}
   */
  async holdSlotForReservation(slotId, reservationId) {
    throw new Error('Not implemented: holdSlotForReservation');
  }

  /**
   * Release hold on a slot.
   * @param {string} slotId
   * @returns {Promise<void>}
   */
  async releaseSlotHold(slotId) {
    throw new Error('Not implemented: releaseSlotHold');
  }

  /**
   * Mark slot as occupied upon check-in (UC06-S2).
   * @param {string} slotId
   * @param {string} occupancyId
   * @returns {Promise<void>}
   */
  async occupySlot(slotId, occupancyId) {
    throw new Error('Not implemented: occupySlot');
  }

  /**
   * Mark slot as available upon checkout (UC06-S3).
   * @param {string} slotId
   * @returns {Promise<void>}
   */
  async vacateSlot(slotId) {
    throw new Error('Not implemented: vacateSlot');
  }

  /**
   * Update charging point operational status (UC07, UC12).
   * @param {string} pointId
   * @param {'available'|'occupied'|'charging'|'faulted'|'maintenance'} status
   * @returns {Promise<void>}
   */
  async updateChargingPointStatus(pointId, status) {
    throw new Error('Not implemented: updateChargingPointStatus');
  }

  // =========================================================================
  // COMPOSITION LAYER & SIMULATION SNAPSHOT CONTRACT
  // =========================================================================

  /**
   * Capture an immutable snapshot of all hubs, vehicles, slots, and charging points.
   * Used by Simulation (Minh: UC13) and Monitoring aggregation (UC08).
   * @returns {Promise<{
   *   capturedAt: string,
   *   hubs: Array<{ id: string, name: string }>,
   *   vehicles: Array<{ id: string, hubId: string, vehicleType: string, batteryPercent: number, status: string }>,
   *   slots: Array<{ id: string, hubId: string, code: string, status: string }>,
   *   chargingPoints: Array<{ id: string, hubId: string, code: string, status: string }>
   * }>}
   */
  async captureNetworkSnapshot() {
    throw new Error('Not implemented: captureNetworkSnapshot');
  }
}

module.exports = {
  InventoryInterface
};
