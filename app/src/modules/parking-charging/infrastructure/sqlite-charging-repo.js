/**
 * SQLite Repository for Charging Requests, Allocations, Sessions, and Durable Device Commands.
 */

class SQLiteChargingRepository {
  constructor(client) {
    if (!client) throw new Error('SQLiteChargingRepository requires a SQLiteClient instance.');
    this.client = client;
  }

  transaction(fn) {
    return this.client.transaction(fn);
  }

  async getHubById(hubId) {
    return this.client.get(
      `SELECT id, name, power_limit_kw AS powerLimitKw
       FROM mobility_hubs WHERE id = ?;`,
      [hubId]
    );
  }

  async getPointById(pointId) {
    return this.client.get(
      `SELECT id, hub_id AS hubId, code, status,
              connector_type AS connectorType, rated_power_kw AS ratedPowerKw
       FROM charging_points WHERE id = ?;`,
      [pointId]
    );
  }

  async listPointsByHub(hubId) {
    return this.client.all(
      `SELECT id, hub_id AS hubId, code, status,
              connector_type AS connectorType, rated_power_kw AS ratedPowerKw
       FROM charging_points WHERE hub_id = ? ORDER BY code ASC;`,
      [hubId]
    );
  }

  async hasUnresolvedIncident(resourceKind, resourceId) {
    const row = await this.client.get(
      `SELECT id FROM incidents
       WHERE LOWER(resource_kind) = LOWER(?) AND resource_id = ?
         AND LOWER(status) NOT IN ('resolved', 'closed') LIMIT 1;`,
      [resourceKind, resourceId]
    );
    return Boolean(row);
  }

  async getCommandById(commandId) {
    return this.client.get(
      `SELECT command_id AS commandId, target_kind AS targetKind, target_id AS targetId,
              action, reference_id AS referenceId, attempt_count AS attemptCount,
              status, last_error AS lastError, consumed_at AS consumedAt,
              created_at AS createdAt, updated_at AS updatedAt
       FROM device_commands WHERE command_id = ?;`,
      [commandId]
    );
  }

  async upsertPendingCommand({ commandId, targetKind, targetId, action, referenceId, nowIso }) {
    const existing = await this.getCommandById(commandId);
    if (existing) return existing;
    await this.client.run(
      `INSERT INTO device_commands (
         command_id, target_kind, target_id, action, reference_id,
         attempt_count, status, last_error, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 0, 'Pending', NULL, ?, ?);`,
      [commandId, targetKind, targetId, action, referenceId, nowIso, nowIso]
    );
    return this.getCommandById(commandId);
  }

  async markCommandAcked(commandId, attemptCount, nowIso) {
    return this.client.run(
      `UPDATE device_commands
       SET status = 'Acked', attempt_count = ?, last_error = NULL, updated_at = ?
       WHERE command_id = ?;`,
      [attemptCount, nowIso, commandId]
    );
  }

  async markCommandFailed(commandId, attemptCount, lastError, nowIso) {
    return this.client.run(
      `UPDATE device_commands
       SET status = 'Failed', attempt_count = ?, last_error = ?, updated_at = ?
       WHERE command_id = ?;`,
      [attemptCount, lastError || 'Unconfirmed device command', nowIso, commandId]
    );
  }

  async consumeLatestAckedCommand(targetKind, targetId, action, consumedAt) {
    const row = await this.client.get(
      `SELECT command_id AS commandId FROM device_commands
       WHERE target_kind = ? AND target_id = ? AND action = ?
         AND status = 'Acked' AND consumed_at IS NULL
       ORDER BY updated_at DESC, rowid DESC LIMIT 1;`,
      [targetKind, targetId, action]
    );
    if (!row) return null;
    await this.client.run(
      `UPDATE device_commands SET consumed_at = ? WHERE command_id = ?;`,
      [consumedAt, row.commandId]
    );
    return row.commandId;
  }

