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

  /**
   * Save a newly planned transfer order
   * Atomically inserts transfer record, child tables, and marks destination slots as held
   */
  async createTransfer(transfer) {
    return this.client.transaction(async () => {
      // 1. Insert main transfer row
      await this.client.run(
        `INSERT INTO transfers (id, source_hub_id, destination_hub_id, status, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [transfer.id, transfer.sourceHubId, transfer.destinationHubId, transfer.status, transfer.createdAt, transfer.createdBy]
      );

      // 2. Insert vehicle links
      for (const vehicleId of transfer.vehicleIds) {
        await this.client.run(
          `INSERT INTO transfer_vehicles (transfer_id, vehicle_id) VALUES (?, ?);`,
          [transfer.id, vehicleId]
        );
      }

      // 3. Insert and hold destination slots
      for (const slotId of transfer.destinationSlotIds) {
        await this.client.run(
          `INSERT INTO transfer_destination_slots (transfer_id, slot_id) VALUES (?, ?);`,
          [transfer.id, slotId]
        );

        // Mark slot as held for transfer
        const res = await this.client.run(
          `UPDATE parking_slots SET status = 'held_for_transfer' WHERE id = ? AND status = 'available';`,
          [slotId]
        );
        if (res.changes === 0) {
          throw new DomainError('SLOT_HOLD_FAILED', `Failed to hold slot ${slotId} for transfer (already occupied or held).`);
        }
      }

      return transfer;
    });
  }

  /**
   * Retrieve a transfer by ID, hydrating vehicle and destination slot arrays
   */
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

  /**
   * Depart transfer (UC10)
   * Atomically updates transfer status to in_transit and vehicles to in_transfer
   */
  async departTransfer(transfer) {
    return this.client.transaction(async () => {
      // Concurrency guard: update only if still planned
      const res = await this.client.run(
        `UPDATE transfers SET status = ?, departed_at = ? WHERE id = ? AND status = 'planned';`,
        [TransferStatus.IN_TRANSIT, transfer.departedAt, transfer.id]
      );

      if (res.changes === 0) {
        const current = await this.client.get('SELECT status FROM transfers WHERE id = ?;', [transfer.id]);
        throw new DomainError(
          'TRANSFER_DEPART_CONFLICT',
          `Cannot depart transfer ${transfer.id}; current status is '${current ? current.status : 'not_found'}' (409 Conflict).`
        );
      }

      // Mark vehicles as in_transfer
      for (const vehicleId of transfer.vehicleIds) {
        await this.client.run(
          `UPDATE electric_vehicles SET status = 'in_transfer' WHERE id = ?;`,
          [vehicleId]
        );
      }

      return transfer;
    });
  }

  /**
   * Complete transfer arrival (UC10A)
   * Atomically updates transfer to completed, updates vehicle locations and releases/occupies slots
   */
  async arriveTransfer(transfer) {
    return this.client.transaction(async () => {
      // Concurrency guard: update only if in_transit
      const res = await this.client.run(
        `UPDATE transfers 
         SET status = ?, arrived_at = ?, destination_hub_id = ? 
         WHERE id = ? AND status = 'in_transit';`,
        [TransferStatus.COMPLETED, transfer.arrivedAt, transfer.destinationHubId, transfer.id]
      );

      if (res.changes === 0) {
        const current = await this.client.get('SELECT status FROM transfers WHERE id = ?;', [transfer.id]);
        throw new DomainError(
          'TRANSFER_ARRIVE_CONFLICT',
          `Cannot complete arrival for transfer ${transfer.id}; current status is '${current ? current.status : 'not_found'}'.`
        );
      }

      // Update vehicles to destination hub and available
      for (const vehicleId of transfer.vehicleIds) {
        await this.client.run(
          `UPDATE electric_vehicles SET hub_id = ?, status = 'available' WHERE id = ?;`,
          [transfer.destinationHubId, vehicleId]
        );
      }

      // Occupy destination slots
      for (const slotId of transfer.destinationSlotIds) {
        await this.client.run(
          `UPDATE parking_slots SET status = 'occupied' WHERE id = ?;`,
          [slotId]
        );
      }

      return transfer;
    });
  }

  /**
   * Cancel transfer (UC10B)
   * Atomically updates transfer to cancelled and releases held destination slots
   */
  async cancelTransfer(transfer) {
    return this.client.transaction(async () => {
      // Concurrency guard: update only if still planned
      const res = await this.client.run(
        `UPDATE transfers 
         SET status = ?, cancelled_at = ?, cancel_reason = ? 
         WHERE id = ? AND status = 'planned';`,
        [TransferStatus.CANCELLED, transfer.cancelledAt, transfer.cancelReason, transfer.id]
      );

      if (res.changes === 0) {
        const current = await this.client.get('SELECT status FROM transfers WHERE id = ?;', [transfer.id]);
        throw new DomainError(
          'TRANSFER_CANCEL_CONFLICT',
          `Cannot cancel transfer ${transfer.id}; current status is '${current ? current.status : 'not_found'}' (409 Conflict).`
        );
      }

      // Release destination slot holds
      for (const slotId of transfer.destinationSlotIds) {
        await this.client.run(
          `UPDATE parking_slots SET status = 'available' WHERE id = ? AND status = 'held_for_transfer';`,
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
