/**
 * SQLite Repository for Physical Inventory & Resources (UC09)
 * Module: Operations (Infrastructure)
 * 
 * Implements the database persistence for `InventoryInterface` and resource management:
 * - ElectricVehicles, ParkingSlots, ChargingPoints, MobilityHubs
 * - Atomic state transitions and snapshot capture
 * - Case-insensitive status matching with canonical PascalCase output
 */

const { InventoryInterface } = require('../domain/inventory-interface');
const {
  ElectricVehicle,
  ParkingSlot,
  ChargingPoint,
  VehicleStatus,
  SlotStatus,
  ChargingPointStatus,
  DomainError
} = require('../domain/resource');

class SQLiteInventoryRepository extends InventoryInterface {
  /**
   * @param {import('./sqlite-client').SQLiteClient} client
   */
  constructor(client) {
    super();
    if (!client) {
      throw new Error('SQLiteInventoryRepository requires a SQLiteClient instance.');
    }
    this.client = client;
  }

  // =========================================================================
  // MOBILITY MODULE CONTRACT (Minh)
  // =========================================================================

  async getAvailableVehicles(hubId, vehicleType = null) {
    let sql = `SELECT id, hub_id, vehicle_type, battery_percent, status, owner_id 
               FROM electric_vehicles 
               WHERE hub_id = ? AND LOWER(status) = 'available' AND owner_id IS NULL
                 AND reservation_id IS NULL AND trip_id IS NULL AND transfer_hold_id IS NULL`;
    const params = [hubId];

    if (vehicleType) {
      sql += ' AND vehicle_type = ?';
      params.push(vehicleType);
    }
    sql += ' ORDER BY battery_percent DESC;';

    const rows = await this.client.all(sql, params);
    return rows.map(r => ({
      id: r.id,
      hubId: r.hub_id,
      vehicleType: r.vehicle_type,
      batteryPercent: r.battery_percent,
      status: r.status
    }));
  }

  async reserveVehicle(vehicleId, reservationId, hubId) {
    if (!reservationId || typeof reservationId !== 'string' || !hubId) throw new DomainError('INVALID_INPUT', 'Reservation and hub IDs are required.');
    const row = await this.client.get('SELECT * FROM electric_vehicles WHERE id = ?;', [vehicleId]);
    if (!row) {
      throw new DomainError('VEHICLE_NOT_FOUND', `Vehicle ${vehicleId} not found.`);
    }

    const vehicle = new ElectricVehicle({
      id: row.id,
      hubId: row.hub_id,
      vehicleType: row.vehicle_type,
      batteryPercent: row.battery_percent,
      status: row.status,
      ownerId: row.owner_id
    });

    vehicle.reserve();

    const result = await this.client.run(
      `UPDATE electric_vehicles SET status = ?, reservation_id = ? WHERE id = ? AND hub_id = ? AND LOWER(status) = 'available' AND owner_id IS NULL AND reservation_id IS NULL AND trip_id IS NULL AND transfer_hold_id IS NULL;`,
      [vehicle.status, reservationId, vehicle.id, hubId]
    );
    if (result.changes !== 1) throw new DomainError('VEHICLE_NOT_AVAILABLE', `Vehicle ${vehicleId} is not available for reservation.`);
  }

  async releaseVehicleHold(vehicleId, reservationId) {
    if (!reservationId) throw new DomainError('INVALID_INPUT', 'Reservation ID is required.');
    const result = await this.client.run(
      `UPDATE electric_vehicles SET status = CASE WHEN LOWER(status) = 'reserved' THEN 'Available' ELSE status END, reservation_id = NULL
       WHERE id = ? AND status IN ('Reserved', 'reserved', 'Faulty', 'faulted') AND reservation_id = ?;`,
      [vehicleId, reservationId]
    );
    if (result.changes !== 1) throw new DomainError('VEHICLE_NOT_AVAILABLE', 'Vehicle hold does not belong to this reservation.');
  }

