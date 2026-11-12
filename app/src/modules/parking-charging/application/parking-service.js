/**
 * Application Service for UC06 (S1, S2, S3), BR08/BR08a/BR08b, LIM-01, and FR-NI01.
 */

const { randomUUID } = require('node:crypto');
const {
  badRequest,
  forbidden,
  notFound,
  conflict,
  unprocessable
} = require('../domain/errors');
const {
  validatePoolAndInterval,
  computeArrivalDeadline,
  assertCancellable,
  assertValidCheckInWindow,
  calculateOverstayFee
} = require('../domain/parking-policies');
const { runDeviceCommand } = require('./device-command-runner');

const OPERATOR_ROLES = new Set(['operator', 'admin']);

function isOperatorActor(actor) {
  return Boolean(actor && OPERATOR_ROLES.has(String(actor.role || '').toLowerCase()));
}

function assertActorCanAccessResource(actor, ownerUserId, message) {
  if (!actor || !actor.id) {
    throw forbidden('Authenticated user is required.');
  }
  if (!isOperatorActor(actor) && ownerUserId !== actor.id) {
    throw forbidden(message);
  }
}

function formatReservationDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    reservationId: row.id,
    userId: row.userId,
    vehicleId: row.vehicleId,
    privateVehicleId: row.vehicleId,
    hubId: row.hubId,
    slotId: row.slotId,
    pool: row.pool,
    ticketCode: row.ticketCode,
    plannedArrival: row.plannedArrival,
    plannedCheckout: row.plannedCheckout,
    expiresAt: row.expiresAt,
    holdExpiresAt: row.expiresAt,
    status: row.status,
    assistedBy: row.assistedBy,
    replacesReservationId: row.replacesReservationId,
    occupancyId: row.occupancyId ?? null,
    createdAt: row.createdAt,
    cancelledAt: row.cancelledAt ?? null
  };
}

function buildSearchInterval(reservation, nowMs) {
  if (reservation.pool !== 'advance') return null;
  const startMs = Math.max(nowMs + 1000, Date.parse(reservation.plannedArrival));
  const endMs = Date.parse(reservation.plannedCheckout);
  if (!Number.isFinite(endMs) || endMs <= startMs) return null;
  return {
    plannedArrival: new Date(startMs).toISOString(),
    plannedCheckout: new Date(endMs).toISOString()
  };
}

function isSlotBlockedForCheckIn(slot, reservation) {
  if (!slot) return true;
  if (slot.occupancyId || slot.parkedVehicleId || slot.transferHoldId) return true;
  if (slot.status === 'Occupied' || slot.status === 'occupied' || slot.status === 'Suspended' || slot.status === 'blocked') {
    return true;
  }
  if (reservation.pool === 'immediate') {
    return !(slot.status === 'Held' && slot.reservationId === reservation.id);
  }
  return slot.reservationId !== null;
}

class ParkingService {
  constructor({
    client,
    parkingRepo,
    chargingRepo,
    inventoryInterface,
    incidentReporter = null,
    deviceAdapter,
    clock = () => new Date()
  }) {
    if (!client || !parkingRepo || !chargingRepo || !inventoryInterface || !deviceAdapter) {
      throw new Error('ParkingService requires client, parkingRepo, chargingRepo, inventoryInterface, and deviceAdapter.');
    }
    this.client = client;
    this.parkingRepo = parkingRepo;
    this.chargingRepo = chargingRepo;
    this.inventoryInterface = inventoryInterface;
    this.incidentReporter = incidentReporter;
    this.deviceAdapter = deviceAdapter;
    this.clock = clock;
  }

