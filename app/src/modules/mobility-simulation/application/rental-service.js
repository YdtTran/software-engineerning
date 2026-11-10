const { randomUUID } = require('node:crypto');
const { RentalError, requiredString, commandContext, owned, verifiedEvidence } = require('../domain/rental');

class RentalService {
  constructor({ repository, inventory, device = null, deviceTimeoutMs = 2000 }) {
    this.repository = repository;
    this.client = repository.client;
    this.inventory = inventory;
    this.device = device;
    this.deviceTimeoutMs = Math.max(1, Math.min(5000, deviceTimeoutMs));
    this.inFlight = new Map();
  }

  async expireReservations() {
    return this.client.transaction(async () => {
      let expired = 0;
      for (const record of await this.repository.overdue()) {
        try { await this.inventory.expireVehicleHold(record.vehicleId, record.id); }
        catch (error) { if (error.code === 'VEHICLE_NOT_AVAILABLE') continue; throw error; }
        await this.repository.setReservation(record.id, 'Expired');
        await this.repository.event('ReservationExpired', record.id, { userId: record.userId });
        expired++;
      }
      return expired;
    });
  }

  async reserve(actorId, input, key) {
    requiredString(input.vehicleId, 'vehicleId'); requiredString(input.hubId, 'hubId');
    const context = commandContext(actorId, 'reserve', key, input);
    await this.expireReservations();
    return this.repository.once(context, async () => {
      if (!await this.inventory.getHubById(input.hubId)) throw new RentalError('HUB_NOT_FOUND', 'Hub not found.');
      const id = randomUUID();
      const { expiresAt } = await this.inventory.reserveVehicle(input.vehicleId, id, input.hubId);
      const record = await this.repository.createReservation({ id, userId: actorId, vehicleId: input.vehicleId,
        hubId: input.hubId, ticketCode: randomUUID(), expiresAt });
      return this.repository.saveOutcome(context, 201, record);
    });
  }

  async getReservation(actorId, id) {
    await this.expireReservations();
    const record = owned(await this.repository.getReservation(id), actorId, 'RESERVATION_NOT_FOUND');
    const pending = await this.repository.pendingCommand('pickup', id);
    return { ...record, pendingCommandId: pending?.id ?? null };
  }
  async getTrip(actorId, id) {
    const record = owned(await this.repository.getTrip(id), actorId, 'TRIP_NOT_FOUND');
    const pending = await this.repository.pendingCommand('return', id);
    return { ...record, pendingCommandId: pending?.id ?? null, pendingReturn: pending?.request ?? null };
  }
  async cancel(actorId, id, input, key) {
    const context = commandContext(actorId, `cancel:${id}`, key, input);
    await this.expireReservations();
    return this.repository.once(context, async () => {
      const record = owned(await this.repository.getReservation(id), actorId, 'RESERVATION_NOT_FOUND');
      if (record.status !== 'Reserved') throw new RentalError('RESERVATION_CONFLICT', 'Only an unclaimed reservation can be cancelled.');
      await this.inventory.releaseVehicleHold(record.vehicleId, id);
      await this.repository.setReservation(id, 'Cancelled');
      return this.repository.saveOutcome(context, 200, await this.repository.getReservation(id));
    });
  }

  async pickup(actorId, id, input, key) {
    requiredString(input.vehicleCode, 'vehicleCode');
    const context = commandContext(actorId, `pickup:${id}`, key, input);
    return this.singleFlight(context, async () => {
      await this.expireReservations();
      const prepared = await this.client.transaction(async () => {
        const cached = await this.repository.findOutcome(context);
        if (cached) return cached;
        const existing = await this.repository.getCommand(context.scope);
        if (existing) { this.matchPayload(existing, context); return existing; }
        const record = owned(await this.repository.getReservation(id), actorId, 'RESERVATION_NOT_FOUND');
        if (record.status === 'Expired') throw new RentalError('RESERVATION_EXPIRED', 'Reservation has expired.');
        if (record.status !== 'Reserved') throw new RentalError('RESERVATION_CONFLICT', 'Reservation cannot be picked up.');
        if (input.vehicleCode.trim().toUpperCase() !== record.vehicleId.toUpperCase()) throw new RentalError('VEHICLE_CODE_MISMATCH', 'Vehicle code does not match the reservation.');
        await this.inventory.claimVehiclePickup(record.vehicleId, record.id, record.hubId);
        await this.repository.setReservation(id, 'PickupClaimed');
        return this.repository.createCommand(context, 'pickup', id, { vehicleId: record.vehicleId, hubId: record.hubId }, randomUUID());
      });
      if (prepared.data) return prepared;
      return this.executeDevice(context, prepared, async command => {
        const record = owned(await this.repository.getReservation(id), actorId, 'RESERVATION_NOT_FOUND');
        await this.inventory.pickupVehicle(record.vehicleId, command.trip_id, record.id, record.hubId);
        const trip = await this.repository.createTrip(command.trip_id, record);
        await this.repository.setReservation(id, 'Fulfilled', trip.id);
        return trip;
      });
    });
  }