  async pickupVehicle(vehicleId, tripId, reservationId, hubId) {
    if (!tripId || !reservationId || !hubId) throw new DomainError('INVALID_INPUT', 'Trip, reservation and hub IDs are required.');
    return this.client.transaction(() => this.pickupVehicleInTransaction(vehicleId, tripId, reservationId, hubId));
  }

  async pickupVehicleInTransaction(vehicleId, tripId, reservationId, hubId) {
    const row = await this.client.get('SELECT * FROM electric_vehicles WHERE id = ?;', [vehicleId]);
    if (!row) {
      throw new DomainError('VEHICLE_NOT_FOUND', `Vehicle ${vehicleId} not found.`);
    }

    const vehicle = new ElectricVehicle({
      id: row.id,
      hubId: row.hub_id,
      vehicleType: row.vehicle_type,
      batteryPercent: row.battery_percent,
      status: row.status,
      ownerId: row.owner_id
    });

    vehicle.pickup();

    const result = await this.client.run(
      `UPDATE electric_vehicles SET status = ?, reservation_id = NULL, trip_id = ? WHERE id = ? AND hub_id = ? AND LOWER(status) = 'reserved' AND reservation_id = ?;`,
      [vehicle.status, tripId, vehicle.id, hubId, reservationId]
    );
    if (result.changes !== 1) throw new DomainError('VEHICLE_CANNOT_PICKUP', `Vehicle ${vehicleId} is no longer available for pickup.`);
    const slot = await this.client.get('SELECT id, hub_id, status FROM parking_slots WHERE parked_vehicle_id = ?;', [vehicleId]);
    if (slot) {
      const vacated = await this.client.run(
        `UPDATE parking_slots SET status = CASE WHEN status IN ('Occupied','occupied') THEN 'Available' ELSE status END,
         occupancy_id = NULL, parked_vehicle_id = NULL WHERE id = ? AND hub_id = ? AND parked_vehicle_id = ?
         AND status IN ('Occupied','occupied','Suspended','blocked');`, [slot.id, hubId, vehicleId]);
      if (vacated.changes !== 1) throw new DomainError('SLOT_UNAVAILABLE', 'Vehicle parking location is inconsistent.');
    }
  }

  async returnVehicle(vehicleId, destinationHubId, slotId, finalBatteryPercent, tripId, slotReservationId = null) {
    if (!tripId || !destinationHubId || !slotId) throw new DomainError('INVALID_INPUT', 'Trip, destination hub and slot IDs are required.');
    if (!Number.isInteger(finalBatteryPercent) || finalBatteryPercent < 0 || finalBatteryPercent > 100) {
      throw new DomainError('INVALID_BATTERY', 'Battery percent must be an integer between 0 and 100.');
    }
    return this.client.transaction(async () => {
      const row = await this.client.get('SELECT * FROM electric_vehicles WHERE id = ?;', [vehicleId]);
      if (!row) {
        throw new DomainError('VEHICLE_NOT_FOUND', `Vehicle ${vehicleId} not found.`);
      }

      const vehicle = new ElectricVehicle({
        id: row.id,
        hubId: row.hub_id,
        vehicleType: row.vehicle_type,
        batteryPercent: row.battery_percent,
        status: row.status,
        ownerId: row.owner_id
      });

      vehicle.returnToHub(destinationHubId, finalBatteryPercent);

      const updated = await this.client.run(
        `UPDATE electric_vehicles SET hub_id = ?, battery_percent = ?, trip_id = NULL, status = CASE
           WHEN EXISTS (SELECT 1 FROM incidents WHERE resource_kind = 'vehicle' AND resource_id = electric_vehicles.id
                        AND LOWER(status) NOT IN ('resolved', 'closed')) THEN 'Faulty' ELSE ? END
         WHERE id = ? AND status IN ('InUse', 'in_use') AND trip_id = ?;`,
        [vehicle.hubId, vehicle.batteryPercent, vehicle.status, vehicle.id, tripId]
      );
      if (updated.changes !== 1) throw new DomainError('VEHICLE_NOT_IN_USE', `Vehicle ${vehicleId} is no longer in use.`);

      if (slotId) {
        const occupied = await this.client.run(
          `UPDATE parking_slots SET status = 'Occupied', reservation_id = NULL, occupancy_id = ?, parked_vehicle_id = ? WHERE id = ? AND hub_id = ?
           AND parked_vehicle_id IS NULL AND transfer_hold_id IS NULL AND occupancy_id IS NULL
           AND ((status IN ('Available', 'available') AND reservation_id IS NULL) OR (status IN ('Held', 'reserved') AND reservation_id = ? AND reservation_id IS NOT NULL));`,
          [tripId, vehicleId, slotId, destinationHubId, slotReservationId]
        );
        if (occupied.changes !== 1) throw new DomainError('SLOT_UNAVAILABLE', `Slot ${slotId} is not available at the destination hub.`);
      }
    });
  }