  async getParkingAvailability({ actor = null, hubId, privateVehicleId = null, pool, plannedArrival = null, plannedCheckout = null }) {
    if (!hubId || typeof hubId !== 'string') {
      throw badRequest('INVALID_HUB_ID', 'hubId is required.');
    }
    const hub = await this.parkingRepo.getHubById(hubId);
    if (!hub) {
      throw notFound('HUB_NOT_FOUND', `Hub ${hubId} not found.`);
    }

    if (privateVehicleId) {
      const vehicle = await this.parkingRepo.getVehicleById(privateVehicleId);
      if (!vehicle) throw notFound('VEHICLE_NOT_FOUND', `Vehicle ${privateVehicleId} not found.`);
      if (!vehicle.ownerId) {
        throw unprocessable('VEHICLE_NOT_ELIGIBLE', 'UC06 parking availability only applies to private vehicles.');
      }
      if (actor) {
        assertActorCanAccessResource(actor, vehicle.ownerId, 'You do not own the specified private vehicle.');
      }
    }

    const normalized = validatePoolAndInterval({ pool, plannedArrival, plannedCheckout, now: this.clock() });
    const interval = pool === 'advance'
      ? { plannedArrival: normalized.plannedArrival, plannedCheckout: normalized.plannedCheckout }
      : null;

    const slots = await this.inventoryInterface.getAvailableSlots(hubId, pool, interval);
    return {
      hubId,
      pool,
      plannedArrival: normalized.plannedArrival,
      plannedCheckout: normalized.plannedCheckout,
      availableSlots: slots
    };
  }

  async createReservation({
    actor,
    vehicleId,
    hubId,
    pool,
    slotId = null,
    plannedArrival = null,
    plannedCheckout = null
  }) {
    if (!actor || !actor.id) {
      throw forbidden('Authenticated user is required.');
    }
    if (!vehicleId || !hubId) {
      throw badRequest('INVALID_INPUT', 'privateVehicleId and hubId are required.');
    }

    const vehicle = await this.parkingRepo.getVehicleById(vehicleId);
    if (!vehicle) throw notFound('VEHICLE_NOT_FOUND', `Vehicle ${vehicleId} not found.`);
    if (!vehicle.ownerId) {
      throw unprocessable('VEHICLE_NOT_ELIGIBLE', 'Only private vehicles can create UC06 parking reservations.');
    }
    if (vehicle.ownerId !== actor.id) {
      throw forbidden('You do not own the specified private vehicle.');
    }

    const hub = await this.parkingRepo.getHubById(hubId);
    if (!hub) throw notFound('HUB_NOT_FOUND', `Hub ${hubId} not found.`);

    const normalized = validatePoolAndInterval({ pool, plannedArrival, plannedCheckout, now: this.clock() });
    if (slotId) {
      await this._validateRequestedSlot({ slotId, hubId, pool });
    }

    const created = await this.client.transaction(() =>
      this._createReservationInTx({
        hub,
        vehicle,
        pool,
        slotId,
        normalized,
        assistedBy: null,
        replacesReservationId: null
      })
    );
    return formatReservationDto(created);
  }

  async _validateRequestedSlot({ slotId, hubId, pool }) {
    const slot = await this.parkingRepo.getSlotById(slotId);
    if (!slot) throw notFound('SLOT_NOT_FOUND', `Slot ${slotId} not found.`);
    if (slot.hubId !== hubId) {
      throw unprocessable('INVALID_INPUT', `Slot ${slotId} does not belong to hub ${hubId}.`);
    }
    if (slot.pool !== pool) {
      throw unprocessable('POOL_MISMATCH', `Slot ${slotId} belongs to '${slot.pool}', not '${pool}'.`);
    }
    return slot;
  }

  async _createReservationInTx({
    hub,
    vehicle,
    pool,
    slotId,
    normalized,
    assistedBy,
    replacesReservationId
  }) {
    const interval = pool === 'advance'
      ? { plannedArrival: normalized.plannedArrival, plannedCheckout: normalized.plannedCheckout }
      : null;

    let chosenSlotId = slotId;
    if (!chosenSlotId) {
      const candidates = await this.inventoryInterface.getAvailableSlots(hub.id, pool, interval);
      if (candidates.length === 0) {
        throw conflict('SLOT_UNAVAILABLE', `No ${pool} parking slots are available at hub ${hub.id}.`);
      }
      chosenSlotId = candidates[0].id;
    }

    const createdAt = this.clock();
    const reservationId = `res_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const ticketCode = `PK-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const expiresAt = computeArrivalDeadline({
      pool,
      hub,
      createdAt,
      plannedArrival: normalized.plannedArrival,
      plannedCheckout: normalized.plannedCheckout
    });

    await this.inventoryInterface.holdSlotForReservation(chosenSlotId, reservationId, {
      hubId: hub.id,
      pool,
      expiresAt,
      plannedArrival: normalized.plannedArrival,
      plannedCheckout: normalized.plannedCheckout
    });

    return this.parkingRepo.insertReservation({
      id: reservationId,
      userId: vehicle.ownerId,
      vehicleId: vehicle.id,
      hubId: hub.id,
      slotId: chosenSlotId,
      pool,
      ticketCode,
      plannedArrival: normalized.plannedArrival,
      plannedCheckout: normalized.plannedCheckout,
      expiresAt,
      status: 'Reserved',
      assistedBy,
      replacesReservationId,
      createdAt: createdAt.toISOString(),
      cancelledAt: null
    });
  }

