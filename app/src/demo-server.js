const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { createApp } = require('./app');

const accountFile = process.env.DEMO_ACCOUNTS_FILE;
const databaseFile = process.env.DEMO_DB_PATH;
const portText = process.env.DEMO_PORT || '3000';
if (!accountFile || !databaseFile || !/^\d+$/.test(portText) || Number(portText) > 65535) {
  throw new Error('Set DEMO_ACCOUNTS_FILE, DEMO_DB_PATH and a valid DEMO_PORT.');
}
if (process.env.DEMO_INSECURE_HTTP === '1' && process.env.NODE_ENV === 'production') {
  throw new Error('Insecure demo cookies are not permitted in production.');
}
if (!fs.statSync(databaseFile).isFile()) throw new Error('The initialized database file is required.');
const demoAccounts = JSON.parse(fs.readFileSync(accountFile, 'utf8'));
const db = new DatabaseSync(databaseFile);
if (db.prepare('PRAGMA user_version').get().user_version !== 12) {
  db.close();
  throw new Error('Initialize or migrate the database before starting the demo server.');
}
const app = createApp({
  db,
  demoAccounts,
  secureCookies: process.env.DEMO_INSECURE_HTTP !== '1',
  simulateDevices: process.env.DEMO_SIMULATED_DEVICES === '1'
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
const server = app.listen(Number(portText), '127.0.0.1', () => {
  process.stdout.write(`Demo server listening on 127.0.0.1:${server.address().port}\n`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    clearInterval(mobilityExpiryTimer);
    if (parkingExpiryTimer) clearInterval(parkingExpiryTimer);
    server.close(() => { db.close(); process.exit(0); });
  });
}
