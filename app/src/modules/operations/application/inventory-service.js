/**
 * Inventory Application Service (UC09)
 * Module: Operations
 * 
 * Coordinates resource administrative operations:
 * - Resource catalog listing (Vehicles, Slots, Charging Points)
 * - Registration of new assets
 * - Updating specs, operational states (suspend, reactivate)
 * - Deletion with BR11 safety assertions
 * 
 * Aligned with API_CONTRACTS.md:
 * - GET /operations/resources (Optional hubId, kind) -> resource IDs, kinds and operational states
 * - POST /operations/resources (kind, hubId, attributes) -> resource record
 * - PATCH /operations/resources/{id} (Kind-specific mutable attributes) -> resource record
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
   * List resources with optional filters (UC09, API_CONTRACTS.md)
   * @param {{ hubId?: string, kind?: string }} filters
   */
  async listResources(filters = {}) {
    return this.inventoryRepo.listResources(filters);
  }

  /**
   * Register a new resource (UC09, POST /operations/resources)
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

    const normalizedKind = String(kind).toLowerCase();
    const id = attributes.id || `${normalizedKind.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    if (attributes.status && !['available', ...(normalizedKind === 'charging_point' ? ['idle'] : [])].includes(String(attributes.status).toLowerCase())) {
      throw new DomainError('INVALID_STATE_TRANSITION', 'New resources must begin available.');
    }

    if (normalizedKind === 'vehicle') {
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
        kind: 'vehicle',
        hubId: vehicle.hubId,
        status: vehicle.status,
        attributes: {
          vehicleType: vehicle.vehicleType,
          batteryPercent: vehicle.batteryPercent,
          ownerId: vehicle.ownerId
        }
      };
    }

    if (normalizedKind === 'slot') {
      if (!['immediate', 'advance'].includes(attributes.pool)) throw new DomainError('INVALID_INPUT', 'Parking slot pool must be immediate or advance.');
      const code = attributes.code || `SLOT-${id.slice(-4)}`;
      const slot = new ParkingSlot({
        id,
        hubId,
        code,
        status: attributes.status || SlotStatus.AVAILABLE
      });

      await this.inventoryRepo.client.run(
        `INSERT INTO parking_slots (id, hub_id, code, status, pool) VALUES (?, ?, ?, ?, ?);`,
        [slot.id, slot.hubId, slot.code, slot.status, attributes.pool]
      );

      return {
        id: slot.id,
        kind: 'slot',
        hubId: slot.hubId,
        status: slot.status,
        attributes: { code: slot.code, pool: attributes.pool }
      };
    }

    if (normalizedKind === 'charging_point') {
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
        kind: 'charging_point',
        hubId: point.hubId,
        status: point.status,
        attributes: { code: point.code }
      };
    }

    throw new DomainError('UNSUPPORTED_RESOURCE_KIND', `Unknown resource kind '${kind}'.`);
  }

  /**
   * Update mutable resource attributes or operational status (UC09, PATCH /operations/resources/{id})
   * @param {string} id
   * @param {object} patch
   */
  async updateResource(id, patch = {}) {
    return this.inventoryRepo.client.transaction(() => this.updateResourceInTransaction(id, patch));
  }

  async updateResourceInTransaction(id, patch = {}) {
    const vehicleRow = await this.inventoryRepo.client.get('SELECT * FROM electric_vehicles WHERE id = ?;', [id]);
    if (vehicleRow) {
      if (vehicleRow.reservation_id || vehicleRow.trip_id || vehicleRow.transfer_hold_id || ['inuse', 'reserved', 'transferheld', 'intransit', 'intransfer'].includes(String(vehicleRow.status).toLowerCase().replace(/_/g, ''))) {
        throw new DomainError('INVALID_STATE_TRANSITION', 'An active or committed vehicle cannot be modified.');
      }
      if (patch.hubId && patch.hubId !== vehicleRow.hub_id && await this.inventoryRepo.client.get('SELECT id FROM parking_slots WHERE parked_vehicle_id = ?;', [id])) {
        throw new DomainError('INVALID_STATE_TRANSITION', 'A parked vehicle cannot be reassigned to another hub.');
      }
      const vehicle = new ElectricVehicle({
        id: vehicleRow.id,
        hubId: patch.hubId || vehicleRow.hub_id,
        vehicleType: patch.vehicleType || vehicleRow.vehicle_type,
        batteryPercent: typeof patch.batteryPercent === 'number' ? patch.batteryPercent : vehicleRow.battery_percent,
        status: vehicleRow.status,
        ownerId: vehicleRow.owner_id
      });

      if (patch.status && String(patch.status).toLowerCase() === 'available' && await this.inventoryRepo.client.get(
        `SELECT id FROM incidents WHERE resource_kind = 'vehicle' AND resource_id = ? AND LOWER(status) NOT IN ('resolved','closed') LIMIT 1;`, [id])) {
        throw new DomainError('INVALID_STATE_TRANSITION', 'Vehicle has an unresolved incident.');
      }

      if (patch.status && patch.status !== vehicle.status) {
        const s = String(patch.status).toLowerCase();
        if (s === 'maintenance' || s === 'suspended') {
          vehicle.suspend(patch.reason);
        } else if (s === 'available') {
          vehicle.reactivate();
        } else if (s === 'faulty' || s === 'faulted') {
          vehicle.isolateFault();
        } else {
          throw new DomainError('INVALID_STATE_TRANSITION', `Unsupported administrative vehicle transition to '${patch.status}'.`);
        }
      }

      await this.inventoryRepo.updateVehicle(vehicle);
      return {
        id: vehicle.id,
        kind: 'vehicle',
        hubId: vehicle.hubId,
        status: vehicle.status,
        attributes: {
          vehicleType: vehicle.vehicleType,
          batteryPercent: vehicle.batteryPercent,
          ownerId: vehicle.ownerId
        }
      };
    }

    const slotRow = await this.inventoryRepo.client.get('SELECT * FROM parking_slots WHERE id = ?;', [id]);
    if (slotRow) {
      if (patch.pool !== undefined && patch.pool !== slotRow.pool) throw new DomainError('INVALID_STATE_TRANSITION', 'A slot cannot be moved between pools.');
      const current = String(slotRow.status).toLowerCase();
      if (!['available', 'suspended', 'blocked'].includes(current) || slotRow.reservation_id || slotRow.transfer_hold_id || slotRow.occupancy_id || slotRow.parked_vehicle_id) {
        throw new DomainError('INVALID_STATE_TRANSITION', 'A committed or occupied slot cannot be modified.');
      }
      const requested = String(patch.status || slotRow.status).toLowerCase();
      if (!['available', 'suspended', 'blocked'].includes(requested)) throw new DomainError('INVALID_STATE_TRANSITION', 'Unsupported administrative slot status.');
      if (requested === 'available' && await this.inventoryRepo.client.get(`SELECT id FROM incidents WHERE resource_kind = 'slot' AND resource_id = ? AND LOWER(status) NOT IN ('resolved','closed') LIMIT 1;`, [id])) {
        throw new DomainError('INVALID_STATE_TRANSITION', 'Slot has an unresolved incident.');
      }
      const newStatus = requested === 'available' ? 'Available' : 'Suspended';
      const newCode = patch.code || slotRow.code;
      await this.inventoryRepo.client.run(
        'UPDATE parking_slots SET status = ?, code = ? WHERE id = ?;',
        [newStatus, newCode, id]
      );
      return {
        id,
        kind: 'slot',
        hubId: slotRow.hub_id,
        status: newStatus,
        attributes: { code: newCode, pool: slotRow.pool }
      };
    }

    const pointRow = await this.inventoryRepo.client.get('SELECT * FROM charging_points WHERE id = ?;', [id]);
    if (pointRow) {
      const current = String(pointRow.status).toLowerCase();
      if (!['available', 'idle', 'fault', 'faulted', 'repair', 'maintenance'].includes(current)) {
        throw new DomainError('INVALID_STATE_TRANSITION', 'An active charging point cannot be modified.');
      }
      const requested = String(patch.status || pointRow.status).toLowerCase();
      if (!['available', 'idle', 'fault', 'faulted', 'repair', 'maintenance'].includes(requested)) throw new DomainError('INVALID_STATE_TRANSITION', 'Unsupported administrative charging point status.');
      if (['available', 'idle'].includes(requested) && await this.inventoryRepo.client.get(`SELECT id FROM incidents WHERE resource_kind = 'charging_point' AND resource_id = ? AND LOWER(status) NOT IN ('resolved','closed') LIMIT 1;`, [id])) {
        throw new DomainError('INVALID_STATE_TRANSITION', 'Charging point has an unresolved incident.');
      }
      const newStatus = ['available', 'idle'].includes(requested) ? 'Available' : ['fault', 'faulted'].includes(requested) ? 'Fault' : 'Repair';
      const newCode = patch.code || pointRow.code;
      if (patch.status && newStatus.toLowerCase() !== current) {
        await this.inventoryRepo.updateChargingPointStatus(id, newStatus);
      }
      await this.inventoryRepo.client.run(
        'UPDATE charging_points SET code = ? WHERE id = ?;',
        [newCode, id]
      );
      return {
        id,
        kind: 'charging_point',
        hubId: pointRow.hub_id,
        status: newStatus,
        attributes: { code: newCode }
      };
    }

    throw new DomainError('RESOURCE_NOT_FOUND', `Resource with ID ${id} not found.`);
  }

  async deleteVehicle(vehicleId) {
    return this.inventoryRepo.deleteVehicle(vehicleId);
  }
}

module.exports = {
  InventoryService
};
