/**
 * Inventory Application Service (UC09)
 * Module: Operations
 * 
 * Coordinates resource administrative operations:
 * - Resource catalog listing (Vehicles, Slots, Charging Points)
 * - Registration of new assets
 * - Updating specs, operational states (suspend, reactivate)
 * - Deletion with BR11 safety assertions
 */

const {
  ElectricVehicle,
  ParkingSlot,
  ChargingPoint,
  VehicleStatus,
  SlotStatus,
  ChargingPointStatus,
  ResourceKind,
  DomainError
} = require('../domain/resource');

class InventoryService {
  /**
   * @param {import('../infrastructure/sqlite-inventory-repo').SQLiteInventoryRepository} inventoryRepo
   */
  constructor(inventoryRepo) {
    if (!inventoryRepo) {
      throw new Error('InventoryService requires an inventory repository instance.');
    }
    this.inventoryRepo = inventoryRepo;
  }

  /**
   * List resources with optional filters (UC09)
   * @param {{ hubId?: string, kind?: string }} filters
   */
  async listResources(filters = {}) {
    return this.inventoryRepo.listResources(filters);
  }

  /**
   * Register a new resource (UC09 Main Flow TH1)
   * @param {{ kind: string, hubId: string, attributes: object }} data
   */
  async createResource({ kind, hubId, attributes = {} }) {
    if (!kind || !hubId) {
      throw new DomainError('INVALID_INPUT', 'Resource kind and hubId are required.');
    }

    const hub = await this.inventoryRepo.getHubById(hubId);
    if (!hub) {
      throw new DomainError('HUB_NOT_FOUND', `Hub with ID ${hubId} does not exist.`);
    }

    const id = attributes.id || `${kind.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    if (kind === ResourceKind.VEHICLE) {
      const vehicle = new ElectricVehicle({
        id,
        hubId,
        vehicleType: attributes.vehicleType || 'electric_bicycle',
        batteryPercent: typeof attributes.batteryPercent === 'number' ? attributes.batteryPercent : 100,
        status: attributes.status || VehicleStatus.AVAILABLE,
        ownerId: attributes.ownerId || null
      });

      await this.inventoryRepo.createVehicle(vehicle);
      return {
        id: vehicle.id,
        kind: ResourceKind.VEHICLE,
        hubId: vehicle.hubId,
        status: vehicle.status,
        attributes: {
          vehicleType: vehicle.vehicleType,
          batteryPercent: vehicle.batteryPercent,
          ownerId: vehicle.ownerId
        }
      };
    }

    if (kind === ResourceKind.SLOT) {
      const code = attributes.code || `SLOT-${id.slice(-4)}`;
      const slot = new ParkingSlot({
        id,
        hubId,
        code,
        status: attributes.status || SlotStatus.AVAILABLE
      });

      // Insert slot through client
      await this.inventoryRepo.client.run(
        `INSERT INTO parking_slots (id, hub_id, code, status) VALUES (?, ?, ?, ?);`,
        [slot.id, slot.hubId, slot.code, slot.status]
      );

      return {
        id: slot.id,
        kind: ResourceKind.SLOT,
        hubId: slot.hubId,
        status: slot.status,
        attributes: { code: slot.code }
      };
    }

    if (kind === ResourceKind.CHARGING_POINT) {
      const code = attributes.code || `CP-${id.slice(-4)}`;
      const point = new ChargingPoint({
        id,
        hubId,
        code,
        status: attributes.status || ChargingPointStatus.AVAILABLE
      });

      await this.inventoryRepo.client.run(
        `INSERT INTO charging_points (id, hub_id, code, status) VALUES (?, ?, ?, ?);`,
        [point.id, point.hubId, point.code, point.status]
      );

      return {
        id: point.id,
        kind: ResourceKind.CHARGING_POINT,
        hubId: point.hubId,
        status: point.status,
        attributes: { code: point.code }
      };
    }

    throw new DomainError('UNSUPPORTED_RESOURCE_KIND', `Unknown resource kind '${kind}'.`);
  }

  /**
   * Update mutable resource attributes or operational status (UC09 Main Flow TH2/TH3/TH4)
   * @param {string} id
   * @param {object} patch
   */
  async updateResource(id, patch = {}) {
    // Check if vehicle
    const vehicleRow = await this.inventoryRepo.client.get('SELECT * FROM electric_vehicles WHERE id = ?;', [id]);
    if (vehicleRow) {
      const vehicle = new ElectricVehicle({
        id: vehicleRow.id,
        hubId: patch.hubId || vehicleRow.hub_id,
        vehicleType: patch.vehicleType || vehicleRow.vehicle_type,
        batteryPercent: typeof patch.batteryPercent === 'number' ? patch.batteryPercent : vehicleRow.battery_percent,
        status: vehicleRow.status,
        ownerId: vehicleRow.owner_id
      });

      // Handle status transitions
      if (patch.status && patch.status !== vehicle.status) {
        if (patch.status === VehicleStatus.SUSPENDED) {
          vehicle.suspend(patch.reason);
        } else if (patch.status === VehicleStatus.AVAILABLE) {
          vehicle.reactivate();
        } else if (patch.status === VehicleStatus.FAULTED) {
          vehicle.isolateFault();
        } else {
          vehicle.status = patch.status;
        }
      }

      await this.inventoryRepo.updateVehicle(vehicle);
      return {
        id: vehicle.id,
        kind: ResourceKind.VEHICLE,
        hubId: vehicle.hubId,
        status: vehicle.status,
        attributes: {
          vehicleType: vehicle.vehicleType,
          batteryPercent: vehicle.batteryPercent,
          ownerId: vehicle.ownerId
        }
      };
    }

    // Check if slot
    const slotRow = await this.inventoryRepo.client.get('SELECT * FROM parking_slots WHERE id = ?;', [id]);
    if (slotRow) {
      const newStatus = patch.status || slotRow.status;
      const newCode = patch.code || slotRow.code;
      await this.inventoryRepo.client.run(
        'UPDATE parking_slots SET status = ?, code = ? WHERE id = ?;',
        [newStatus, newCode, id]
      );
      return {
        id,
        kind: ResourceKind.SLOT,
        hubId: slotRow.hub_id,
        status: newStatus,
        attributes: { code: newCode }
      };
    }

    // Check if charging point
    const pointRow = await this.inventoryRepo.client.get('SELECT * FROM charging_points WHERE id = ?;', [id]);
    if (pointRow) {
      const newStatus = patch.status || pointRow.status;
      const newCode = patch.code || pointRow.code;
      await this.inventoryRepo.client.run(
        'UPDATE charging_points SET status = ?, code = ? WHERE id = ?;',
        [newStatus, newCode, id]
      );
      return {
        id,
        kind: ResourceKind.CHARGING_POINT,
        hubId: pointRow.hub_id,
        status: newStatus,
        attributes: { code: newCode }
      };
    }

    throw new DomainError('RESOURCE_NOT_FOUND', `Resource with ID ${id} not found.`);
  }

  /**
   * Delete vehicle with BR11 safety check (UC09)
   */
  async deleteVehicle(vehicleId) {
    return this.inventoryRepo.deleteVehicle(vehicleId);
  }
}

module.exports = {
  InventoryService
};
