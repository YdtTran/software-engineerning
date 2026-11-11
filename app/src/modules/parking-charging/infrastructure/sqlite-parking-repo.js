/**
 * SQLite Repository for Parking Reservations, Occupancies, and LIM-01 Conflicts.
 * Shares the application SQLiteClient instance so multi-module operations commit atomically.
 */

class SQLiteParkingRepository {
  constructor(client) {
    if (!client) throw new Error('SQLiteParkingRepository requires a SQLiteClient instance.');
    this.client = client;
  }

  transaction(fn) {
    return this.client.transaction(fn);
  }

  async getHubById(hubId) {
    return this.client.get(
      `SELECT id, name, power_limit_kw AS powerLimitKw,
              immediate_hold_ttl_minutes AS immediateHoldTtlMinutes,
              late_arrival_grace_minutes AS lateArrivalGraceMinutes,
              overstay_grace_minutes AS overstayGraceMinutes,
              overstay_rate_per_hour AS overstayRatePerHour
       FROM mobility_hubs WHERE id = ?;`,
      [hubId]
    );
  }

  async listHubIds() {
    const rows = await this.client.all('SELECT id FROM mobility_hubs ORDER BY id ASC;');
    return rows.map(r => r.id);
  }

  async getVehicleById(vehicleId) {
    return this.client.get(
      `SELECT id, hub_id AS hubId, vehicle_type AS vehicleType, battery_percent AS batteryPercent,
              status, owner_id AS ownerId, connector_type AS connectorType
       FROM electric_vehicles WHERE id = ?;`,
      [vehicleId]
    );
  }

  async getSlotById(slotId) {
    return this.client.get(
      `SELECT id, hub_id AS hubId, code, status, pool,
              reservation_id AS reservationId, transfer_hold_id AS transferHoldId,
              occupancy_id AS occupancyId, parked_vehicle_id AS parkedVehicleId
       FROM parking_slots WHERE id = ?;`,
      [slotId]
    );
  }

  async getCommitmentByReservationId(reservationId) {
    return this.client.get(
      `SELECT reservation_id AS reservationId, slot_id AS slotId, pool,
              starts_at AS startsAt, ends_at AS endsAt, expires_at AS expiresAt,
              occupancy_id AS occupancyId, released_at AS releasedAt, status
       FROM parking_commitments WHERE reservation_id = ?;`,
      [reservationId]
    );
  }

  async insertReservation(record) {
    await this.client.run(
      `INSERT INTO parking_reservations (
         id, user_id, vehicle_id, hub_id, slot_id, pool, ticket_code,
         planned_arrival, planned_checkout, expires_at, status,
         assisted_by, replaces_reservation_id, created_at, cancelled_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.id,
        record.userId,
        record.vehicleId,
        record.hubId,
        record.slotId,
        record.pool,
        record.ticketCode,
        record.plannedArrival ?? null,
        record.plannedCheckout ?? null,
        record.expiresAt,
        record.status,
        record.assistedBy ?? null,
        record.replacesReservationId ?? null,
        record.createdAt,
        record.cancelledAt ?? null
      ]
    );
    return this.getReservationById(record.id);
  }

  async getReservationById(id) {
    return this.client.get(
      `SELECT r.id, r.user_id AS userId, r.vehicle_id AS vehicleId, r.hub_id AS hubId,
              r.slot_id AS slotId, r.pool, r.ticket_code AS ticketCode,
              r.planned_arrival AS plannedArrival, r.planned_checkout AS plannedCheckout,
              r.expires_at AS expiresAt, r.status, r.assisted_by AS assistedBy,
              r.replaces_reservation_id AS replacesReservationId,
              r.created_at AS createdAt, r.cancelled_at AS cancelledAt,
              o.id AS occupancyId
       FROM parking_reservations r
       LEFT JOIN parking_occupancies o ON o.reservation_id = r.id
       WHERE r.id = ?;`,
      [id]
    );
  }

  async markReservationCancelled(id, cancelledAt) {
    return this.client.run(
      `UPDATE parking_reservations SET status = 'Cancelled', cancelled_at = ?
       WHERE id = ? AND status = 'Reserved';`,
      [cancelledAt, id]
    );
  }

  async markReservationFulfilled(id, assistedBy = null) {
    return this.client.run(
      `UPDATE parking_reservations SET status = 'Fulfilled', assisted_by = COALESCE(?, assisted_by)
       WHERE id = ? AND status = 'Reserved';`,
      [assistedBy, id]
    );
  }

  async markReservationExpired(id) {
    return this.client.run(
      `UPDATE parking_reservations SET status = 'Expired'
       WHERE id = ? AND status = 'Reserved';`,
      [id]
    );
  }

  async listOverdueReservedReservations(nowIso) {
    return this.client.all(
      `SELECT id, user_id AS userId, vehicle_id AS vehicleId, hub_id AS hubId,
              slot_id AS slotId, pool, expires_at AS expiresAt
       FROM parking_reservations
       WHERE status = 'Reserved' AND expires_at <= ?
       ORDER BY expires_at ASC;`,
      [nowIso]
    );
  }

  async insertOccupancy(record) {
    await this.client.run(
      `INSERT INTO parking_occupancies (
         id, reservation_id, user_id, vehicle_id, hub_id, slot_id,
         actual_checkin_at, scheduled_checkout_at, actual_checkout_at,
         final_fee, assisted_by, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.id,
        record.reservationId,
        record.userId,
        record.vehicleId,
        record.hubId,
        record.slotId,
        record.actualCheckInAt,
        record.scheduledCheckoutAt ?? null,
        record.actualCheckoutAt ?? null,
        record.finalFee ?? null,
        record.assistedBy ?? null,
        record.createdAt
      ]
    );
    return this.getOccupancyById(record.id);
  }

