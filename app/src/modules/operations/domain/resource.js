/**
 * Domain Models for Physical Resources (Vehicles, Slots, Charging Points, Hubs)
 * Module: Operations (UC09)
 * 
 * Rules enforced:
 * - BR11: Hard delete is forbidden if a vehicle is in 'IN_USE' or 'RESERVED' state.
 * - Battery bounds [0..100].
 * - Valid state transitions for physical resources.
 */

const VehicleStatus = Object.freeze({
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  IN_USE: 'in_use',
  IN_TRANSFER: 'in_transfer',
  FAULTED: 'faulted',
  SUSPENDED: 'suspended',
  MAINTENANCE: 'maintenance'
});

const SlotStatus = Object.freeze({
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  OCCUPIED: 'occupied',
  HELD_FOR_TRANSFER: 'held_for_transfer',
  BLOCKED: 'blocked'
});

const ChargingPointStatus = Object.freeze({
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  CHARGING: 'charging',
  FAULTED: 'faulted',
  MAINTENANCE: 'maintenance'
});

const ResourceKind = Object.freeze({
  VEHICLE: 'vehicle',
  SLOT: 'slot',
  CHARGING_POINT: 'charging_point'
});

class DomainError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

class ElectricVehicle {
  constructor({ id, hubId, vehicleType, batteryPercent, status = VehicleStatus.AVAILABLE, ownerId = null }) {
    if (!id || typeof id !== 'string') {
      throw new DomainError('INVALID_ID', 'Vehicle ID must be a non-empty string.');
    }
    if (!hubId || typeof hubId !== 'string') {
      throw new DomainError('INVALID_HUB_ID', 'Hub ID must be a non-empty string.');
    }
    if (!['electric_bicycle', 'electric_motorbike'].includes(vehicleType)) {
      throw new DomainError('INVALID_TYPE', 'Vehicle type must be electric_bicycle or electric_motorbike.');
    }
    if (typeof batteryPercent !== 'number' || batteryPercent < 0 || batteryPercent > 100) {
      throw new DomainError('INVALID_BATTERY', 'Battery percent must be an integer between 0 and 100.');
    }

    this.id = id;
    this.hubId = hubId;
    this.vehicleType = vehicleType;
    this.batteryPercent = Math.round(batteryPercent);
    this.status = status;
    this.ownerId = ownerId; // null = shared vehicle; non-null = private vehicle
  }

  isShared() {
    return this.ownerId === null;
  }

  isAvailable() {
    return this.status === VehicleStatus.AVAILABLE;
  }

  canTransfer() {
    return this.status === VehicleStatus.AVAILABLE && this.batteryPercent >= 80;
  }

  /**
   * BR11: Check if vehicle can be removed from system
   */
  canDelete() {
    if (this.status === VehicleStatus.IN_USE || this.status === VehicleStatus.RESERVED) {
      return false;
    }
    return true;
  }

  assertCanDelete() {
    if (!this.canDelete()) {
      throw new DomainError(
        'CANNOT_DELETE_ACTIVE_VEHICLE',
        `Vehicle ${this.id} cannot be deleted while in state '${this.status}' (BR11 violation).`,
        { vehicleId: this.id, status: this.status }
      );
    }
  }

  reserve() {
    if (this.status !== VehicleStatus.AVAILABLE) {
      throw new DomainError('VEHICLE_NOT_AVAILABLE', `Vehicle ${this.id} is not available for reservation (status: ${this.status}).`);
    }
    this.status = VehicleStatus.RESERVED;
  }

  releaseReservation() {
    if (this.status === VehicleStatus.RESERVED) {
      this.status = VehicleStatus.AVAILABLE;
    }
  }

  pickup() {
    if (this.status !== VehicleStatus.RESERVED && this.status !== VehicleStatus.AVAILABLE) {
      throw new DomainError('VEHICLE_CANNOT_PICKUP', `Vehicle ${this.id} cannot be picked up from state '${this.status}'.`);
    }
    this.status = VehicleStatus.IN_USE;
  }

  returnToHub(destinationHubId, newBatteryPercent) {
    if (this.status !== VehicleStatus.IN_USE) {
      throw new DomainError('VEHICLE_NOT_IN_USE', `Vehicle ${this.id} cannot be returned because it is not currently in use.`);
    }
    this.hubId = destinationHubId;
    if (typeof newBatteryPercent === 'number') {
      this.batteryPercent = Math.max(0, Math.min(100, Math.round(newBatteryPercent)));
    }
    this.status = VehicleStatus.AVAILABLE;
  }