  async insertRequest(record) {
    await this.client.run(
      `INSERT INTO charging_requests (
         id, user_id, vehicle_id, occupancy_id, hub_id,
         battery_at_request, target_battery_percent, needed_by, requested_start,
         manual_priority_rank, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.id,
        record.userId,
        record.vehicleId,
        record.occupancyId ?? null,
        record.hubId,
        record.batteryAtRequest,
        record.targetBatteryPercent,
        record.neededBy,
        record.requestedStart ?? null,
        record.manualPriorityRank ?? null,
        record.status,
        record.createdAt,
        record.updatedAt
      ]
    );
    return this.getRequestById(record.id);
  }

  async getRequestById(id) {
    const req = await this.client.get(
      `SELECT r.id, r.user_id AS userId, r.vehicle_id AS vehicleId,
              r.occupancy_id AS occupancyId, r.hub_id AS hubId,
              r.battery_at_request AS batteryAtRequest,
              r.target_battery_percent AS targetBatteryPercent,
              r.needed_by AS neededBy, r.requested_start AS requestedStart,
              r.manual_priority_rank AS manualPriorityRank,
              r.status, r.created_at AS createdAt, r.updated_at AS updatedAt,
              v.connector_type AS vehicleConnectorType, v.battery_percent AS currentBatteryPercent,
              v.owner_id AS vehicleOwnerId
       FROM charging_requests r
       JOIN electric_vehicles v ON v.id = r.vehicle_id
       WHERE r.id = ?;`,
      [id]
    );
    if (!req) return null;
    const activeAlloc = await this.getActiveAllocationByRequest(id);
    const activeSession = await this.getActiveSessionByRequest(id);
    const latestSession = activeSession || await this.client.get(
      `SELECT id FROM charging_sessions WHERE request_id = ? ORDER BY rowid DESC LIMIT 1;`,
      [id]
    );
    return {
      ...req,
      allocationId: activeAlloc ? activeAlloc.allocationId : null,
      sessionId: latestSession ? latestSession.id : null
    };
  }

  async listQueuedRequestsByHub(hubId) {
    return this.client.all(
      `SELECT r.rowid AS seqOrder, r.id, r.user_id AS userId, r.vehicle_id AS vehicleId,
              r.occupancy_id AS occupancyId, r.hub_id AS hubId,
              r.battery_at_request AS batteryAtRequest,
              r.target_battery_percent AS targetBatteryPercent,
              r.needed_by AS neededBy, r.requested_start AS requestedStart,
              r.manual_priority_rank AS manualPriorityRank,
              r.status, r.created_at AS createdAt, r.updated_at AS updatedAt,
              v.owner_id AS vehicleOwnerId, v.connector_type AS connectorType,
              v.battery_percent AS currentBatteryPercent,
              v.reservation_id AS sharedReservationId
       FROM charging_requests r
       JOIN electric_vehicles v ON v.id = r.vehicle_id
       WHERE r.hub_id = ? AND r.status = 'Queued'
       ORDER BY r.created_at ASC, r.rowid ASC;`,
      [hubId]
    );
  }

  async listQueuedRequestsByOccupancy(occupancyId) {
    return this.client.all(
      `SELECT id FROM charging_requests WHERE occupancy_id = ? AND status = 'Queued';`,
      [occupancyId]
    );
  }

  async listBlockingAllocationsByOccupancy(occupancyId, vehicleId) {
    return this.client.all(
      `SELECT a.allocation_id AS allocationId, a.point_id AS pointId, a.state, r.id AS requestId
       FROM charging_allocations a
       JOIN charging_requests r ON r.id = a.request_id
       WHERE a.released_at IS NULL
         AND (r.occupancy_id = ? OR r.vehicle_id = ?);`,
      [occupancyId, vehicleId]
    );
  }

  async updateRequestStatus(id, status, updatedAt) {
    return this.client.run(
      `UPDATE charging_requests SET status = ?, updated_at = ? WHERE id = ?;`,
      [status, updatedAt, id]
    );
  }

  async setManualPriorityRank(id, rank, updatedAt) {
    return this.client.run(
      `UPDATE charging_requests SET manual_priority_rank = ?, updated_at = ? WHERE id = ? AND status = 'Queued';`,
      [rank, updatedAt, id]
    );
  }

  async insertAllocation(record) {
    await this.client.run(
      `INSERT INTO charging_allocations (
         allocation_id, point_id, request_id, hub_id,
         start_at, end_at, allocated_power_kw, reserved_power_kw,
         state, created_at, released_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.allocationId,
        record.pointId,
        record.requestId,
        record.hubId,
        record.startAt,
        record.endAt,
        record.allocatedPowerKw,
        record.reservedPowerKw,
        record.state,
        record.createdAt,
        record.releasedAt ?? null
      ]
    );
    return this.getAllocationById(record.allocationId);
  }

