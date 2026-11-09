/**
 * SQLite Repository for Physical Inventory & Resources (UC09)
 * Module: Operations (Infrastructure)
 * 
 * Implements the database persistence for `InventoryInterface` and resource management:
 * - ElectricVehicles, ParkingSlots, ChargingPoints, MobilityHubs
 * - Atomic state transitions and snapshot capture
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
               WHERE hub_id = ? AND status = 'available' AND owner_id IS NULL`;
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
      batteryPercent: r.battery_percent
    }));
  }

  async reserveVehicle(vehicleId, reservationId) {
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

    await this.client.run(
      'UPDATE electric_vehicles SET status = ? WHERE id = ?;',
      [vehicle.status, vehicle.id]
    );
  }

  async releaseVehicleHold(vehicleId) {
    await this.client.run(
      `UPDATE electric_vehicles SET status = 'available' WHERE id = ? AND status = 'reserved';`,
      [vehicleId]
    );
  }

  async pickupVehicle(vehicleId, tripId) {
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

    await this.client.run(
      'UPDATE electric_vehicles SET status = ? WHERE id = ?;',
      [vehicle.status, vehicle.id]
    );
  }

  async returnVehicle(vehicleId, destinationHubId, slotId, finalBatteryPercent) {
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

      // Update vehicle placement and battery
      await this.client.run(
        'UPDATE electric_vehicles SET hub_id = ?, battery_percent = ?, status = ? WHERE id = ?;',
        [vehicle.hubId, vehicle.batteryPercent, vehicle.status, vehicle.id]
      );

      // Occupy destination slot
      if (slotId) {
        await this.client.run(
          `UPDATE parking_slots SET status = 'occupied' WHERE id = ?;`,
          [slotId]
        );
      }
    });
  }

  // =========================================================================
  // PARKING & CHARGING CONTRACT (Triết)
  // =========================================================================

  async getAvailableSlots(hubId, pool = null) {
    const sql = `SELECT id, hub_id, code, status FROM parking_slots WHERE hub_id = ? AND status = 'available' ORDER BY code ASC;`;
    const rows = await this.client.all(sql, [hubId]);
    return rows.map(r => ({ id: r.id, hubId: r.hub_id, code: r.code, status: r.status }));
  }

  async holdSlotForReservation(slotId, reservationId) {
    const res = await this.client.run(
      `UPDATE parking_slots SET status = 'reserved' WHERE id = ? AND status = 'available';`,
      [slotId]
    );
    if (res.changes === 0) {
      throw new DomainError('SLOT_UNAVAILABLE', `Slot ${slotId} is not available.`);
    }
  }

  async releaseSlotHold(slotId) {
    await this.client.run(
      `UPDATE parking_slots SET status = 'available' WHERE id = ? AND status = 'reserved';`,
      [slotId]
    );
  }

  async occupySlot(slotId, occupancyId) {
    await this.client.run(
      `UPDATE parking_slots SET status = 'occupied' WHERE id = ?;`,
      [slotId]
    );
  }

  async vacateSlot(slotId) {
    await this.client.run(
      `UPDATE parking_slots SET status = 'available' WHERE id = ?;`,
      [slotId]
    );
  }

  async updateChargingPointStatus(pointId, status) {
    const res = await this.client.run(
      `UPDATE charging_points SET status = ? WHERE id = ?;`,
      [status, pointId]
    );
    if (res.changes === 0) {
      throw new DomainError('POINT_NOT_FOUND', `Charging point ${pointId} not found.`);
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

    if (!kind || kind === 'vehicle') {
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

    if (!kind || kind === 'slot') {
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

    if (!kind || kind === 'charging_point') {
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

    // BR11 assertion
    vehicle.assertCanDelete();

    await this.client.run('DELETE FROM electric_vehicles WHERE id = ?;', [vehicleId]);
  }
}

module.exports = {
  SQLiteInventoryRepository
};