  async getReservation({ actor, reservationId }) {
    const reservation = await this.parkingRepo.getReservationById(reservationId);
    if (!reservation) throw notFound('RESERVATION_NOT_FOUND', `Reservation ${reservationId} not found.`);
    assertActorCanAccessResource(actor, reservation.userId, 'You cannot access this parking reservation.');
    return formatReservationDto(reservation);
  }

  async cancelReservation({ actor, reservationId }) {
    return this.client.transaction(async () => {
      const reservation = await this.parkingRepo.getReservationById(reservationId);
      if (!reservation) throw notFound('RESERVATION_NOT_FOUND', `Reservation ${reservationId} not found.`);
      assertActorCanAccessResource(actor, reservation.userId, 'You cannot cancel this parking reservation.');

      const now = this.clock();
      assertCancellable(reservation, now);

      await this.inventoryInterface.releaseSlotHold(reservation.slotId, reservation.id);
      await this.parkingRepo.markReservationCancelled(reservation.id, now.toISOString());
      return formatReservationDto(await this.parkingRepo.getReservationById(reservation.id));
    });
  }

  async checkInReservation({ actor, reservationId, hubId, ticketCode }) {
    if (!hubId || !ticketCode) {
      throw badRequest('INVALID_INPUT', 'hubId and ticketCode are required for check-in.');
    }
    const reservation = await this.parkingRepo.getReservationById(reservationId);
    if (!reservation) throw notFound('RESERVATION_NOT_FOUND', `Reservation ${reservationId} not found.`);
    assertActorCanAccessResource(actor, reservation.userId, 'You cannot check in this parking reservation.');

    if (reservation.hubId !== hubId) {
      throw unprocessable('INVALID_INPUT', 'hubId does not match the reservation.');
    }
    if (reservation.ticketCode !== ticketCode) {
      throw unprocessable('INVALID_INPUT', 'ticketCode does not match the reservation.');
    }

    const now = this.clock();
    assertValidCheckInWindow(reservation, now);

    const activeVehicleOcc = await this.parkingRepo.getActiveOccupancyByVehicle(reservation.vehicleId);
    if (activeVehicleOcc) {
      throw conflict('CONFLICT_STATE', `Vehicle ${reservation.vehicleId} already has active occupancy ${activeVehicleOcc.id}.`);
    }

    const slot = await this.parkingRepo.getSlotById(reservation.slotId);
    if (isSlotBlockedForCheckIn(slot, reservation)) {
      await this._handleLim01Conflict({ actor, reservation, slot });
    }

    const commandId = `cmd_checkin_${reservation.id}`;
    const result = await runDeviceCommand({
      client: this.client,
      chargingRepo: this.chargingRepo,
      commandId,
      targetKind: 'parking_slot',
      targetId: reservation.slotId,
      action: 'verify_arrival',
      referenceId: reservation.id,
      clock: this.clock,
      sendToDevice: ({ commandId: cmdId, attempt }) =>
        this.deviceAdapter.verifyArrival({
          hubId: reservation.hubId,
          slotId: reservation.slotId,
          reservationId: reservation.id,
          vehicleId: reservation.vehicleId,
          commandId: cmdId,
          attempt
        }),
      onConfirmed: async ({ nowIso }) => {
        const freshRes = await this.parkingRepo.getReservationById(reservation.id);
        if (!freshRes) throw notFound('RESERVATION_NOT_FOUND', `Reservation ${reservation.id} not found.`);
        assertValidCheckInWindow(freshRes, new Date(nowIso));

        const freshSlot = await this.parkingRepo.getSlotById(freshRes.slotId);
        if (isSlotBlockedForCheckIn(freshSlot, freshRes)) {
          return { lim01Slot: freshSlot, reservation: freshRes };
        }

        const occupancyId = `occ_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
        const assistedBy = isOperatorActor(actor) && actor.id !== freshRes.userId ? actor.id : null;

        await this.inventoryInterface.occupySlot(freshRes.slotId, occupancyId, freshRes.id, freshRes.hubId);
        await this.client.run(
          'UPDATE parking_slots SET parked_vehicle_id = ? WHERE id = ? AND occupancy_id = ?;',
          [freshRes.vehicleId, freshRes.slotId, occupancyId]
        );
        await this.parkingRepo.markReservationFulfilled(freshRes.id, assistedBy);
        const occupancy = await this.parkingRepo.insertOccupancy({
          id: occupancyId,
          reservationId: freshRes.id,
          userId: freshRes.userId,
          vehicleId: freshRes.vehicleId,
          hubId: freshRes.hubId,
          slotId: freshRes.slotId,
          actualCheckInAt: nowIso,
          scheduledCheckoutAt: freshRes.plannedCheckout ?? null,
          actualCheckoutAt: null,
          finalFee: null,
          assistedBy,
          createdAt: nowIso
        });
        return {
          reservationId: freshRes.id,
          status: 'Fulfilled',
          occupancyId: occupancy.id,
          hubId: occupancy.hubId,
          slotId: occupancy.slotId,
          actualCheckInAt: occupancy.actualCheckInAt,
          scheduledCheckoutAt: occupancy.scheduledCheckoutAt,
          assistedBy: occupancy.assistedBy
        };
      }
    });

    if (result && result.lim01Slot) {
      await this._handleLim01Conflict({ actor, reservation: result.reservation, slot: result.lim01Slot });
    }
    return result;
  }

  async _handleLim01Conflict({ actor, reservation, slot }) {
    const now = this.clock();
    const interval = buildSearchInterval(reservation, now.getTime());
    const searchable = reservation.pool === 'immediate' || interval !== null;

    const sameHubAlternatives = searchable
      ? (await this.inventoryInterface.getAvailableSlots(reservation.hubId, reservation.pool, interval))
          .filter(s => s.id !== slot.id)
      : [];

    const nearbyHubAlternatives = [];
    if (sameHubAlternatives.length === 0 && searchable) {
      const hubIds = await this.parkingRepo.listHubIds();
      for (const otherHubId of hubIds) {
        if (otherHubId === reservation.hubId) continue;
        const slots = await this.inventoryInterface.getAvailableSlots(otherHubId, reservation.pool, interval);
        if (slots.length > 0) {
          nearbyHubAlternatives.push({ hubId: otherHubId, slots });
        }
      }
    }

    const hasAlternatives = sameHubAlternatives.length > 0 || nearbyHubAlternatives.length > 0;
    const blockingOccupancyId = slot ? (slot.occupancyId ?? null) : null;

    let conflictRecord = await this.parkingRepo.getOpenConflictByReservation(reservation.id, blockingOccupancyId);
    if (!conflictRecord) {
      let incidentId = null;
      if (!hasAlternatives && this.incidentReporter && typeof this.incidentReporter.reportEquipmentIncident === 'function') {
        const reported = await this.incidentReporter.reportEquipmentIncident({
          resourceKind: 'slot',
          resourceId: reservation.slotId,
          description: `LIM-01 overstay conflict blocking reservation ${reservation.id} on slot ${reservation.slotId}; no compatible alternatives available.`,
          severity: 'Critical',
          reporterId: isOperatorActor(actor) ? actor.id : 'system-parking-charging',
          reporterRole: isOperatorActor(actor) ? 'Operator' : 'System'
        });
        incidentId = reported && reported.id ? reported.id : null;
      }

      conflictRecord = await this.parkingRepo.insertConflict({
        id: `conf_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        blockedReservationId: reservation.id,
        blockingOccupancyId,
        hubId: reservation.hubId,
        slotId: reservation.slotId,
        replacementReservationId: null,
        incidentId,
        status: 'Open',
        createdAt: now.toISOString(),
        resolvedAt: null
      });
    }

    throw conflict(
      'SLOT_OCCUPIED',
      `Slot ${reservation.slotId} is still physically occupied (LIM-01 overstay conflict).`,
      {
        conflictId: conflictRecord.id,
        blockedReservationId: reservation.id,
        blockingOccupancyId,
        hubId: reservation.hubId,
        slotId: reservation.slotId,
        sameHubAlternatives,
        nearbyHubAlternatives,
        escalated: !hasAlternatives,
        incidentId: conflictRecord.incidentId ?? null
      }
    );
  }

