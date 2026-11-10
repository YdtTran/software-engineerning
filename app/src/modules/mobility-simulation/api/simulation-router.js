const express = require('express');
const { statusFor } = require('./rental-router');

function requireOperator(req, res, next) {
  const user = req.user;
  const status = typeof user?.id !== 'string' || !user.id.trim() ? 401 :
    (Array.isArray(user.roles) ? user.roles : [user.role]).some(role => typeof role === 'string' && role.toLowerCase() === 'operator') ? 0 : 403;
  if (status) return res.status(status).json({ error: { code: status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN_OPERATION', message: 'Operator access is required.', details: {} } });
  next();
}
function createSimulationRouter(service) {
  const router = express.Router();
  const handle = (action, write) => async (req, res) => {
    try {
      const result = await action(req);
      return res.status(write ? result.status : 200).json({ data: write ? result.data : result });
    } catch (error) {
      const status = statusFor(error);
      return res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : error.code,
        message: status === 500 ? 'Unable to process the request.' : error.message, details: {} } });
    }
  };
  router.post('/simulations', requireOperator, handle(req => service.run(req.user.id, req.body, req.get('Idempotency-Key')), true));
  router.get('/simulations/:id', requireOperator, handle(req => service.getResult(req.user.id, req.params.id), false));
  return router;
}

module.exports = { createSimulationRouter };
