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
   * @param {string} hubId Expected source hub.
   * @returns {Promise<void>}
   */
  async reserveVehicle(vehicleId, reservationId, hubId) {
    throw new Error('Not implemented: reserveVehicle');
  }

  /**
   * Release a reserved vehicle back to 'available' if reservation is cancelled/expired.
   * @param {string} vehicleId
   * @param {string} reservationId The reservation that owns the hold.
   * @returns {Promise<void>}
   */
  async releaseVehicleHold(vehicleId, reservationId) {
    throw new Error('Not implemented: releaseVehicleHold');
  }

  /**
   * Mark vehicle as 'in_use' when rider confirms pickup at the Hub (UC04).
   * @param {string} vehicleId
   * @param {string} tripId
   * @param {string} reservationId Verified reservation for this trip.
   * @param {string} hubId Expected pickup hub.
   * @returns {Promise<void>}
   */
  async pickupVehicle(vehicleId, tripId, reservationId, hubId) {
    throw new Error('Not implemented: pickupVehicle');
  }

  /**
   * Return vehicle to destination hub, update location, battery, and occupy destination slot (UC05).
   * Moves vehicle status from 'in_use' to 'available'.
   * @param {string} vehicleId
   * @param {string} destinationHubId
   * @param {string} slotId
   * @param {number} finalBatteryPercent
   * @param {string} tripId Trip that currently owns the vehicle.
   * @param {string|null} slotReservationId Required when the destination slot is held.
   * @returns {Promise<void>}
   */
  async returnVehicle(vehicleId, destinationHubId, slotId, finalBatteryPercent, tripId, slotReservationId = null) {
    throw new Error('Not implemented: returnVehicle');
  }

  // =========================================================================
  // PARKING & CHARGING MODULE CONTRACT (Triết: UC06, UC07, UC12)
  // =========================================================================

  /**
   * Query available parking slots at a given hub.
   * @param {string} hubId
   * @param {'immediate'|'advance'|null} pool
   * @param {{plannedArrival: string, plannedCheckout: string}|null} interval Required for advance pool.
   * @returns {Promise<Array<{ id: string, code: string, status: string }>>}
   */
  async getAvailableSlots(hubId, pool = null, interval = null) {
    throw new Error('Not implemented: getAvailableSlots');
  }

  /**
   * Hold a slot for private vehicle reservation (UC06-S1).
   * @param {string} slotId
   * @param {string} reservationId
   * @param {{pool: 'immediate'|'advance', expiresAt: string, plannedArrival?: string, plannedCheckout?: string}} request Times are ISO timestamps with an offset; the owning module computes expiry.
   * @returns {Promise<void>}
   */
  async holdSlotForReservation(slotId, reservationId, request) {
    throw new Error('Not implemented: holdSlotForReservation');
  }

  /**
   * Release hold on a slot.
   * @param {string} slotId
   * @param {string} reservationId The reservation that owns the hold.
   * @returns {Promise<void>}
   */
  async releaseSlotHold(slotId, reservationId) {
    throw new Error('Not implemented: releaseSlotHold');
  }

  /** Expire an overdue Reserved commitment without ending physical occupancy. */
  async expireSlotHold(slotId, reservationId) {
    throw new Error('Not implemented: expireSlotHold');
  }

  /**
   * Mark slot as occupied upon check-in (UC06-S2).
   * @param {string} slotId
   * @param {string} occupancyId
   * @param {string|null} reservationId Required when the slot is held.
   * @returns {Promise<void>}
   */
  async occupySlot(slotId, occupancyId, reservationId = null) {
    throw new Error('Not implemented: occupySlot');
  }

  /**
   * Mark slot as available upon checkout (UC06-S3).
   * @param {string} slotId
   * @param {string} occupancyId The occupancy being ended.
   * @returns {Promise<void>}
   */
  async vacateSlot(slotId, occupancyId) {
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
