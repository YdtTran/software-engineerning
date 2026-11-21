const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { createApp } = require('./app');

function parseTrustProxy(raw) {
  if (raw === undefined || raw === null) return false;
  const value = String(raw).trim();
  if (!value || value === '0' || value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

const accountFile = process.env.DEMO_ACCOUNTS_FILE;
const databaseFile = process.env.DEMO_DB_PATH;
const portText = process.env.DEMO_PORT || process.env.PORT || '3000';
const host = (process.env.DEMO_HOST || '127.0.0.1').trim();
if (!accountFile || !databaseFile || !/^\d+$/.test(portText) || Number(portText) > 65535 || !host || /\s/.test(host)) {
  throw new Error('Set DEMO_ACCOUNTS_FILE, DEMO_DB_PATH, valid DEMO_PORT (or PORT) and DEMO_HOST.');
}
if (process.env.DEMO_INSECURE_HTTP === '1' && process.env.NODE_ENV === 'production') {
  throw new Error('Insecure demo cookies are not permitted in production.');
}
if (!fs.statSync(databaseFile).isFile()) throw new Error('The initialized database file is required.');
const demoAccounts = JSON.parse(fs.readFileSync(accountFile, 'utf8'));
const db = new DatabaseSync(databaseFile);
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
if (db.prepare('PRAGMA user_version').get().user_version !== 12) {
  db.close();
  throw new Error('Initialize or migrate the database before starting the demo server.');
}
const app = createApp({
  db,
  demoAccounts,
  secureCookies: process.env.DEMO_INSECURE_HTTP !== '1',
  simulateDevices: process.env.DEMO_SIMULATED_DEVICES === '1',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY)
});
const mobilityExpiryTimer = setInterval(() => {
  if (app.locals.mobility?.rentalService?.expireReservations) {
    app.locals.mobility.rentalService.expireReservations().catch(() => process.stderr.write('Reservation expiry scan failed.\n'));
  }
}, 30000);
mobilityExpiryTimer.unref();
const parkingExpiryIntervalMs = Number(process.env.PARKING_EXPIRY_SCAN_INTERVAL_MS || 30000);
const parkingExpiryTimer = Number.isFinite(parkingExpiryIntervalMs) && parkingExpiryIntervalMs > 0
  ? setInterval(() => {
    if (app.locals.parkingCharging?.parkingService?.runExpiryScan) {
      app.locals.parkingCharging.parkingService.runExpiryScan().catch(() => {});
    }
  }, parkingExpiryIntervalMs)
  : null;
if (parkingExpiryTimer && typeof parkingExpiryTimer.unref === 'function') {
  parkingExpiryTimer.unref();
}
const server = app.listen(Number(portText), host, () => {
  process.stdout.write(`Demo server listening on ${server.address().address}:${server.address().port}\n`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    clearInterval(mobilityExpiryTimer);
    if (parkingExpiryTimer) clearInterval(parkingExpiryTimer);
    server.close(() => { db.close(); process.exit(0); });
  });
}
