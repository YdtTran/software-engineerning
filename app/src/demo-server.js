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
if (db.prepare('PRAGMA user_version').get().user_version !== 9) {
  db.close();
  throw new Error('Initialize or migrate the database before starting the demo server.');
}
const app = createApp({ db, demoAccounts, secureCookies: process.env.DEMO_INSECURE_HTTP !== '1' });
const server = app.listen(Number(portText), '127.0.0.1', () => {
  process.stdout.write(`Demo server listening on 127.0.0.1:${server.address().port}\n`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