  async getAllocationById(allocationId) {
    return this.client.get(
      `SELECT allocation_id AS allocationId, point_id AS pointId, request_id AS requestId,
              hub_id AS hubId, start_at AS startAt, end_at AS endAt,
              allocated_power_kw AS allocatedPowerKw, reserved_power_kw AS reservedPowerKw,
              state, created_at AS createdAt, released_at AS releasedAt
       FROM charging_allocations WHERE allocation_id = ?;`,
      [allocationId]
    );
  }

  async getActiveAllocationByPoint(pointId) {
    return this.client.get(
      `SELECT allocation_id AS allocationId, point_id AS pointId, request_id AS requestId,
              hub_id AS hubId, start_at AS startAt, end_at AS endAt,
              allocated_power_kw AS allocatedPowerKw, reserved_power_kw AS reservedPowerKw,
              state, created_at AS createdAt, released_at AS releasedAt
       FROM charging_allocations WHERE point_id = ? AND released_at IS NULL;`,
      [pointId]
    );
  }

  async getActiveAllocationByRequest(requestId) {
    return this.client.get(
      `SELECT allocation_id AS allocationId, point_id AS pointId, request_id AS requestId,
              hub_id AS hubId, start_at AS startAt, end_at AS endAt,
              allocated_power_kw AS allocatedPowerKw, reserved_power_kw AS reservedPowerKw,
              state, created_at AS createdAt, released_at AS releasedAt
       FROM charging_allocations WHERE request_id = ? AND released_at IS NULL;`,
      [requestId]
    );
  }

  async listActiveAllocationsByHub(hubId) {
    return this.client.all(
      `SELECT a.allocation_id AS allocationId, a.point_id AS pointId, a.request_id AS requestId,
              a.hub_id AS hubId, a.start_at AS startAt, a.end_at AS endAt,
              a.allocated_power_kw AS allocatedPowerKw, a.reserved_power_kw AS reservedPowerKw,
              a.state, a.created_at AS createdAt
       FROM charging_allocations a
       WHERE a.hub_id = ? AND a.released_at IS NULL
       ORDER BY a.created_at ASC;`,
      [hubId]
    );
  }

  async getSummedAllocatedPowerAtHub(hubId) {
    const row = await this.client.get(
      `SELECT COALESCE(SUM(allocated_power_kw), 0) AS totalKw
       FROM charging_allocations
       WHERE hub_id = ? AND released_at IS NULL
         AND state IN ('Reserved', 'Starting', 'Charging', 'Stopping', 'FaultUncertain');`,
      [hubId]
    );
    return Number(row ? row.totalKw : 0);
  }

  async updateAllocationState(allocationId, state, { allocatedPowerKw = undefined, releasedAt = undefined } = {}) {
    const fields = ['state = ?'];
    const params = [state];
    if (allocatedPowerKw !== undefined) {
      fields.push('allocated_power_kw = ?');
      params.push(allocatedPowerKw);
    }
    if (releasedAt !== undefined) {
      fields.push('released_at = ?');
      params.push(releasedAt);
    }
    params.push(allocationId);
    return this.client.run(
      `UPDATE charging_allocations SET ${fields.join(', ')} WHERE allocation_id = ?;`,
      params
    );
  }

  async releaseAllocation(allocationId, releasedAt) {
    return this.client.run(
      `UPDATE charging_allocations
       SET allocated_power_kw = 0, released_at = ?
       WHERE allocation_id = ? AND released_at IS NULL;`,
      [releasedAt, allocationId]
    );
  }

