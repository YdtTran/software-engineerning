/**
 * Domain Models for Physical Resources (Vehicles, Slots, Charging Points, Hubs)
 * Module: Operations (UC09)
 * 
 * Aligned with:
 * - CLASS_CATALOG.md (VehicleStatus, ParkingStatus, ChargingPointStatus)
 * - API_CONTRACTS.md (Canonical statuses)
 * - BR11: Hard delete is forbidden if a vehicle is in 'InUse' or 'Reserved' state.
 */

const VehicleStatus = Object.freeze({
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  IN_USE: 'InUse',
  NEEDS_CHARGING: 'NeedsCharging',
  CHARGING: 'Charging',
  TRANSFER_HELD: 'TransferHeld',
  IN_TRANSIT: 'InTransit',
  FAULTY: 'Faulty',
  MAINTENANCE: 'Maintenance',
  RETIRED: 'Retired'
});

const SlotStatus = Object.freeze({
  AVAILABLE: 'Available',
  HELD: 'Held',
  OCCUPIED: 'Occupied',
  SUSPENDED: 'Suspended'
});

const ChargingPointStatus = Object.freeze({
  IDLE: 'Idle',
  AVAILABLE: 'Available', // alias to Idle
  RESERVED: 'Reserved',
  STARTING: 'Starting',
  CHARGING: 'Charging',
  STOPPING: 'Stopping',
  COMPLETE: 'Complete',
  FAULT: 'Fault',
  REPAIR: 'Repair',
  RETIRED: 'Retired'
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

/**
 * Normalize status strings to canonical PascalCase
 */
function normalizeStatus(str, defaultVal) {
  if (!str) return defaultVal;
  const s = String(str).toLowerCase().replace(/[_\s-]/g, '');
  if (['available', 'ready'].includes(s)) return 'Available';
  if (['reserved', 'held'].includes(s)) return 'Reserved';
  if (['inuse', 'using'].includes(s)) return 'InUse';
  if (['intransit', 'intransfer'].includes(s)) return 'InTransit';
  if (['transferheld'].includes(s)) return 'TransferHeld';
  if (['fault', 'faulted', 'faulty'].includes(s)) return 'Faulty';
  if (['maintenance', 'suspended'].includes(s)) return 'Maintenance';
  if (['occupied'].includes(s)) return 'Occupied';
  if (['charging'].includes(s)) return 'Charging';
  if (['needscharging'].includes(s)) return 'NeedsCharging';
  if (['idle'].includes(s)) return 'Idle';
  return str;
}

function normalizeResourceStatus(status, aliases) {
  const key = typeof status === 'string' ? status.toLowerCase().replace(/[_\s-]/g, '') : '';
  const normalized = aliases[key];
  if (!normalized) throw new DomainError('INVALID_STATE_TRANSITION', `Unsupported resource status '${status}'.`);
  return normalized;
}

const vehicleStatuses = {
  available: 'Available', reserved: 'Reserved', inuse: 'InUse', needscharging: 'NeedsCharging', charging: 'Charging',
  transferheld: 'TransferHeld', intransit: 'InTransit', intransfer: 'InTransit', faulty: 'Faulty', faulted: 'Faulty',
  maintenance: 'Maintenance', suspended: 'Maintenance', retired: 'Retired'
};
const slotStatuses = { available: 'Available', held: 'Held', reserved: 'Held', heldfortransfer: 'Held', occupied: 'Occupied', suspended: 'Suspended', blocked: 'Suspended' };
const pointStatuses = { available: 'Available', idle: 'Idle', reserved: 'Reserved', occupied: 'Reserved', starting: 'Starting', charging: 'Charging', stopping: 'Stopping', complete: 'Complete', fault: 'Fault', faulted: 'Fault', repair: 'Repair', maintenance: 'Repair', retired: 'Retired' };

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
    this.status = normalizeResourceStatus(status, vehicleStatuses);
    this.ownerId = ownerId; // null = shared vehicle; non-null = private vehicle
  }

  isShared() {
    return this.ownerId === null;
  }

  isAvailable() {
    const s = this.status.toLowerCase();
    return s === 'available';
  }

  canTransfer() {
    return this.isAvailable() && this.batteryPercent >= 80;
  }

  /**
   * BR11: Check if vehicle can be removed from system
   */
  canDelete() {
    const s = this.status.toLowerCase();
    if (['inuse', 'reserved', 'transferheld', 'intransit'].includes(s)) {
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
    if (!this.isAvailable()) {
      throw new DomainError('VEHICLE_NOT_AVAILABLE', `Vehicle ${this.id} is not available for reservation (status: ${this.status}).`);
    }
    this.status = VehicleStatus.RESERVED;
  }

  releaseReservation() {
    if (this.status.toLowerCase() === 'reserved') {
      this.status = VehicleStatus.AVAILABLE;
    }
  }

  pickup() {
    const s = this.status.toLowerCase();
    if (s !== 'reserved' && s !== 'available') {
      throw new DomainError('VEHICLE_CANNOT_PICKUP', `Vehicle ${this.id} cannot be picked up from state '${this.status}'.`);
    }
    this.status = VehicleStatus.IN_USE;
  }

  returnToHub(destinationHubId, newBatteryPercent) {
    if (this.status.toLowerCase() !== 'inuse') {
      throw new DomainError('VEHICLE_NOT_IN_USE', `Vehicle ${this.id} cannot be returned because it is not currently in use.`);
    }
    this.hubId = destinationHubId;
    if (typeof newBatteryPercent === 'number') {
      this.batteryPercent = Math.max(0, Math.min(100, Math.round(newBatteryPercent)));
    }
    this.status = this.batteryPercent < 20 ? VehicleStatus.NEEDS_CHARGING : VehicleStatus.AVAILABLE;
  }

  markTransferHeld() {
    if (!this.canTransfer()) {
      throw new DomainError(
        'VEHICLE_INELIGIBLE_FOR_TRANSFER',
        `Vehicle ${this.id} must be available and have >= 80% battery to transfer (status: ${this.status}, battery: ${this.batteryPercent}%).`
      );
    }
    this.status = VehicleStatus.TRANSFER_HELD;
  }

  markInTransit() {
    this.status = VehicleStatus.IN_TRANSIT;
  }

  completeTransfer(destinationHubId) {
    const s = this.status.toLowerCase();
    if (s !== 'intransit' && s !== 'intransfer' && s !== 'transferheld') {
      throw new DomainError('VEHICLE_NOT_IN_TRANSFER', `Vehicle ${this.id} is not currently in transfer.`);
    }
    this.hubId = destinationHubId;
    this.status = VehicleStatus.AVAILABLE;
  }

  cancelTransfer() {
    this.status = VehicleStatus.AVAILABLE;
  }

  suspend(reason) {
    const s = this.status.toLowerCase();
    if (s === 'inuse' || s === 'reserved') {
      throw new DomainError('CANNOT_SUSPEND_ACTIVE_VEHICLE', `Cannot suspend vehicle ${this.id} while in state '${this.status}'.`);
    }
    this.status = VehicleStatus.MAINTENANCE;
  }

  reactivate() {
    const s = this.status.toLowerCase();
    if (!['maintenance', 'suspended', 'faulty', 'fault', 'needscharging'].includes(s)) {
      throw new DomainError('INVALID_REACTIVATION', `Vehicle ${this.id} is already active or in an invalid state for reactivation.`);
    }
    this.status = VehicleStatus.AVAILABLE;
  }

  isolateFault() {
    this.status = VehicleStatus.FAULTY;
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
    this.status = normalizeResourceStatus(status, slotStatuses);
  }

  isAvailable() {
    return this.status.toLowerCase() === 'available';
  }

  holdForTransfer() {
    if (!this.isAvailable()) {
      throw new DomainError('SLOT_NOT_AVAILABLE', `Slot ${this.id} (${this.code}) is not available to hold for transfer.`);
    }
    this.status = SlotStatus.HELD;
  }

  releaseTransferHold() {
    if (this.status.toLowerCase() === 'held') {
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
    this.status = SlotStatus.SUSPENDED;
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
    this.status = normalizeResourceStatus(status, pointStatuses);
  }

  isAvailable() {
    const s = this.status.toLowerCase();
    return s === 'available' || s === 'idle';
  }

  startCharging() {
    const s = this.status.toLowerCase();
    if (s === 'fault' || s === 'faulty' || s === 'repair' || s === 'maintenance') {
      throw new DomainError('POINT_UNAVAILABLE', `Charging point ${this.id} is faulted or under maintenance.`);
    }
    this.status = ChargingPointStatus.CHARGING;
  }

  stopCharging() {
    this.status = ChargingPointStatus.COMPLETE;
  }

  vacate() {
    const s = this.status.toLowerCase();
    if (s !== 'fault' && s !== 'repair') {
      this.status = ChargingPointStatus.AVAILABLE;
    }
  }

  markFaulted() {
    this.status = ChargingPointStatus.FAULT;
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
  normalizeStatus,
  ElectricVehicle,
  ParkingSlot,
  ChargingPoint
};