  // =========================================================================
  // PARKING & CHARGING CONTRACT (Triết)
  // =========================================================================

  async getAvailableSlots(hubId, pool = null) {
    if (pool !== null) throw new DomainError('POOL_FILTER_UNAVAILABLE', 'Parking pool compatibility is not yet available.');
    const sql = `SELECT id, hub_id, code, status FROM parking_slots WHERE hub_id = ? AND LOWER(status) = 'available'
      AND reservation_id IS NULL AND transfer_hold_id IS NULL AND occupancy_id IS NULL AND parked_vehicle_id IS NULL ORDER BY code ASC;`;
    const rows = await this.client.all(sql, [hubId]);
    return rows.map(r => ({ id: r.id, hubId: r.hub_id, code: r.code, status: r.status }));
  }

  async holdSlotForReservation(slotId, reservationId) {
    if (!reservationId || typeof reservationId !== 'string') throw new DomainError('INVALID_INPUT', 'Reservation ID is required.');
    const res = await this.client.run(
      `UPDATE parking_slots SET status = 'Held', reservation_id = ? WHERE id = ? AND LOWER(status) = 'available' AND reservation_id IS NULL AND transfer_hold_id IS NULL AND occupancy_id IS NULL AND parked_vehicle_id IS NULL;`,
      [reservationId, slotId]
    );
    if (res.changes === 0) {
      throw new DomainError('SLOT_UNAVAILABLE', `Slot ${slotId} is not available.`);
    }
  }

  async releaseSlotHold(slotId, reservationId) {
    if (!reservationId) throw new DomainError('INVALID_INPUT', 'Reservation ID is required.');
    const result = await this.client.run(
      `UPDATE parking_slots SET status = CASE WHEN status IN ('Held', 'reserved') THEN 'Available' ELSE status END, reservation_id = NULL
       WHERE id = ? AND status IN ('Held', 'reserved', 'Suspended', 'blocked') AND reservation_id = ?;`,
      [slotId, reservationId]
    );
    if (result.changes !== 1) throw new DomainError('SLOT_UNAVAILABLE', 'Slot hold does not belong to this reservation.');
  }

  async occupySlot(slotId, occupancyId, reservationId = null) {
    if (!occupancyId) throw new DomainError('INVALID_INPUT', 'Occupancy ID is required.');
    const result = await this.client.run(
      `UPDATE parking_slots SET status = 'Occupied', reservation_id = NULL, occupancy_id = ? WHERE id = ?
       AND parked_vehicle_id IS NULL AND transfer_hold_id IS NULL AND occupancy_id IS NULL
       AND ((status IN ('Available', 'available') AND reservation_id IS NULL) OR (status IN ('Held', 'reserved') AND reservation_id = ? AND reservation_id IS NOT NULL));`,
      [occupancyId, slotId, reservationId]
    );
    if (result.changes !== 1) throw new DomainError('SLOT_UNAVAILABLE', `Slot ${slotId} is unavailable for this occupancy.`);
  }