  async insertSession(record) {
    await this.client.run(
      `INSERT INTO charging_sessions (
         id, request_id, allocation_id, point_id, started_at,
         stopped_at, allocated_power_kw, status, stop_reason
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.id,
        record.requestId,
        record.allocationId,
        record.pointId,
        record.startedAt,
        record.stoppedAt ?? null,
        record.allocatedPowerKw,
        record.status,
        record.stopReason ?? null
      ]
    );
    return this.getSessionById(record.id);
  }

  async getSessionById(sessionId) {
    return this.client.get(
      `SELECT s.id, s.request_id AS requestId, s.allocation_id AS allocationId,
              s.point_id AS pointId, s.started_at AS startedAt, s.stopped_at AS stoppedAt,
              s.allocated_power_kw AS allocatedPowerKw, s.status, s.stop_reason AS stopReason,
              r.user_id AS userId, r.vehicle_id AS vehicleId, r.hub_id AS hubId,
              r.target_battery_percent AS targetBatteryPercent,
              p.status AS connectorStatus,
              v.battery_percent AS currentBatteryPercent
       FROM charging_sessions s
       JOIN charging_requests r ON r.id = s.request_id
       JOIN charging_points p ON p.id = s.point_id
       JOIN electric_vehicles v ON v.id = r.vehicle_id
       WHERE s.id = ?;`,
      [sessionId]
    );
  }

  async getActiveSessionByRequest(requestId) {
    return this.client.get(
      `SELECT id, request_id AS requestId, allocation_id AS allocationId,
              point_id AS pointId, started_at AS startedAt, allocated_power_kw AS allocatedPowerKw, status
       FROM charging_sessions WHERE request_id = ? AND status = 'Active';`,
      [requestId]
    );
  }

  async getActiveSessionByPoint(pointId) {
    return this.client.get(
      `SELECT id, request_id AS requestId, allocation_id AS allocationId,
              point_id AS pointId, started_at AS startedAt, allocated_power_kw AS allocatedPowerKw, status
       FROM charging_sessions WHERE point_id = ? AND status = 'Active';`,
      [pointId]
    );
  }

  async listActiveSessionsByHub(hubId) {
    return this.client.all(
      `SELECT s.id, s.request_id AS requestId, s.allocation_id AS allocationId,
              s.point_id AS pointId, s.started_at AS startedAt,
              s.allocated_power_kw AS allocatedPowerKw,
              r.user_id AS userId, r.vehicle_id AS vehicleId,
              r.target_battery_percent AS targetBatteryPercent,
              r.needed_by AS neededBy, v.battery_percent AS currentBatteryPercent
       FROM charging_sessions s
       JOIN charging_requests r ON r.id = s.request_id
       JOIN electric_vehicles v ON v.id = r.vehicle_id
       WHERE r.hub_id = ? AND s.status = 'Active'
       ORDER BY v.battery_percent DESC, s.started_at ASC;`,
      [hubId]
    );
  }

  async closeSession(sessionId, { status, stopReason, stoppedAt }) {
    return this.client.run(
      `UPDATE charging_sessions SET status = ?, stop_reason = ?, stopped_at = ?
       WHERE id = ? AND status = 'Active';`,
      [status, stopReason, stoppedAt, sessionId]
    );
  }

  async updateVehicleBattery(vehicleId, batteryPercent) {
    return this.client.run(
      `UPDATE electric_vehicles SET battery_percent = ? WHERE id = ?;`,
      [batteryPercent, vehicleId]
    );
  }

  /**
   * Synchronize shared fleet vehicle SC01 status when entering/exiting active charging.
   * Private vehicles keep their ownership status unchanged.
   */
  async syncSharedVehicleChargingStatus(vehicleId, phase) {
    const vehicle = await this.client.get(
      `SELECT id, owner_id AS ownerId, status, battery_percent AS batteryPercent
       FROM electric_vehicles WHERE id = ?;`,
      [vehicleId]
    );
    if (!vehicle || vehicle.ownerId !== null) return null;

    const current = String(vehicle.status || '').toLowerCase();
    if (phase === 'start') {
      if (current === 'available' || current === 'needscharging') {
        await this.client.run(`UPDATE electric_vehicles SET status = 'Charging' WHERE id = ?;`, [vehicleId]);
        return 'Charging';
      }
      return vehicle.status;
    }

    if (phase === 'stop' && current === 'charging') {
      const openIncident = await this.hasUnresolvedIncident('vehicle', vehicleId);
      const nextStatus = openIncident
        ? 'Faulty'
        : (vehicle.batteryPercent < 20 ? 'NeedsCharging' : 'Available');
      await this.client.run(`UPDATE electric_vehicles SET status = ? WHERE id = ?;`, [nextStatus, vehicleId]);
      return nextStatus;
    }

    return vehicle.status;
  }
}

module.exports = {
  SQLiteChargingRepository
};
