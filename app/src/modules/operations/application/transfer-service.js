/**
 * Vehicle Transfer Application Service (UC10, UC10A, UC10B)
 * Module: Operations
 * 
 * Coordinates inter-hub vehicle redistribution workflows:
 * - Create Transfer Order (Planned): validates BR12, BR13, and locks destination slots
 * - Depart Transfer (InTransit): rechecks readiness and moves vehicles
 * - Confirm Arrival (Completed - UC10A): verifies complete vehicle arrival set
 * - Cancel Transfer (Cancelled - UC10B): releases destination holds
 */

const { Transfer, TransferStatus } = require('../domain/transfer');
const { ElectricVehicle, ParkingSlot, DomainError } = require('../domain/resource');

class TransferService {
  /**
   * @param {import('../infrastructure/sqlite-transfer-repo').SQLiteTransferRepository} transferRepo
   * @param {import('../infrastructure/sqlite-inventory-repo').SQLiteInventoryRepository} inventoryRepo
   */
  constructor(transferRepo, inventoryRepo) {
    if (!transferRepo || !inventoryRepo) {
      throw new Error('TransferService requires transferRepo and inventoryRepo instances.');
    }
    this.transferRepo = transferRepo;
    this.inventoryRepo = inventoryRepo;
  }

  /**
   * Create a new vehicle transfer order (UC10)
   */
  async createTransfer({ sourceHubId, destinationHubId, vehicleIds, destinationSlotIds, createdBy }) {
    if (typeof createdBy !== 'string' || !createdBy.trim()) throw new DomainError('INVALID_REPORTER', 'Authenticated operator identity is required.');
    if (!sourceHubId || !destinationHubId) {
      throw new DomainError('INVALID_INPUT', 'sourceHubId and destinationHubId are required.');
    }
    // BR12: Hub nguồn và Hub đích bắt buộc phải khác nhau
    if (sourceHubId === destinationHubId) {
      throw new DomainError(
        'SOURCE_DESTINATION_SAME',
        `Source and destination hubs must be different (BR12 violation: ${sourceHubId} === ${destinationHubId}).`
      );
    }
    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      throw new DomainError('EMPTY_VEHICLE_LIST', 'At least one vehicle must be specified for transfer.');
    }
    if (!Array.isArray(destinationSlotIds) || destinationSlotIds.length < vehicleIds.length) {
      throw new DomainError(
        'INSUFFICIENT_DESTINATION_SLOTS',
        `Destination hub must provide at least ${vehicleIds.length} slots for transfer (got ${destinationSlotIds ? destinationSlotIds.length : 0}).`
      );
    }

    // 1. Fetch and validate source vehicles
    const vehicles = [];
    for (const vId of vehicleIds) {
      const row = await this.inventoryRepo.client.get('SELECT * FROM electric_vehicles WHERE id = ?;', [vId]);
      if (!row) {
        throw new DomainError('VEHICLE_NOT_FOUND', `Vehicle ${vId} not found in inventory.`);
      }
      vehicles.push(new ElectricVehicle({
        id: row.id,
        hubId: row.hub_id,
        vehicleType: row.vehicle_type,
        batteryPercent: row.battery_percent,
        status: row.status,
        ownerId: row.owner_id
      }));
    }

    // 2. Fetch and validate destination slots
    const destinationSlots = [];
    for (const sId of destinationSlotIds) {
      const row = await this.inventoryRepo.client.get('SELECT * FROM parking_slots WHERE id = ?;', [sId]);
      if (!row) {
        throw new DomainError('SLOT_NOT_FOUND', `Parking slot ${sId} not found in inventory.`);
      }
      destinationSlots.push(new ParkingSlot({
        id: row.id,
        hubId: row.hub_id,
        code: row.code,
        status: row.status
      }));
    }

    // 3. Plan domain transfer (enforces BR13: battery >= 80% & available)
    const transferId = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const transfer = Transfer.plan({
      id: transferId,
      sourceHubId,
      destinationHubId,
      vehicles,
      destinationSlots,
      createdBy
    });

    // 4. Persist in atomic SQLite transaction (locks slots)
    await this.transferRepo.createTransfer(transfer);