  async vacateSlot(slotId, occupancyId) {
    if (!occupancyId) throw new DomainError('INVALID_INPUT', 'Occupancy ID is required.');
    const result = await this.client.run(
      `UPDATE parking_slots SET status = 'Available', occupancy_id = NULL, parked_vehicle_id = NULL WHERE id = ? AND status IN ('Occupied', 'occupied') AND occupancy_id = ?;`,
      [slotId, occupancyId]
    );
    if (result.changes !== 1) throw new DomainError('SLOT_UNAVAILABLE', 'Slot does not belong to this occupancy.');
  }

  async updateChargingPointStatus(pointId, status) {
    const aliases = { available: 'Available', idle: 'Available', reserved: 'Reserved', occupied: 'Reserved', starting: 'Starting', charging: 'Charging', stopping: 'Stopping', complete: 'Complete', fault: 'Fault', faulted: 'Fault', repair: 'Repair', maintenance: 'Repair', retired: 'Retired' };
    const transitions = {
      Available: ['Reserved', 'Fault'],
      Reserved: ['Available', 'Starting', 'Fault'],
      Starting: ['Charging', 'Fault'],
      Charging: ['Stopping', 'Fault'],
      Stopping: ['Complete', 'Fault'],
      Complete: ['Available', 'Fault'],
      Fault: ['Repair'],
      Repair: ['Available', 'Fault', 'Retired'],
      Retired: []
    };
    const desired = aliases[String(status).toLowerCase()];
    if (!desired) throw new DomainError('INVALID_STATE_TRANSITION', 'Unknown charging point status.');
    const row = await this.client.get('SELECT status FROM charging_points WHERE id = ?;', [pointId]);
    if (!row) throw new DomainError('POINT_NOT_FOUND', `Charging point ${pointId} not found.`);
    const current = aliases[String(row.status).toLowerCase()];
    if (!current || (current !== desired && !transitions[current].includes(desired))) {
      throw new DomainError('INVALID_STATE_TRANSITION', `Cannot change charging point from ${row.status} to ${status}.`);
    }
    const res = await this.client.run(
      `UPDATE charging_points SET status = ? WHERE id = ? AND status = ? AND (? <> 'Available' OR NOT EXISTS
       (SELECT 1 FROM incidents WHERE resource_kind = 'charging_point' AND resource_id = charging_points.id AND LOWER(status) NOT IN ('resolved','closed')));`,
      [desired, pointId, row.status, desired]
    );
    if (res.changes === 0) {
      throw new DomainError('INVALID_STATE_TRANSITION', `Charging point ${pointId} changed concurrently.`);
    }
  }

  // =========================================================================
  // SNAPSHOT & MONITORING CONTRACT (UC08, UC13)
  // =========================================================================

  async captureNetworkSnapshot() {
    const hubs = await this.client.all('SELECT id, name FROM mobility_hubs ORDER BY name ASC;');
    const vehicles = await this.client.all('SELECT id, hub_id AS hubId, vehicle_type AS vehicleType, battery_percent AS batteryPercent, status FROM electric_vehicles;');
    const slots = await this.client.all('SELECT id, hub_id AS hubId, code, status FROM parking_slots;');
    const chargingPoints = await this.client.all('SELECT id, hub_id AS hubId, code, status FROM charging_points;');

    return {
      capturedAt: new Date().toISOString(),
      hubs,
      vehicles,
      slots,
      chargingPoints
    };
  }

  // =========================================================================
  // OPERATIONS ADMIN CRUD & INVENTORY MANAGEMENT (UC09)
  // =========================================================================

  async listHubs() {
    return this.client.all('SELECT id, name FROM mobility_hubs ORDER BY name ASC;');
  }

