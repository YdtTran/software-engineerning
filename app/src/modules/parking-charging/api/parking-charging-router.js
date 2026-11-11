/**
 * Express Router for Parking & Charging Module (UC06, UC07, UC07A, UC12).
 */

const express = require('express');

function createParkingChargingRouter(controller) {
  const router = express.Router();

  // UC06 Parking Availability, Reservations, Check-In & Check-Out
  router.get('/hubs/:hubId/parking-availability', (req, res) => controller.getParkingAvailability(req, res));
  router.post('/parking-reservations', (req, res) => controller.createReservation(req, res));
  router.post('/parking-reservations/:id/cancel', (req, res) => controller.cancelReservation(req, res));
  router.get('/parking-reservations/:id', (req, res) => controller.getReservation(req, res));
  router.post('/parking-reservations/:id/check-in', (req, res) => controller.checkInReservation(req, res));
  router.post('/parking-occupancies/:id/check-out', (req, res) => controller.checkOutOccupancy(req, res));
  router.get('/parking-occupancies/:id', (req, res) => controller.getOccupancy(req, res));

  // UC07 / UC07A Charging Requests & Sessions
  router.post('/charging-requests', (req, res) => controller.submitChargingRequest(req, res));
  router.get('/charging-requests/:id', (req, res) => controller.getChargingRequest(req, res));
  router.post('/charging-requests/:id/cancel', (req, res) => controller.cancelChargingRequest(req, res));
  router.post('/charging-sessions/:id/stop', (req, res) => controller.stopChargingSession(req, res));
  router.get('/charging-sessions/:id', (req, res) => controller.getChargingSession(req, res));

  // UC12 Charging Schedule, Port Allocation & Operator Overrides
  router.get('/hubs/:hubId/charging-schedule', (req, res) => controller.getHubChargingSchedule(req, res));
  router.post('/charging-requests/:id/allocate', (req, res) => controller.allocateChargingRequest(req, res));
  router.post('/hubs/:hubId/charging-schedule/override', (req, res) => controller.overrideChargingSchedule(req, res));

  return router;
}

module.exports = {
  createParkingChargingRouter
};
