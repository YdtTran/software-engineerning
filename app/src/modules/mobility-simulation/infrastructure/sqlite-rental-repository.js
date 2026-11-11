const { randomUUID } = require('node:crypto');
const { RentalError } = require('../domain/rental');

function reservation(row) {
  return row && { id: row.id, userId: row.user_id, vehicleId: row.vehicle_id, hubId: row.hub_id,
    status: row.status, ticketCode: row.ticket_code, createdAt: row.created_at, expiresAt: row.expires_at, tripId: row.trip_id };
}
function trip(row) {
  return row && { id: row.id, reservationId: row.reservation_id, userId: row.user_id, vehicleId: row.vehicle_id,
    status: row.status, startTime: row.started_at, endTime: row.ended_at, hubId: row.destination_hub_id,
    slotId: row.destination_slot_id, batteryPercent: row.final_battery_percent, distance: row.distance };
}
function command(row) {
  return row && { ...row, request: JSON.parse(row.request_json), evidence: row.evidence_json && JSON.parse(row.evidence_json) };
}

class SQLiteRentalRepository {
  constructor(client) { this.client = client; }
  async getReservation(id) {
    return reservation(await this.client.get('SELECT * FROM vehicle_reservations WHERE id = ?', [id]));
  }
  async listReservations(userId) {
    return (await this.client.all('SELECT * FROM vehicle_reservations WHERE user_id=? ORDER BY created_at DESC LIMIT 100', [userId])).map(reservation);
  }
  async listTrips(userId) {
    return (await this.client.all('SELECT * FROM mobility_trips WHERE user_id=? ORDER BY started_at DESC LIMIT 100', [userId])).map(trip);
  }
  async getTrip(id, client = this.client) {
    return trip(await client.get('SELECT * FROM mobility_trips WHERE id = ?', [id]));
  }
  async findOutcome(context) {
    const row = await this.client.get('SELECT * FROM mobility_outcomes WHERE scope = ?', [context.scope]);
    if (!row) return null;
    if (row.payload_hash !== context.hash) throw new RentalError('IDEMPOTENCY_KEY_REUSED', 'Key was used for a different payload.');
    return { status: row.status_code, data: JSON.parse(row.response_json) };
  }
  async saveOutcome(context, status, data) {
    await this.client.run('INSERT INTO mobility_outcomes VALUES (?, ?, ?, ?)', [context.scope, context.hash, status, JSON.stringify(data)]);
    return { status, data };
  }
  async once(context, action) {
    return this.client.transaction(async () => await this.findOutcome(context) || action());
  }
  async createReservation({ id, userId, vehicleId, hubId, ticketCode, expiresAt }) {
    await this.client.run(`INSERT INTO vehicle_reservations
      (id,user_id,vehicle_id,hub_id,status,ticket_code,created_at,expires_at) VALUES (?,?,?,?,'Reserved',?,?,?)`,
    [id, userId, vehicleId, hubId, ticketCode, new Date().toISOString(), expiresAt]);
    return this.getReservation(id);
  }
  async setReservation(id, status, tripId = null) {
    await this.client.run('UPDATE vehicle_reservations SET status = ?, trip_id = COALESCE(?, trip_id) WHERE id = ?', [status, tripId, id]);
  }
  async overdue() {
    const rows = await this.client.all("SELECT * FROM vehicle_reservations WHERE status = 'Reserved' AND expires_at <= ?", [new Date().toISOString()]);
    return rows.map(reservation);
  }
  async createTrip(id, record) {
    await this.client.run(`INSERT INTO mobility_trips (id,reservation_id,user_id,vehicle_id,status,started_at)
      VALUES (?,?,?,?,'Active',?)`, [id, record.id, record.userId, record.vehicleId, new Date().toISOString()]);
    return this.getTrip(id);
  }
  async closeTrip(id, input, evidence) {
    await this.client.run(`UPDATE mobility_trips SET status='Completed', ended_at=?, destination_hub_id=?,
      destination_slot_id=?, final_battery_percent=?, distance=? WHERE id=? AND status='Active'`,
    [new Date().toISOString(), input.hubId, input.slotId, evidence.batteryPercent, evidence.distanceKm ?? null, id]);
    return this.getTrip(id);
  }
  async getCommand(scope) {
    return command(await this.client.get('SELECT * FROM mobility_commands WHERE scope = ?', [scope]));
  }
  async pendingCommand(kind, aggregateId) {
    return command(await this.client.get("SELECT * FROM mobility_commands WHERE kind=? AND aggregate_id=? AND state <> 'Completed'", [kind, aggregateId]));
  }
  async createCommand(context, kind, aggregateId, request, tripId) {
    const id = randomUUID();
    await this.client.run(`INSERT INTO mobility_commands
      (id,scope,payload_hash,kind,aggregate_id,request_json,trip_id,state) VALUES (?,?,?,?,?,?,?,'Pending')`,
    [id, context.scope, context.hash, kind, aggregateId, JSON.stringify(request), tripId]);
    return this.getCommand(context.scope);
  }
  async event(kind, recordId, payload) {
    await this.client.run('INSERT INTO mobility_events VALUES (?,?,?,?,?)',
      [randomUUID(), kind, recordId, new Date().toISOString(), JSON.stringify(payload)]);
  }
}

module.exports = { SQLiteRentalRepository };