  async createReplacementReservation({
    actor,
    conflictId,
    hubId = null,
    slotId = null,
    plannedArrival = null,
    plannedCheckout = null
  }) {
    if (!isOperatorActor(actor)) {
      throw forbidden('Only operators can issue replacement reservations for LIM-01 conflicts.');
    }

    const limConflict = await this.parkingRepo.getConflictById(conflictId);
    if (!limConflict) throw notFound('CONFLICT_NOT_FOUND', `Parking conflict ${conflictId} not found.`);
    if (limConflict.status !== 'Open') {
      throw conflict('CONFLICT_STATE', `Parking conflict ${conflictId} is already resolved.`);
    }

    const blocked = await this.parkingRepo.getReservationById(limConflict.blockedReservationId);
    if (!blocked) throw notFound('RESERVATION_NOT_FOUND', `Blocked reservation ${limConflict.blockedReservationId} not found.`);

    const targetHubId = hubId || blocked.hubId;
    const hub = await this.parkingRepo.getHubById(targetHubId);
    if (!hub) throw notFound('HUB_NOT_FOUND', `Hub ${targetHubId} not found.`);

    const vehicle = await this.parkingRepo.getVehicleById(blocked.vehicleId);
    if (!vehicle) throw notFound('VEHICLE_NOT_FOUND', `Vehicle ${blocked.vehicleId} not found.`);

    const now = this.clock();
    const effectiveArrival = blocked.pool === 'advance'
      ? (plannedArrival || new Date(Math.max(now.getTime() + 1000, Date.parse(blocked.plannedArrival))).toISOString())
      : null;
    const effectiveCheckout = plannedCheckout ?? blocked.plannedCheckout ?? null;

    const normalized = validatePoolAndInterval({
      pool: blocked.pool,
      plannedArrival: effectiveArrival,
      plannedCheckout: effectiveCheckout,
      now
    });

    if (slotId) {
      await this._validateRequestedSlot({ slotId, hubId: targetHubId, pool: blocked.pool });
    }

    return this.client.transaction(async () => {
      const replacement = await this._createReservationInTx({
        hub,
        vehicle,
        pool: blocked.pool,
        slotId,
        normalized,
        assistedBy: actor.id,
        replacesReservationId: blocked.id
      });
      await this.parkingRepo.resolveConflictWithReplacement(conflictId, replacement.id, this.clock().toISOString());
      return {
        conflict: await this.parkingRepo.getConflictById(conflictId),
        originalReservation: formatReservationDto(await this.parkingRepo.getReservationById(blocked.id)),
        replacementReservation: formatReservationDto(replacement)
      };
    });
  }