  async returnTrip(actorId, id, input, key) {
    requiredString(input.hubId, 'hubId'); requiredString(input.slotId, 'slotId');
    if (input.confirmed !== true) throw new RentalError('RETURN_NOT_CONFIRMED', 'Confirm that the vehicle has been parked safely.');
    const context = commandContext(actorId, `return:${id}`, key, input);
    return this.singleFlight(context, async () => {
      const prepared = await this.client.transaction(async () => {
        const cached = await this.repository.findOutcome(context);
        if (cached) return cached;
        const existing = await this.repository.getCommand(context.scope);
        if (existing) { this.matchPayload(existing, context); return existing; }
        const trip = owned(await this.repository.getTrip(id), actorId, 'TRIP_NOT_FOUND');
        if (trip.status === 'Completed' && trip.hubId === input.hubId && trip.slotId === input.slotId) {
          return this.repository.saveOutcome(context, 200, trip);
        }
        if (trip.status !== 'Active') throw new RentalError('TRIP_NOT_ACTIVE', 'Trip is not active.');
        if (!await this.inventory.getHubById(input.hubId)) throw new RentalError('HUB_NOT_FOUND', 'Hub not found.');
        if (await this.repository.pendingCommand('return', id)) throw new RentalError('RETURN_PENDING', 'Reconcile the pending return before choosing another slot.');
        const command = await this.repository.createCommand(context, 'return', id,
          { vehicleId: trip.vehicleId, hubId: input.hubId, slotId: input.slotId }, id);
        await this.inventory.claimVehicleReturn(trip.vehicleId, id, input.slotId, input.hubId, command.id);
        return command;
      });
      if (prepared.data) return prepared;
      return this.executeDevice(context, prepared, async command => {
        const trip = owned(await this.repository.getTrip(id), actorId, 'TRIP_NOT_FOUND');
        await this.inventory.confirmVehicleReturn(trip.vehicleId, id, command.request.slotId,
          command.request.hubId, command.id, command.evidence.batteryPercent);
        return this.repository.closeTrip(id, command.request, command.evidence);
      });
    });
  }

  matchPayload(command, context) {
    if (command.payload_hash !== context.hash) throw new RentalError('IDEMPOTENCY_KEY_REUSED', 'Key was used for a different payload.');
  }
  singleFlight(context, action) {
    const current = this.inFlight.get(context.scope);
    if (current) {
      if (current.hash !== context.hash) return Promise.reject(new RentalError('IDEMPOTENCY_KEY_REUSED', 'Key was used for a different payload.'));
      return current.promise;
    }
    const promise = Promise.resolve().then(action).finally(() => this.inFlight.delete(context.scope));
    this.inFlight.set(context.scope, { hash: context.hash, promise });
    return promise;
  }
  async deviceCall(method, command) {
    if (typeof this.device?.[method] !== 'function') return null;
    let timer;
    try {
      return await Promise.race([
        this.device[method]({ id: command.id, kind: command.kind, ...command.request }),
        new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('Device timeout')), this.deviceTimeoutMs); })
      ]);
    } catch { return null; }
    finally { clearTimeout(timer); }
  }
  async executeDevice(context, initial, finish) {
    const token = randomUUID();
    const claimed = await this.client.transaction(async () => {
      const cached = await this.repository.findOutcome(context);
      if (cached) return cached;
      const lease = await this.client.run(`UPDATE mobility_commands SET lease_token=?, lease_until=?
        WHERE id=? AND lease_until <= ? AND state <> 'Completed'`,
      [token, Date.now() + 30000, initial.id, Date.now()]);
      if (lease.changes !== 1) throw new RentalError('COMMAND_IN_PROGRESS', 'The original device command is still running.');
      return this.repository.getCommand(context.scope);
    });
    if (claimed.data) return claimed;
    let command = claimed;
    try {
      let evidence = command.evidence;
      if (!verifiedEvidence(command, evidence)) evidence = await this.deviceCall('inspect', command);
      while (!verifiedEvidence(command, evidence) && command.attempts < 3 && typeof this.device?.execute === 'function') {
        const attempt = await this.client.run(`UPDATE mobility_commands SET attempts=attempts+1
          WHERE id=? AND lease_token=? AND attempts < 3`, [command.id, token]);
        if (attempt.changes !== 1) break;
        evidence = await this.deviceCall('execute', command);
        command = await this.repository.getCommand(context.scope);
      }
      if (!verifiedEvidence(command, evidence)) {
        await this.client.transaction(async () => {
          await this.client.run("UPDATE mobility_commands SET state='Uncertain' WHERE id=? AND lease_token=?", [command.id, token]);
          if (command.kind === 'pickup') await this.repository.setReservation(command.aggregate_id, 'PickupUncertain');
          await this.repository.event('DeviceUnconfirmed', command.aggregate_id, { commandId: command.id });
        });
        throw new RentalError('DEVICE_UNCONFIRMED', 'Device confirmation is unavailable; the original command needs reconciliation.');
      }
      await this.client.run("UPDATE mobility_commands SET state='Confirmed', evidence_json=? WHERE id=? AND lease_token=?",
        [JSON.stringify(evidence), command.id, token]);
      return await this.client.transaction(async () => {
        const cached = await this.repository.findOutcome(context);
        if (cached) return cached;
        command = await this.repository.getCommand(context.scope);
        if (command.lease_token !== token) throw new RentalError('COMMAND_IN_PROGRESS', 'Command ownership changed; refresh its state.');
        const data = await finish(command);
        await this.client.run("UPDATE mobility_commands SET state='Completed' WHERE id=? AND lease_token=?", [command.id, token]);
        return this.repository.saveOutcome(context, 200, data);
      });
    } finally {
      await this.client.run('UPDATE mobility_commands SET lease_token=NULL, lease_until=0 WHERE id=? AND lease_token=?', [initial.id, token]);
    }
  }
}

module.exports = { RentalService };
