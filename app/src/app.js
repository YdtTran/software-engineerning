const express = require('express');
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { createOperationsModule } = require('./modules/operations');

const deriveKey = promisify(scrypt);

function createApp({ db = null, client = null, demoAccounts, tripReader = null, chargingGuard = null, secureCookies = true } = {}) {
  if (!Array.isArray(demoAccounts) || demoAccounts.length === 0) throw new Error('Provision at least one demo account.');
  const accounts = new Map();
  for (const account of demoAccounts) {
    if (!account || typeof account.username !== 'string' || !account.username || typeof account.id !== 'string' || !account.id ||
        !Array.isArray(account.roles) || !account.roles.length || !account.roles.every(role => typeof role === 'string' && ['user', 'operator'].includes(role.toLowerCase())) ||
        !/^[a-f0-9]{32,128}$/i.test(account.salt || '') || (account.salt.length % 2) || !/^[a-f0-9]{128}$/i.test(account.passwordHash || '') || accounts.has(account.username)) {
      throw new Error('Invalid or duplicate demo account configuration.');
    }
    accounts.set(account.username, { id: account.id, roles: account.roles.map(role => role.toLowerCase()), salt: Buffer.from(account.salt, 'hex'), hash: Buffer.from(account.passwordHash, 'hex') });
  }
  const dummySalt = randomBytes(16), dummyHash = randomBytes(64);
  const sessions = new Map();
  const sessionLifetimeMs = 8 * 60 * 60 * 1000;
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: secureCookies, path: '/', maxAge: sessionLifetimeMs };
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('Origin');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin && origin !== `${req.protocol}://${req.get('host')}`) {
      return res.status(403).json({ error: { code: 'FORBIDDEN_OPERATION', message: 'Origin is not allowed.', details: {} } });
    }
    const cookies = (req.headers.cookie || '').split(';').map(part => part.trim()).filter(part => part.startsWith('demo_session='));
    const token = cookies.length === 1 ? cookies[0].slice('demo_session='.length) : null;
    const session = token && sessions.get(token);
    if (session && session.expiresAt > Date.now()) req.user = session.user;
    else if (session) sessions.delete(token);
    req.demoSessionToken = session && req.user ? token : null;
    if (req.demoSessionToken && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !origin) {
      return res.status(403).json({ error: { code: 'FORBIDDEN_OPERATION', message: 'Origin is required for session writes.', details: {} } });
    }
    next();
  });
  app.post('/api/v1/session', async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 128 || password.length > 256) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Username and password are required.', details: {} } });
    }
    const account = accounts.get(username);
    const candidate = await deriveKey(password, account ? account.salt : dummySalt, 64);
    if (!timingSafeEqual(candidate, account ? account.hash : dummyHash) || !account) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid credentials.', details: {} } });
    }
    if (req.demoSessionToken) sessions.delete(req.demoSessionToken);
    const token = randomBytes(32).toString('hex');
    const user = { id: account.id, roles: [...account.roles] };
    sessions.set(token, { user, expiresAt: Date.now() + sessionLifetimeMs });
    res.cookie('demo_session', token, cookieOptions);
    return res.status(200).json({ data: user });
  });
  app.delete('/api/v1/session', (req, res) => {
    if (!req.demoSessionToken) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.', details: {} } });
    sessions.delete(req.demoSessionToken);
    res.clearCookie('demo_session', { httpOnly: true, sameSite: 'strict', secure: secureCookies, path: '/' });
    return res.status(200).json({ data: { signedOut: true } });
  });
  app.use('/api/v1', createOperationsModule({ db, client, tripReader, chargingGuard }).router);
  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.', details: {} } }));
  app.use((err, req, res, next) => {
    const status = err.type === 'entity.parse.failed' ? 400 : err.type === 'entity.too.large' ? 413 : 500;
    const code = status === 500 ? 'INTERNAL_ERROR' : 'INVALID_INPUT';
    return res.status(status).json({ error: { code, message: status === 500 ? 'Unable to process the request.' : 'Invalid request body.', details: {} } });
  });
  return app;
}

module.exports = { createApp };