  async checkOutOccupancy({ actor, occupancyId, cancelQueuedCharging = false }) {
    const occupancy = await this.parkingRepo.getOccupancyById(occupancyId);
    if (!occupancy) throw notFound('OCCUPANCY_NOT_FOUND', `Occupancy ${occupancyId} not found.`);
    assertActorCanAccessResource(actor, occupancy.userId, 'You cannot check out this parking occupancy.');

    if (occupancy.actualCheckoutAt) {
      throw conflict('CONFLICT_STATE', `Occupancy ${occupancyId} has already checked out.`);
    }

    await this._assertSafeToCheckOut(occupancy, Boolean(cancelQueuedCharging));

    const commandId = `cmd_checkout_${occupancy.id}`;
    return runDeviceCommand({
      client: this.client,
      chargingRepo: this.chargingRepo,
      commandId,
      targetKind: 'parking_slot',
      targetId: occupancy.slotId,
      action: 'verify_departure',
      referenceId: occupancy.id,
      clock: this.clock,
      sendToDevice: ({ commandId: cmdId, attempt }) =>
        this.deviceAdapter.verifyDeparture({
          hubId: occupancy.hubId,
          slotId: occupancy.slotId,
          occupancyId: occupancy.id,
          vehicleId: occupancy.vehicleId,
          commandId: cmdId,
          attempt
        }),
      onConfirmed: async ({ nowIso }) => {
        const freshOcc = await this.parkingRepo.getOccupancyById(occupancy.id);
        if (!freshOcc) throw notFound('OCCUPANCY_NOT_FOUND', `Occupancy ${occupancy.id} not found.`);
        if (freshOcc.actualCheckoutAt) {
          throw conflict('CONFLICT_STATE', `Occupancy ${occupancy.id} has already checked out.`);
        }

        const { queuedRequests } = await this._assertSafeToCheckOut(freshOcc, Boolean(cancelQueuedCharging));
        for (const reqRow of queuedRequests) {
          await this.chargingRepo.updateRequestStatus(reqRow.id, 'Cancelled', nowIso, 'Queued');
        }

        const hub = await this.parkingRepo.getHubById(freshOcc.hubId);
        const finalFee = calculateOverstayFee({
          scheduledCheckoutAt: freshOcc.scheduledCheckoutAt,
          actualCheckoutAt: nowIso,
          overstayGraceMinutes: hub.overstayGraceMinutes,
          overstayRatePerHour: hub.overstayRatePerHour
        });

        const assistedBy = isOperatorActor(actor) && actor.id !== freshOcc.userId ? actor.id : null;
        await this.parkingRepo.completeOccupancyCheckout(freshOcc.id, {
          actualCheckoutAt: nowIso,
          finalFee,
          assistedBy
        });
        await this.inventoryInterface.vacateSlot(freshOcc.slotId, freshOcc.id);

        return this.parkingRepo.getOccupancyById(freshOcc.id);
      }
    });
  }