  async getOccupancyById(id) {
    return this.client.get(
      `SELECT id, reservation_id AS reservationId, user_id AS userId,
              vehicle_id AS vehicleId, hub_id AS hubId, slot_id AS slotId,
              actual_checkin_at AS actualCheckInAt,
              scheduled_checkout_at AS scheduledCheckoutAt,
              actual_checkout_at AS actualCheckoutAt,
              final_fee AS finalFee, assisted_by AS assistedBy, created_at AS createdAt
       FROM parking_occupancies WHERE id = ?;`,
      [id]
    );
  }

  async getActiveOccupancyByVehicle(vehicleId) {
    return this.client.get(
      `SELECT id, reservation_id AS reservationId, user_id AS userId,
              vehicle_id AS vehicleId, hub_id AS hubId, slot_id AS slotId,
              actual_checkin_at AS actualCheckInAt, scheduled_checkout_at AS scheduledCheckoutAt
       FROM parking_occupancies WHERE vehicle_id = ? AND actual_checkout_at IS NULL;`,
      [vehicleId]
    );
  }

  async completeOccupancyCheckout(id, { actualCheckoutAt, finalFee, assistedBy = null }) {
    return this.client.run(
      `UPDATE parking_occupancies
       SET actual_checkout_at = ?, final_fee = ?, assisted_by = COALESCE(?, assisted_by)
       WHERE id = ? AND actual_checkout_at IS NULL;`,
      [actualCheckoutAt, finalFee ?? null, assistedBy, id]
    );
  }

  async getOpenConflictByReservation(blockedReservationId, blockingOccupancyId) {
    return this.client.get(
      `SELECT id, blocked_reservation_id AS blockedReservationId,
              blocking_occupancy_id AS blockingOccupancyId,
              hub_id AS hubId, slot_id AS slotId,
              replacement_reservation_id AS replacementReservationId,
              incident_id AS incidentId, status, created_at AS createdAt
       FROM parking_conflicts
       WHERE blocked_reservation_id = ? AND COALESCE(blocking_occupancy_id, '') = COALESCE(?, '')
         AND status = 'Open';`,
      [blockedReservationId, blockingOccupancyId ?? null]
    );
  }

  async getConflictById(id) {
    return this.client.get(
      `SELECT id, blocked_reservation_id AS blockedReservationId,
              blocking_occupancy_id AS blockingOccupancyId,
              hub_id AS hubId, slot_id AS slotId,
              replacement_reservation_id AS replacementReservationId,
              incident_id AS incidentId, status, created_at AS createdAt, resolved_at AS resolvedAt
       FROM parking_conflicts WHERE id = ?;`,
      [id]
    );
  }

  async insertConflict(record) {
    await this.client.run(
      `INSERT INTO parking_conflicts (
         id, blocked_reservation_id, blocking_occupancy_id, hub_id, slot_id,
         replacement_reservation_id, incident_id, status, created_at, resolved_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.id,
        record.blockedReservationId,
        record.blockingOccupancyId ?? null,
        record.hubId,
        record.slotId,
        record.replacementReservationId ?? null,
        record.incidentId ?? null,
        record.status,
        record.createdAt,
        record.resolvedAt ?? null
      ]
    );
    return this.getConflictById(record.id);
  }

  async resolveConflictWithReplacement(conflictId, replacementReservationId, resolvedAt) {
    return this.client.run(
      `UPDATE parking_conflicts
       SET replacement_reservation_id = ?, status = 'Resolved', resolved_at = ?
       WHERE id = ? AND status = 'Open';`,
      [replacementReservationId, resolvedAt, conflictId]
    );
  }
}

module.exports = {
  SQLiteParkingRepository
};
