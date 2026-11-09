/**
 * Domain Model for Vehicle Redistribution / Transfer (UC10, UC10A, UC10B)
 * Module: Operations
 * 
 * Aligned with:
 * - API_CONTRACTS.md: Returns 'Planned', 'InTransit', 'Completed', 'Cancelled'
 * - CLASS_CATALOG.md: TransferStatus enum (Planned, InTransit, Completed, Cancelled)
 * - BR12: sourceHubId !== destinationHubId
 * - BR13: Every vehicle participating must have batteryPercent >= 80% and be Available
 */

const { DomainError } = require('./resource');

const TransferStatus = Object.freeze({
  PLANNED: 'Planned',
  IN_TRANSIT: 'InTransit',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
});

function normalizeTransferStatus(status) {
  if (!status) return TransferStatus.PLANNED;
  const s = String(status).toLowerCase().replace(/[_\s-]/g, '');
  if (s === 'planned') return TransferStatus.PLANNED;
  if (s === 'intransit') return TransferStatus.IN_TRANSIT;
  if (s === 'completed') return TransferStatus.COMPLETED;
  if (s === 'cancelled') return TransferStatus.CANCELLED;
  return status;
}

class Transfer {
  constructor({
    id,
    sourceHubId,
    destinationHubId,
    status = TransferStatus.PLANNED,
    vehicleIds = [],
    destinationSlotIds = [],
    createdAt = new Date().toISOString(),
    departedAt = null,
    arrivedAt = null,
    cancelledAt = null,
    cancelReason = null,
    createdBy
  }) {
    if (!id || typeof id !== 'string') {
      throw new DomainError('INVALID_TRANSFER_ID', 'Transfer ID must be a non-empty string.');
    }
    if (!sourceHubId || !destinationHubId) {
      throw new DomainError('INVALID_HUBS', 'Source and destination hub IDs are required.');
    }
    // BR12: Source and destination hubs must be distinct
    if (sourceHubId === destinationHubId) {
      throw new DomainError(
        'SOURCE_DESTINATION_SAME',
        `Source and destination hubs must be different (BR12 violation: ${sourceHubId} === ${destinationHubId}).`,
        { sourceHubId, destinationHubId }
      );
    }
    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      throw new DomainError('EMPTY_VEHICLE_LIST', 'A transfer order must include at least one vehicle.');
    }
    if (!Array.isArray(destinationSlotIds) || destinationSlotIds.length < vehicleIds.length) {
      throw new DomainError(
        'INSUFFICIENT_DESTINATION_SLOTS',
        `Destination hub must have at least ${vehicleIds.length} reserved slots (got ${destinationSlotIds ? destinationSlotIds.length : 0}).`,
        { required: vehicleIds.length, provided: destinationSlotIds ? destinationSlotIds.length : 0 }
      );
    }