  async _assertSafeToCheckOut(occupancy, cancelQueuedCharging) {
    const blockingAllocs = await this.chargingRepo.listBlockingAllocationsByOccupancy(occupancy.id, occupancy.vehicleId);
    if (blockingAllocs.length > 0) {
      throw conflict(
        'CHARGING_ACTIVE',
        'Stop active charging and unplug the connector before parking check-out.',
        { blockingAllocations: blockingAllocs }
      );
    }
    const queuedRequests = await this.chargingRepo.listQueuedRequestsByOccupancy(occupancy.id);
    if (queuedRequests.length > 0 && !cancelQueuedCharging) {
      throw conflict(
        'CHARGING_REQUEST_QUEUED',
        'A queued charging request exists for this visit; confirm cancelQueuedCharging=true to cancel it and proceed.',
        { queuedRequestIds: queuedRequests.map(r => r.id) }
      );
    }
    return { queuedRequests };
  }

  async getOccupancy({ actor, occupancyId }) {
    const occupancy = await this.parkingRepo.getOccupancyById(occupancyId);
    if (!occupancy) throw notFound('OCCUPANCY_NOT_FOUND', `Occupancy ${occupancyId} not found.`);
    assertActorCanAccessResource(actor, occupancy.userId, 'You cannot access this parking occupancy.');
    return occupancy;
  }

  async runExpiryScan(now = this.clock()) {
    const nowIso = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
    const overdue = await this.parkingRepo.listOverdueReservedReservations(nowIso);
    const expiredIds = [];

    for (const row of overdue) {
      try {
        await this.client.transaction(async () => {
          const updated = await this.parkingRepo.markReservationExpired(row.id);
          if (updated.changes !== 1) return;
          await this.inventoryInterface.expireSlotHold(row.slotId, row.id);
          expiredIds.push(row.id);
        });
      } catch {
        // Skip rows modified concurrently or whose commitment expiresAt has not yet elapsed.
      }
    }

    return { scannedAt: nowIso, expiredReservationIds: expiredIds };
  }
}

module.exports = {
  ParkingService,
  formatReservationDto
};
