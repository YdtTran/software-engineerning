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
        await this.client.run(
          `UPDATE electric_vehicles SET status = 'TransferHeld' WHERE id = ?;`,
          [vehicleId]
        );
      }

      for (const slotId of transfer.destinationSlotIds) {
        await this.client.run(
          `INSERT INTO transfer_destination_slots (transfer_id, slot_id) VALUES (?, ?);`,
          [transfer.id, slotId]
        );

        const res = await this.client.run(
          `UPDATE parking_slots SET status = 'Held' WHERE id = ? AND (status = 'Available' OR status = 'available');`,
          [slotId]
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
      'SELECT vehicle_id FROM transfer_vehicles WHERE transfer_id = ?;',
      [id]
    );
    const slotRows = await this.client.all(
      'SELECT slot_id FROM transfer_destination_slots WHERE transfer_id = ?;',
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
        await this.client.run(
          `UPDATE electric_vehicles SET status = 'InTransit' WHERE id = ?;`,
          [vehicleId]
        );
      }

      return transfer;
    });
  }

  async arriveTransfer(transfer) {
    return this.client.transaction(async () => {
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
        await this.client.run(
          `UPDATE electric_vehicles SET hub_id = ?, status = 'Available' WHERE id = ?;`,
          [transfer.destinationHubId, vehicleId]
        );
      }

      for (const slotId of transfer.destinationSlotIds) {
        await this.client.run(
          `UPDATE parking_slots SET status = 'Occupied' WHERE id = ?;`,
          [slotId]
        );
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
          `UPDATE electric_vehicles SET status = 'Available' WHERE id = ? AND (status = 'TransferHeld' OR status = 'in_transfer');`,
          [vehicleId]
        );
      }

      // Release destination slot holds
      for (const slotId of transfer.destinationSlotIds) {
        await this.client.run(
          `UPDATE parking_slots SET status = 'Available' WHERE id = ? AND (status = 'Held' OR status = 'held_for_transfer');`,
          [slotId]
        );
      }

      return transfer;
    });
  }
}

module.exports = {
  SQLiteTransferRepository
};