  markInTransfer() {
    if (!this.canTransfer()) {
      throw new DomainError(
        'VEHICLE_INELIGIBLE_FOR_TRANSFER',
        `Vehicle ${this.id} must be available and have >= 80% battery to transfer (status: ${this.status}, battery: ${this.batteryPercent}%).`
      );
    }
    this.status = VehicleStatus.IN_TRANSFER;
  }

  completeTransfer(destinationHubId) {
    if (this.status !== VehicleStatus.IN_TRANSFER) {
      throw new DomainError('VEHICLE_NOT_IN_TRANSFER', `Vehicle ${this.id} is not currently in transfer.`);
    }
    this.hubId = destinationHubId;
    this.status = VehicleStatus.AVAILABLE;
  }

  cancelTransfer() {
    if (this.status === VehicleStatus.IN_TRANSFER) {
      this.status = VehicleStatus.AVAILABLE;
    }
  }

  suspend(reason) {
    if (this.status === VehicleStatus.IN_USE || this.status === VehicleStatus.RESERVED) {
      throw new DomainError('CANNOT_SUSPEND_ACTIVE_VEHICLE', `Cannot suspend vehicle ${this.id} while in state '${this.status}'.`);
    }
    this.status = VehicleStatus.SUSPENDED;
  }

  reactivate() {
    if (![VehicleStatus.SUSPENDED, VehicleStatus.MAINTENANCE, VehicleStatus.FAULTED].includes(this.status)) {
      throw new DomainError('INVALID_REACTIVATION', `Vehicle ${this.id} is already active or in an invalid state for reactivation.`);
    }
    this.status = VehicleStatus.AVAILABLE;
  }

  isolateFault() {
    // If vehicle is in use, we flag fault without remotely halting active riding
    this.status = VehicleStatus.FAULTED;
  }
}

class ParkingSlot {
  constructor({ id, hubId, code, status = SlotStatus.AVAILABLE }) {
    if (!id || !hubId || !code) {
      throw new DomainError('INVALID_SLOT_DATA', 'Parking slot requires id, hubId, and code.');
    }
    this.id = id;
    this.hubId = hubId;
    this.code = code;
    this.status = status;
  }

  isAvailable() {
    return this.status === SlotStatus.AVAILABLE;
  }

  holdForTransfer() {
    if (this.status !== SlotStatus.AVAILABLE) {
      throw new DomainError('SLOT_NOT_AVAILABLE', `Slot ${this.id} (${this.code}) is not available to hold for transfer.`);
    }
    this.status = SlotStatus.HELD_FOR_TRANSFER;
  }

  releaseTransferHold() {
    if (this.status === SlotStatus.HELD_FOR_TRANSFER) {
      this.status = SlotStatus.AVAILABLE;
    }
  }

  occupy() {
    this.status = SlotStatus.OCCUPIED;
  }

  vacate() {
    this.status = SlotStatus.AVAILABLE;
  }

  block(reason) {
    this.status = SlotStatus.BLOCKED;
  }

  unblock() {
    this.status = SlotStatus.AVAILABLE;
  }
}

class ChargingPoint {
  constructor({ id, hubId, code, status = ChargingPointStatus.AVAILABLE }) {
    if (!id || !hubId || !code) {
      throw new DomainError('INVALID_POINT_DATA', 'Charging point requires id, hubId, and code.');
    }
    this.id = id;
    this.hubId = hubId;
    this.code = code;
    this.status = status;
  }

  isAvailable() {
    return this.status === ChargingPointStatus.AVAILABLE;
  }

  startCharging() {
    if (this.status === ChargingPointStatus.FAULTED || this.status === ChargingPointStatus.MAINTENANCE) {
      throw new DomainError('POINT_UNAVAILABLE', `Charging point ${this.id} is faulted or under maintenance.`);
    }
    this.status = ChargingPointStatus.CHARGING;
  }

  stopCharging() {
    if (this.status === ChargingPointStatus.CHARGING) {
      this.status = ChargingPointStatus.OCCUPIED;
    }
  }

  vacate() {
    if (this.status !== ChargingPointStatus.FAULTED && this.status !== ChargingPointStatus.MAINTENANCE) {
      this.status = ChargingPointStatus.AVAILABLE;
    }
  }

  markFaulted() {
    this.status = ChargingPointStatus.FAULTED;
  }

  recover() {
    this.status = ChargingPointStatus.AVAILABLE;
  }
}

module.exports = {
  VehicleStatus,
  SlotStatus,
  ChargingPointStatus,
  ResourceKind,
  DomainError,
  ElectricVehicle,
  ParkingSlot,
  ChargingPoint
};