    this.id = id;
    this.sourceHubId = sourceHubId;
    this.destinationHubId = destinationHubId;
    this.status = normalizeTransferStatus(status);
    this.vehicleIds = [...vehicleIds];
    this.destinationSlotIds = [...destinationSlotIds];
    this.createdAt = createdAt;
    this.departedAt = departedAt;
    this.arrivedAt = arrivedAt;
    this.cancelledAt = cancelledAt;
    this.cancelReason = cancelReason;
    this.createdBy = createdBy || 'operator';
  }

  static plan({ id, sourceHubId, destinationHubId, vehicles, destinationSlots, createdBy, now = new Date() }) {
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      throw new DomainError('EMPTY_VEHICLE_LIST', 'Transfer order requires at least one vehicle.');
    }

    // BR13: Validate each vehicle has battery >= 80% and is available
    for (const v of vehicles) {
      if (!v.isAvailable() || v.batteryPercent < 80) {
        throw new DomainError(
          'VEHICLE_NOT_ELIGIBLE_FOR_TRANSFER',
          `Vehicle ${v.id} is ineligible for transfer: status must be 'Available' and battery >= 80% (BR13 violation: status=${v.status}, battery=${v.batteryPercent}%).`,
          { vehicleId: v.id, status: v.status, batteryPercent: v.batteryPercent }
        );
      }
      if (v.hubId !== sourceHubId) {
        throw new DomainError(
          'VEHICLE_NOT_AT_SOURCE_HUB',
          `Vehicle ${v.id} is located at hub ${v.hubId}, not at source hub ${sourceHubId}.`,
          { vehicleId: v.id, vehicleHub: v.hubId, sourceHub: sourceHubId }
        );
      }
    }

    if (!Array.isArray(destinationSlots) || destinationSlots.length < vehicles.length) {
      throw new DomainError('INSUFFICIENT_DESTINATION_SLOTS', 'Not enough destination slots provided for the vehicles.');
    }

    for (const slot of destinationSlots) {
      if (slot.hubId !== destinationHubId) {
        throw new DomainError('SLOT_WRONG_HUB', `Slot ${slot.id} belongs to hub ${slot.hubId}, not destination ${destinationHubId}.`);
      }
      if (!slot.isAvailable()) {
        throw new DomainError('SLOT_NOT_AVAILABLE', `Slot ${slot.id} (${slot.code}) is not available to hold for transfer.`);
      }
    }

    const vehicleIds = vehicles.map(v => v.id);
    const destinationSlotIds = destinationSlots.slice(0, vehicles.length).map(s => s.id);

    return new Transfer({
      id,
      sourceHubId,
      destinationHubId,
      status: TransferStatus.PLANNED,
      vehicleIds,
      destinationSlotIds,
      createdAt: now.toISOString(),
      createdBy
    });
  }

  depart({ vehicles = [], now = new Date() }) {
    const s = this.status.toLowerCase();
    if (s === 'intransit') {
      throw new DomainError('ALREADY_IN_TRANSIT', `Transfer order ${this.id} is already in transit.`);
    }
    if (s === 'cancelled') {
      throw new DomainError('TRANSFER_ALREADY_CANCELLED', `Cannot depart transfer order ${this.id} because it was cancelled.`);
    }
    if (s === 'completed') {
      throw new DomainError('TRANSFER_ALREADY_COMPLETED', `Cannot depart transfer order ${this.id} because it was already completed.`);
    }
    if (s !== 'planned') {
      throw new DomainError('INVALID_STATE_TRANSITION', `Transfer ${this.id} cannot depart from status '${this.status}'.`);
    }

    // Recheck vehicle readiness
    if (vehicles.length > 0) {
      for (const v of vehicles) {
        if (v.batteryPercent < 80) {
          throw new DomainError(
            'VEHICLE_BATTERY_DROPPED',
            `Vehicle ${v.id} battery is now ${v.batteryPercent}%, which is below the 80% transfer threshold (BR13).`
          );
        }
      }
    }

    this.status = TransferStatus.IN_TRANSIT;
    this.departedAt = now.toISOString();
  }

  arrive({ observedVehicleIds = [], replacementDestinationHubId = null, replacementSlotIds = null, now = new Date() }) {
    const s = this.status.toLowerCase();
    if (s !== 'intransit') {
      throw new DomainError(
        'NOT_IN_TRANSIT',
        `Transfer ${this.id} cannot arrive because it is currently in status '${this.status}'.`
      );
    }

    if (!Array.isArray(observedVehicleIds) || observedVehicleIds.length !== this.vehicleIds.length) {
      throw new DomainError(
        'INCOMPLETE_ARRIVAL_SET',
        `Transfer arrival requires the complete set of ${this.vehicleIds.length} vehicles (observed: ${observedVehicleIds.length}).`,
        { planned: this.vehicleIds, observed: observedVehicleIds }
      );
    }

    const missing = this.vehicleIds.filter(id => !observedVehicleIds.includes(id));
    if (missing.length > 0) {
      throw new DomainError(
        'VEHICLE_MISMATCH_ON_ARRIVAL',
        `Observed vehicles do not match planned vehicles. Missing: ${missing.join(', ')}.`,
        { missing }
      );
    }

    if (replacementDestinationHubId) {
      if (!Array.isArray(replacementSlotIds) || replacementSlotIds.length < this.vehicleIds.length) {
        throw new DomainError(
          'INSUFFICIENT_REPLACEMENT_SLOTS',
          `Replacement destination ${replacementDestinationHubId} must provide at least ${this.vehicleIds.length} slots.`
        );
      }
      this.destinationHubId = replacementDestinationHubId;
      this.destinationSlotIds = [...replacementSlotIds.slice(0, this.vehicleIds.length)];
    }

    this.status = TransferStatus.COMPLETED;
    this.arrivedAt = now.toISOString();
  }

  cancel({ reason = 'Operator cancelled order', now = new Date() }) {
    const s = this.status.toLowerCase();
    if (s === 'intransit') {
      throw new DomainError(
        'CANNOT_CANCEL_IN_TRANSIT',
        `Cannot cancel transfer order ${this.id} because vehicles have already departed and are in transit (UC10B exception).`
      );
    }
    if (s === 'completed') {
      throw new DomainError('CANNOT_CANCEL_COMPLETED', `Transfer order ${this.id} is already completed.`);
    }
    if (s === 'cancelled') {
      throw new DomainError('ALREADY_CANCELLED', `Transfer order ${this.id} is already cancelled.`);
    }
    if (s !== 'planned') {
      throw new DomainError('INVALID_STATE_TRANSITION', `Cannot cancel transfer ${this.id} from status '${this.status}'.`);
    }

    this.status = TransferStatus.CANCELLED;
    this.cancelledAt = now.toISOString();
    this.cancelReason = reason;
  }
}

module.exports = {
  TransferStatus,
  normalizeTransferStatus,
  Transfer
};
