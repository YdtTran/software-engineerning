/**
 * SQLite Repository for Vehicle Transfers (UC10, UC10A, UC10B)
 * Module: Operations (Infrastructure)
 * 
 * Handles atomic persistence for inter-hub vehicle redistribution:
 * - Creates transfer orders and locks vehicles / destination slots in a single transaction.
 * - Manages departure, arrival (UC10A), and cancellation (UC10B).
 */

const { Transfer, TransferStatus } = require('../domain/transfer');
const { DomainError } = require('../domain/resource');

class SQLiteTransferRepository {
  /**
   * @param {import('./sqlite-client').SQLiteClient} client
   */
  constructor(client) {
    if (!client) {
      throw new Error('SQLiteTransferRepository requires a SQLiteClient instance.');
    }
    this.client = client;
  }

  async createTransfer(transfer) {
    return this.client.transaction(async () => {
      await this.client.run(
        `INSERT INTO transfers (id, source_hub_id, destination_hub_id, status, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [transfer.id, transfer.sourceHubId, transfer.destinationHubId, transfer.status, transfer.createdAt, transfer.createdBy]
      );

      for (const vehicleId of transfer.vehicleIds) {
        await this.client.run(
          `INSERT INTO transfer_vehicles (transfer_id, vehicle_id) VALUES (?, ?);`,
          [transfer.id, vehicleId]
        );
        // Mark vehicle as transfer held
        const claimed = await this.client.run(
          `UPDATE electric_vehicles SET status = 'TransferHeld', transfer_hold_id = ?
           WHERE id = ? AND hub_id = ? AND status IN ('Available', 'available') AND battery_percent >= 80
             AND owner_id IS NULL AND reservation_id IS NULL AND trip_id IS NULL AND transfer_hold_id IS NULL AND pickup_claimed = 0
             AND NOT EXISTS (SELECT 1 FROM incidents WHERE resource_kind = 'vehicle' AND resource_id = electric_vehicles.id AND LOWER(status) NOT IN ('resolved','closed'));`,
          [transfer.id, vehicleId, transfer.sourceHubId]
        );
        if (claimed.changes !== 1) {
          throw new DomainError('VEHICLE_NOT_ELIGIBLE_FOR_TRANSFER', `Vehicle ${vehicleId} is no longer eligible for transfer.`);
        }
      }

      for (const slotId of transfer.destinationSlotIds) {
        await this.client.run(
          `INSERT INTO transfer_destination_slots (transfer_id, slot_id) VALUES (?, ?);`,
          [transfer.id, slotId]
        );

        const res = await this.client.run(
          `UPDATE parking_slots SET status = 'Held', transfer_hold_id = ? WHERE id = ? AND hub_id = ? AND status IN ('Available', 'available')
           AND transfer_hold_id IS NULL AND reservation_id IS NULL AND occupancy_id IS NULL AND parked_vehicle_id IS NULL
           AND NOT EXISTS (SELECT 1 FROM parking_commitments WHERE slot_id = parking_slots.id AND ends_at > ?
             AND ((status = 'Reserved' AND expires_at > ?) OR (status = 'Fulfilled' AND released_at IS NULL)));`,
          [transfer.id, slotId, transfer.destinationHubId, new Date().toISOString(), new Date().toISOString()]
        );
        if (res.changes === 0) {
          throw new DomainError('SLOT_HOLD_FAILED', `Failed to hold slot ${slotId} for transfer (already occupied or held).`);
        }
      }

      return transfer;
    });
  }

  async getTransferById(id) {
    const row = await this.client.get('SELECT * FROM transfers WHERE id = ?;', [id]);
    if (!row) {
      return null;
    }

    const vehicleRows = await this.client.all(
      'SELECT vehicle_id FROM transfer_vehicles WHERE transfer_id = ? ORDER BY vehicle_id;',
      [id]
    );
    const slotRows = await this.client.all(
      'SELECT slot_id FROM transfer_destination_slots WHERE transfer_id = ? ORDER BY slot_id;',
      [id]
    );

    return new Transfer({
      id: row.id,
      sourceHubId: row.source_hub_id,
      destinationHubId: row.destination_hub_id,
      status: row.status,
      vehicleIds: vehicleRows.map(r => r.vehicle_id),
      destinationSlotIds: slotRows.map(r => r.slot_id),
      createdAt: row.created_at,
      departedAt: row.departed_at,
      arrivedAt: row.arrived_at,
      cancelledAt: row.cancelled_at,
      cancelReason: row.cancel_reason,
      createdBy: row.created_by
    });
  }

  async departTransfer(transfer) {
    return this.client.transaction(async () => {
      const res = await this.client.run(
        `UPDATE transfers 
         SET status = ?, departed_at = ? 
         WHERE id = ? AND (status = 'Planned' OR status = 'planned');`,
        [TransferStatus.IN_TRANSIT, transfer.departedAt, transfer.id]
      );

      if (res.changes === 0) {
        const current = await this.client.get('SELECT status FROM transfers WHERE id = ?;', [transfer.id]);
        throw new DomainError(
          'TRANSFER_DEPART_CONFLICT',
          `Cannot depart transfer ${transfer.id}; current status is '${current ? current.status : 'not_found'}' (409 Conflict).`
        );
      }

      for (const vehicleId of transfer.vehicleIds) {
        const updated = await this.client.run(
          `UPDATE electric_vehicles SET status = 'InTransit' WHERE id = ? AND hub_id = ? AND status = 'TransferHeld' AND battery_percent >= 80 AND transfer_hold_id = ?;`,
          [vehicleId, transfer.sourceHubId, transfer.id]
        );
        if (updated.changes !== 1) throw new DomainError('VEHICLE_NOT_ELIGIBLE_FOR_TRANSFER', `Vehicle ${vehicleId} is no longer ready for departure.`);
        const slot = await this.client.get('SELECT id, occupancy_id FROM parking_slots WHERE parked_vehicle_id = ?;', [vehicleId]);
        if (slot) {
          const vacated = await this.client.run(
            `UPDATE parking_slots SET status = CASE WHEN status IN ('Occupied','occupied') THEN 'Available' ELSE status END,
             occupancy_id = NULL, parked_vehicle_id = NULL WHERE id = ? AND hub_id = ? AND parked_vehicle_id = ?
             AND status IN ('Occupied','occupied','Suspended','blocked');`, [slot.id, transfer.sourceHubId, vehicleId]);
          if (vacated.changes !== 1) throw new DomainError('SLOT_UNAVAILABLE', `Vehicle ${vehicleId} has an inconsistent parking location.`);
          await this.client.run(`UPDATE parking_commitments SET released_at = ? WHERE slot_id = ? AND occupancy_id = ? AND status = 'Fulfilled' AND released_at IS NULL;`, [new Date().toISOString(), slot.id, slot.occupancy_id]);
        }
      }

      return transfer;
    });
  }

  async arriveTransfer(transfer) {
    return this.client.transaction(async () => {
      const original = await this.client.get('SELECT destination_hub_id FROM transfers WHERE id = ?;', [transfer.id]);
      const originalSlots = await this.client.all('SELECT slot_id FROM transfer_destination_slots WHERE transfer_id = ?;', [transfer.id]);
      if (!original) throw new DomainError('TRANSFER_NOT_FOUND', `Transfer ${transfer.id} not found.`);
      const oldIds = originalSlots.map(row => row.slot_id);
      const replacement = original.destination_hub_id !== transfer.destinationHubId ||
        oldIds.length !== transfer.destinationSlotIds.length || oldIds.some(id => !transfer.destinationSlotIds.includes(id));
      if (replacement) {
        if (!await this.client.get('SELECT id FROM mobility_hubs WHERE id = ?;', [transfer.destinationHubId])) {
          throw new DomainError('HUB_NOT_FOUND', `Hub ${transfer.destinationHubId} not found.`);
        }
        for (const slotId of transfer.destinationSlotIds.filter(id => !oldIds.includes(id))) {
          const held = await this.client.run(
            `UPDATE parking_slots SET status = 'Held', transfer_hold_id = ? WHERE id = ? AND hub_id = ? AND LOWER(status) = 'available'
             AND transfer_hold_id IS NULL AND reservation_id IS NULL AND occupancy_id IS NULL AND parked_vehicle_id IS NULL
             AND NOT EXISTS (SELECT 1 FROM parking_commitments WHERE slot_id = parking_slots.id AND ends_at > ?
               AND ((status = 'Reserved' AND expires_at > ?) OR (status = 'Fulfilled' AND released_at IS NULL)));`,
            [transfer.id, slotId, transfer.destinationHubId, new Date().toISOString(), new Date().toISOString()]
          );
          if (held.changes !== 1) throw new DomainError('SLOT_HOLD_FAILED', `Replacement slot ${slotId} is unavailable.`);
        }
        for (const slotId of oldIds.filter(id => !transfer.destinationSlotIds.includes(id))) {
          const released = await this.client.run(
            `UPDATE parking_slots SET status = 'Available', transfer_hold_id = NULL WHERE id = ? AND hub_id = ? AND status IN ('Held', 'held_for_transfer') AND transfer_hold_id = ?;`,
            [slotId, original.destination_hub_id, transfer.id]
          );
          if (released.changes !== 1) throw new DomainError('SLOT_HOLD_FAILED', `Original slot ${slotId} is no longer held.`);
        }
        await this.client.run('DELETE FROM transfer_destination_slots WHERE transfer_id = ?;', [transfer.id]);
        for (const slotId of transfer.destinationSlotIds) {
          await this.client.run('INSERT INTO transfer_destination_slots (transfer_id, slot_id) VALUES (?, ?);', [transfer.id, slotId]);
        }
      }
      const res = await this.client.run(
        `UPDATE transfers 
         SET status = ?, arrived_at = ?, destination_hub_id = ? 
         WHERE id = ? AND (status = 'InTransit' OR status = 'in_transit');`,
        [TransferStatus.COMPLETED, transfer.arrivedAt, transfer.destinationHubId, transfer.id]
      );

      if (res.changes === 0) {
        const current = await this.client.get('SELECT status FROM transfers WHERE id = ?;', [transfer.id]);
        throw new DomainError(
          'TRANSFER_ARRIVE_CONFLICT',
          `Cannot complete arrival for transfer ${transfer.id}; current status is '${current ? current.status : 'not_found'}'.`
        );
      }

      for (const vehicleId of transfer.vehicleIds) {
        const updated = await this.client.run(
          `UPDATE electric_vehicles SET hub_id = ?, transfer_hold_id = NULL, status = CASE
             WHEN status IN ('Faulty', 'faulted') OR EXISTS (SELECT 1 FROM incidents WHERE resource_kind = 'vehicle' AND resource_id = electric_vehicles.id AND LOWER(status) NOT IN ('resolved','closed')) THEN 'Faulty'
             WHEN battery_percent < 20 THEN 'NeedsCharging' ELSE 'Available' END
           WHERE id = ? AND status IN ('InTransit', 'in_transit', 'in_transfer', 'Faulty', 'faulted') AND transfer_hold_id = ?;`,
          [transfer.destinationHubId, vehicleId, transfer.id]
        );
        if (updated.changes !== 1) throw new DomainError('VEHICLE_NOT_IN_TRANSFER', `Vehicle ${vehicleId} is no longer in transit.`);
      }

      for (const [index, slotId] of transfer.destinationSlotIds.entries()) {
        const updated = await this.client.run(
          `UPDATE parking_slots SET status = 'Occupied', transfer_hold_id = NULL, occupancy_id = ?, parked_vehicle_id = ? WHERE id = ? AND hub_id = ? AND status IN ('Held', 'held_for_transfer') AND transfer_hold_id = ?;`,
          [`transfer:${transfer.id}:${slotId}`, transfer.vehicleIds[index], slotId, transfer.destinationHubId, transfer.id]
        );
        if (updated.changes !== 1) throw new DomainError('SLOT_HOLD_FAILED', `Slot ${slotId} is no longer held.`);
      }

      return transfer;
    });
  }

  async cancelTransfer(transfer) {
    return this.client.transaction(async () => {
      const res = await this.client.run(
        `UPDATE transfers 
         SET status = ?, cancelled_at = ?, cancel_reason = ? 
         WHERE id = ? AND (status = 'Planned' OR status = 'planned');`,
        [TransferStatus.CANCELLED, transfer.cancelledAt, transfer.cancelReason, transfer.id]
      );

      if (res.changes === 0) {
        const current = await this.client.get('SELECT status FROM transfers WHERE id = ?;', [transfer.id]);
        throw new DomainError(
          'TRANSFER_CANCEL_CONFLICT',
          `Cannot cancel transfer ${transfer.id}; current status is '${current ? current.status : 'not_found'}' (409 Conflict).`
        );
      }

      // Release vehicle holds
      for (const vehicleId of transfer.vehicleIds) {
        await this.client.run(
          `UPDATE electric_vehicles SET status = CASE WHEN status IN ('TransferHeld', 'in_transfer') THEN 'Available' ELSE status END,
           transfer_hold_id = NULL WHERE id = ? AND transfer_hold_id = ?;`,
          [vehicleId, transfer.id]
        );
      }

      // Release destination slot holds
      for (const slotId of transfer.destinationSlotIds) {
        await this.client.run(
          `UPDATE parking_slots SET status = CASE WHEN status IN ('Held', 'held_for_transfer') THEN 'Available' ELSE status END,
           transfer_hold_id = NULL WHERE id = ? AND transfer_hold_id = ?;`,
          [slotId, transfer.id]
        );
      }

      return transfer;
    });
  }
}

module.exports = {
  SQLiteTransferRepository
};