  async getHubById(hubId) {
    return this.client.get('SELECT id, name FROM mobility_hubs WHERE id = ?;', [hubId]);
  }

  async listResources({ hubId = null, kind = null } = {}) {
    const results = [];

    if (!kind || kind.toLowerCase() === 'vehicle') {
      let sql = 'SELECT id, hub_id, vehicle_type, battery_percent, status FROM electric_vehicles';
      const params = [];
      if (hubId) {
        sql += ' WHERE hub_id = ?';
        params.push(hubId);
      }
      const rows = await this.client.all(sql, params);
      for (const r of rows) {
        results.push({ id: r.id, kind: 'vehicle', hubId: r.hub_id, status: r.status, attributes: { vehicleType: r.vehicle_type, batteryPercent: r.battery_percent } });
      }
    }

    if (!kind || kind.toLowerCase() === 'slot') {
      let sql = 'SELECT id, hub_id, code, status FROM parking_slots';
      const params = [];
      if (hubId) {
        sql += ' WHERE hub_id = ?';
        params.push(hubId);
      }
      const rows = await this.client.all(sql, params);
      for (const r of rows) {
        results.push({ id: r.id, kind: 'slot', hubId: r.hub_id, status: r.status, attributes: { code: r.code } });
      }
    }

    if (!kind || kind.toLowerCase() === 'charging_point') {
      let sql = 'SELECT id, hub_id, code, status FROM charging_points';
      const params = [];
      if (hubId) {
        sql += ' WHERE hub_id = ?';
        params.push(hubId);
      }
      const rows = await this.client.all(sql, params);
      for (const r of rows) {
        results.push({ id: r.id, kind: 'charging_point', hubId: r.hub_id, status: r.status, attributes: { code: r.code } });
      }
    }

    return results;
  }

  async createVehicle(vehicle) {
    await this.client.run(
      `INSERT INTO electric_vehicles (id, hub_id, vehicle_type, battery_percent, status, owner_id)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [vehicle.id, vehicle.hubId, vehicle.vehicleType, vehicle.batteryPercent, vehicle.status, vehicle.ownerId]
    );
    return vehicle;
  }

  async updateVehicle(vehicle) {
    await this.client.run(
      `UPDATE electric_vehicles 
       SET hub_id = ?, vehicle_type = ?, battery_percent = ?, status = ?, owner_id = ?
       WHERE id = ?;`,
      [vehicle.hubId, vehicle.vehicleType, vehicle.batteryPercent, vehicle.status, vehicle.ownerId, vehicle.id]
    );
    return vehicle;
  }

  async deleteVehicle(vehicleId) {
    return this.client.transaction(() => this.deleteVehicleInTransaction(vehicleId));
  }

  async deleteVehicleInTransaction(vehicleId) {
    const row = await this.client.get('SELECT * FROM electric_vehicles WHERE id = ?;', [vehicleId]);
    if (!row) {
      throw new DomainError('VEHICLE_NOT_FOUND', `Vehicle ${vehicleId} not found.`);
    }
    if (row.reservation_id || row.trip_id || row.transfer_hold_id || await this.client.get('SELECT id FROM parking_slots WHERE parked_vehicle_id = ?;', [vehicleId])) {
      throw new DomainError('CANNOT_DELETE_ACTIVE_VEHICLE', `Vehicle ${vehicleId} is committed to an active operation.`);
    }

    const vehicle = new ElectricVehicle({
      id: row.id,
      hubId: row.hub_id,
      vehicleType: row.vehicle_type,
      batteryPercent: row.battery_percent,
      status: row.status,
      ownerId: row.owner_id
    });

    vehicle.assertCanDelete();

    await this.client.run('DELETE FROM electric_vehicles WHERE id = ?;', [vehicleId]);
  }
}

module.exports = {
  SQLiteInventoryRepository
};