    return {
      id: transfer.id,
      sourceHubId: transfer.sourceHubId,
      destinationHubId: transfer.destinationHubId,
      status: transfer.status,
      vehicleIds: transfer.vehicleIds,
      destinationSlotIds: transfer.destinationSlotIds,
      destinationHolds: transfer.destinationSlotIds,
      vehicleSlotAssignments: transfer.vehicleSlotAssignments,
      createdAt: transfer.createdAt
    };
  }

  /**
   * Get transfer details by ID (UC10, API_CONTRACTS.md: transfer state, vehicle IDs and destination holds)
   */
  async getTransfer(id) {
    const transfer = await this.transferRepo.getTransferById(id);
    if (!transfer) {
      throw new DomainError('TRANSFER_NOT_FOUND', `Transfer order ${id} does not exist.`);
    }
    return {
      id: transfer.id,
      sourceHubId: transfer.sourceHubId,
      destinationHubId: transfer.destinationHubId,
      status: transfer.status,
      vehicleIds: transfer.vehicleIds,
      destinationSlotIds: transfer.destinationSlotIds,
      destinationHolds: transfer.destinationSlotIds,
      vehicleSlotAssignments: transfer.vehicleSlotAssignments,
      createdAt: transfer.createdAt,
      departedAt: transfer.departedAt,
      arrivedAt: transfer.arrivedAt,
      cancelledAt: transfer.cancelledAt,
      cancelReason: transfer.cancelReason,
      createdBy: transfer.createdBy
    };
  }

  /**
   * Depart transfer (UC10)
   */
  async departTransfer(id) {
    const transfer = await this.transferRepo.getTransferById(id);
    if (!transfer) {
      throw new DomainError('TRANSFER_NOT_FOUND', `Transfer order ${id} does not exist.`);
    }

    // Recheck vehicle battery levels at departure
    const vehicles = [];
    for (const vId of transfer.vehicleIds) {
      const row = await this.inventoryRepo.client.get('SELECT * FROM electric_vehicles WHERE id = ?;', [vId]);
      if (row) {
        vehicles.push(new ElectricVehicle({
          id: row.id,
          hubId: row.hub_id,
          vehicleType: row.vehicle_type,
          batteryPercent: row.battery_percent,
          status: row.status
        }));
      }
    }

    transfer.depart({ vehicles, now: new Date() });

    await this.transferRepo.departTransfer(transfer);

    return {
      id: transfer.id,
      status: transfer.status,
      departedAt: transfer.departedAt
    };
  }

  /**
   * Confirm transfer arrival (UC10A)
   */
  async arriveTransfer(id, { observedVehicleIds, replacementDestinationHubId = null, replacementSlotIds = null, vehicleSlotAssignments = null }) {
    const transfer = await this.transferRepo.getTransferById(id);
    if (!transfer) {
      throw new DomainError('TRANSFER_NOT_FOUND', `Transfer order ${id} does not exist.`);
    }

    transfer.arrive({
      observedVehicleIds,
      replacementDestinationHubId,
      replacementSlotIds,
      vehicleSlotAssignments,
      now: new Date()
    });

    await this.transferRepo.arriveTransfer(transfer);

    return {
      id: transfer.id,
      status: transfer.status,
      arrivedAt: transfer.arrivedAt,
      destinationHubId: transfer.destinationHubId,
      vehicleSlotAssignments: transfer.vehicleSlotAssignments
    };
  }

  /**
   * Cancel planned transfer order (UC10B)
   */
  async cancelTransfer(id, { reason = 'Operator cancelled order' } = {}) {
    const transfer = await this.transferRepo.getTransferById(id);
    if (!transfer) {
      throw new DomainError('TRANSFER_NOT_FOUND', `Transfer order ${id} does not exist.`);
    }

    transfer.cancel({ reason, now: new Date() });

    await this.transferRepo.cancelTransfer(transfer);

    return {
      id: transfer.id,
      status: transfer.status,
      cancelledAt: transfer.cancelledAt,
      cancelReason: transfer.cancelReason
    };
  }
}

module.exports = {
  TransferService
};
