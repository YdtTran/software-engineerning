const express = require('express');
const { DiscoveryError } = require('../domain/discovery');

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message, details: {} } });
}

function requireDiscoveryAccess(req, res, next) {
  if (typeof req.user?.id !== 'string' || !req.user.id.trim()) {
    return sendError(res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
  }
  const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
  if (!roles.some(role => typeof role === 'string' && ['user', 'operator'].includes(role.toLowerCase()))) {
    return sendError(res, 403, 'FORBIDDEN_OPERATION', 'User or operator access is required.');
  }
  next();
}

function createDiscoveryRouter(service) {
  const router = express.Router();
  const handle = operation => async (req, res, next) => {
    try {
      return res.status(200).json({ data: await operation(req) });
    } catch (error) {
      if (error instanceof DiscoveryError) {
        return sendError(res, error.code === 'HUB_NOT_FOUND' ? 404 : 400, error.code, error.message);
      }
      next(error);
    }
  };
  // Apply authorization only to our routes, so mounting the module does not
  // change authentication or 404 behavior for other modules.
  router.get('/hubs', requireDiscoveryAccess, handle(req => service.searchHubs(req.query.q)));
  router.get('/hubs/:hubId/vehicles', requireDiscoveryAccess,
    handle(req => service.listAvailableVehicles(req.params.hubId, req.query.type)));
  return router;
}

module.exports = { createDiscoveryRouter };
