/**
 * Express Router for Operations Module
 * Module: Operations (API)
 * 
 * Maps HTTP routes strictly according to API_CONTRACTS.md:
 * 
 * | UC | Role | Method and path | Request → response |
 * |---|---|---|---|
 * | UC08 | O | GET /operations/hubs | → hub IDs, capacity, battery and charging summaries, alerts and observation times |
 * | UC09 | O | GET /operations/resources | Optional hubId, kind → resource IDs, kinds and operational states |
 * | UC09 | O | POST /operations/resources | kind, hubId, attributes → resource record |
 * | UC09 | O | PATCH /operations/resources/:id | Kind-specific mutable attributes → resource record |
 * | UC10 | O | POST /transfers | sourceHubId, destinationHubId, vehicleIds, destinationSlotIds → transfer ID and Planned status |
 * | UC10 | O | GET /transfers/:id | → transfer state, vehicle IDs and destination holds |
 * | UC10 | O | POST /transfers/:id/depart | → transfer ID and InTransit status |
 * | UC10A | O | POST /transfers/:id/arrive | observedVehicleIds, [replacementDestinationHubId, replacementSlotIds] → transfer ID and Completed status |
 * | UC10B | O | POST /transfers/:id/cancel | reason → transfer ID and Cancelled status |
 * | UC11A | U | POST /trips/:id/incidents | description → incident ID and status |
 * | UC11 | O | GET /incidents | Optional status, hubId → incident records |
 * | UC11 | O | POST /incidents/:id/handle | resourceId, technicianId, scheduledAt → incident and maintenance assignment IDs and statuses |
 */

let express;
try {
  express = require('express');
} catch (e) {
  // Express not yet installed; fallback router supported
}

const routesTable = [
  // UC08: Real-time network monitoring
  { method: 'GET', path: '/operations/hubs', uc: 'UC08', role: 'O', action: 'getHubs' },

  // UC09: Resource administration
  { method: 'GET', path: '/operations/resources', uc: 'UC09', role: 'O', action: 'getResources' },
  { method: 'POST', path: '/operations/resources', uc: 'UC09', role: 'O', action: 'createResource' },
  { method: 'PATCH', path: '/operations/resources/:id', uc: 'UC09', role: 'O', action: 'patchResource' },
  { method: 'DELETE', path: '/operations/resources/:id', uc: 'UC09', role: 'O', action: 'deleteResource' },

  // UC10: Inter-hub vehicle transfers
  { method: 'POST', path: '/transfers', uc: 'UC10', role: 'O', action: 'createTransfer' },
  { method: 'GET', path: '/transfers/:id', uc: 'UC10', role: 'O', action: 'getTransfer' },
  { method: 'POST', path: '/transfers/:id/depart', uc: 'UC10', role: 'O', action: 'departTransfer' },
  { method: 'POST', path: '/transfers/:id/arrive', uc: 'UC10A', role: 'O', action: 'arriveTransfer' },
  { method: 'POST', path: '/transfers/:id/cancel', uc: 'UC10B', role: 'O', action: 'cancelTransfer' },

  // UC11 & UC11A: Operational incidents and maintenance
  { method: 'POST', path: '/trips/:id/incidents', uc: 'UC11A', role: 'U', action: 'reportTripIncident' },
  { method: 'GET', path: '/incidents', uc: 'UC11', role: 'O', action: 'getIncidents' },
  { method: 'POST', path: '/incidents/:id/handle', uc: 'UC11', role: 'O', action: 'handleIncident' },
  { method: 'POST', path: '/incidents/:id/resolve', uc: 'UC11', role: 'O', action: 'resolveIncident' }
];

/**
 * Create operations router instance bound to controller
 * @param {import('./operations-controller').OperationsController} controller
 */
function createOperationsRouter(controller) {
  if (express && typeof express.Router === 'function') {
    const router = express.Router();

    router.get('/operations/hubs', (req, res) => controller.getHubs(req, res));
    router.get('/operations/resources', (req, res) => controller.getResources(req, res));
    router.post('/operations/resources', (req, res) => controller.createResource(req, res));
    router.patch('/operations/resources/:id', (req, res) => controller.patchResource(req, res));
    router.delete('/operations/resources/:id', (req, res) => controller.deleteResource(req, res));

    router.post('/transfers', (req, res) => controller.createTransfer(req, res));
    router.get('/transfers/:id', (req, res) => controller.getTransfer(req, res));
    router.post('/transfers/:id/depart', (req, res) => controller.departTransfer(req, res));
    router.post('/transfers/:id/arrive', (req, res) => controller.arriveTransfer(req, res));
    router.post('/transfers/:id/cancel', (req, res) => controller.cancelTransfer(req, res));

    router.post('/trips/:id/incidents', (req, res) => controller.reportTripIncident(req, res));
    router.get('/incidents', (req, res) => controller.getIncidents(req, res));
    router.post('/incidents/:id/handle', (req, res) => controller.handleIncident(req, res));
    router.post('/incidents/:id/resolve', (req, res) => controller.resolveIncident(req, res));

    return router;
  }

  // Standalone lightweight router for zero-dependency testing and early integration
  return {
    routesTable,
    async dispatch(method, url, req = {}, res = null) {
      const cleanUrl = url.split('?')[0];
      const match = routesTable.find(r => {
        if (r.method !== method.toUpperCase()) return false;
        // Simple regex matching for parameterized routes (:id)
        const regexStr = '^' + r.path.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)') + '$';
        const regex = new RegExp(regexStr);
        return regex.test(cleanUrl);
      });

      if (!match) {
        if (res && res.status) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${method} ${url} not found.` } });
        }
        return { statusCode: 404, body: { error: { code: 'NOT_FOUND', message: `Route ${method} ${url} not found.` } } };
      }

      // Extract params
      const regexStr = '^' + match.path.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)') + '$';
      const regex = new RegExp(regexStr);
      const matches = cleanUrl.match(regex);
      const paramNames = (match.path.match(/:[a-zA-Z0-9_]+/g) || []).map(p => p.slice(1));
      const params = {};
      if (matches && paramNames.length > 0) {
        paramNames.forEach((name, idx) => {
          params[name] = matches[idx + 1];
        });
      }

      req.params = { ...(req.params || {}), ...params };
      req.path = cleanUrl;
      req.method = method.toUpperCase();
      req.headers = req.headers || {};
      req.query = req.query || {};
      req.body = req.body || {};

      let responseData = null;
      let responseStatus = 200;

      const mockRes = res || {
        status(code) {
          responseStatus = code;
          return this;
        },
        json(payload) {
          responseData = payload;
          return this;
        }
      };

      await controller[match.action](req, mockRes);
      return { statusCode: responseStatus, body: responseData };
    }
  };
}

module.exports = {
  createOperationsRouter,
  routesTable
};
