const express = require('express');
const { RentalError } = require('../domain/rental');

function statusFor(error) {
  const code = error.code || '';
  if (code === 'FORBIDDEN_OPERATION') return 403;
  if (code.endsWith('_NOT_FOUND')) return 404;
  if (code === 'INVALID_INPUT' || code === 'INVALID_BATTERY') return 400;
  if (['DEVICE_UNCONFIRMED', 'SNAPSHOT_UNAVAILABLE'].includes(code)) return 503;
  if (['RETURN_NOT_CONFIRMED', 'VEHICLE_CODE_MISMATCH', 'RESERVATION_EXPIRED', 'INVALID_SCENARIO'].includes(code)) return 422;
  if (['IDEMPOTENCY_KEY_REUSED', 'RESERVATION_CONFLICT', 'VEHICLE_NOT_AVAILABLE', 'VEHICLE_CANNOT_PICKUP',
    'VEHICLE_NOT_IN_USE', 'SLOT_UNAVAILABLE', 'COMMAND_IN_PROGRESS', 'TRIP_NOT_ACTIVE', 'RETURN_PENDING'].includes(code)) return 409;
  return 500;
}

function requireUser(req, res, next) {
  const user = req.user;
  let status = 0;
  if (typeof user?.id !== 'string' || !user.id.trim()) status = 401;
  else if (!(Array.isArray(user.roles) ? user.roles : [user.role]).some(role => typeof role === 'string' && role.toLowerCase() === 'user')) status = 403;
  if (status) return res.status(status).json({ error: { code: status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN_OPERATION', message: 'User access is required.', details: {} } });
  next();
}

function createRentalRouter(service) {
  const router = express.Router();
  const handle = (action, write = false) => async (req, res) => {
    try {
      if (write && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) throw new RentalError('INVALID_INPUT', 'A JSON object is required.');
      const result = await action(req, req.get('Idempotency-Key'));
      return res.status(write ? result.status : 200).json({ data: write ? result.data : result });
    } catch (error) {
      const status = statusFor(error);
      return res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : error.code,
        message: status === 500 ? 'Unable to process the request.' : error.message, details: {} } });
    }
  };
  router.post('/vehicle-reservations', requireUser, handle((req, key) => service.reserve(req.user.id, req.body, key), true));
  router.get('/vehicle-reservations', requireUser, handle(req => service.listReservations(req.user.id)));
  router.get('/vehicle-reservations/:id', requireUser, handle(req => service.getReservation(req.user.id, req.params.id)));
  router.post('/vehicle-reservations/:id/cancel', requireUser, handle((req, key) => service.cancel(req.user.id, req.params.id, req.body, key), true));
  router.post('/vehicle-reservations/:id/pickup', requireUser, handle((req, key) => service.pickup(req.user.id, req.params.id, req.body, key), true));
  router.get('/trips/:id', requireUser, handle(req => service.getTrip(req.user.id, req.params.id)));
  router.get('/trips', requireUser, handle(req => service.listTrips(req.user.id)));
  router.get('/hubs/:hubId/return-slots', requireUser, handle(req => service.returnSlots(req.user.id, req.query.tripId, req.params.hubId)));
  router.post('/trips/:id/return', requireUser, handle((req, key) => service.returnTrip(req.user.id, req.params.id, req.body, key), true));
  return router;
}

module.exports = { createRentalRouter, statusFor };
