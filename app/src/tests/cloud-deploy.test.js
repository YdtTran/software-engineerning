const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { scryptSync } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createApp } = require('../app');
const { prepareCloudEnvironment } = require('../cloud-start');

test('healthz responds 200 and trustProxy honors forwarded HTTPS origin while rejecting foreign origins', async t => {
  const db = new DatabaseSync(':memory:');
  const salt = '0123456789abcdef0123456789abcdef';
  const accounts = [{
    username: 'operator',
    id: 'op',
    roles: ['operator'],
    salt,
    passwordHash: scryptSync('secret', Buffer.from(salt, 'hex'), 64).toString('hex')
  }];

  const appWithProxy = createApp({ db, demoAccounts: accounts, secureCookies: true, trustProxy: 1 });
  const server = await new Promise(resolve => {
    const s = appWithProxy.listen(0, '127.0.0.1', () => resolve(s));
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { data: { status: 'ok' } });

  const proxiedLogin = await fetch(`${base}/api/v1/session`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'hub.example.com',
      origin: 'https://hub.example.com'
    },
    body: JSON.stringify({ username: 'operator', password: 'secret' })
  });
  assert.equal(proxiedLogin.status, 200);
  const setCookie = proxiedLogin.headers.get('set-cookie') || '';
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);

  const foreignLogin = await fetch(`${base}/api/v1/session`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'hub.example.com',
      origin: 'https://attacker.example.com'
    },
    body: JSON.stringify({ username: 'operator', password: 'secret' })
  });
  assert.equal(foreignLogin.status, 403);
});

test('trustProxy defaults to false and ignores spoofed forwarded headers', async t => {
  const db = new DatabaseSync(':memory:');
  const salt = '0123456789abcdef0123456789abcdef';
  const accounts = [{
    username: 'operator',
    id: 'op',
    roles: ['operator'],
    salt,
    passwordHash: scryptSync('secret', Buffer.from(salt, 'hex'), 64).toString('hex')
  }];

  const app = createApp({ db, demoAccounts: accounts, secureCookies: false });
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const spoofed = await fetch(`${base}/api/v1/session`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'hub.example.com',
      origin: 'https://hub.example.com'
    },
    body: JSON.stringify({ username: 'operator', password: 'secret' })
  });
  assert.equal(spoofed.status, 403);
});

test('cloud-start bootstraps dashboard DB, hashes passwords without plaintext, and boots with PORT', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-start-'));
  const dbPath = path.join(dir, 'hub.sqlite');
  const accountsPath = path.join(dir, 'accounts.json');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  assert.throws(() => prepareCloudEnvironment({
    DEMO_DB_PATH: dbPath,
    DEMO_ACCOUNTS_FILE: accountsPath,
    DEMO_SEED_MODE: 'clean'
  }), /No demo accounts configured/);

  // Clean DB created above is preserved when re-running prepareCloudEnvironment with credentials
  fs.rmSync(dbPath, { force: true });

  const child = spawn(process.execPath, [path.resolve(__dirname, '../cloud-start.js')], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '0',
      DEMO_HOST: '127.0.0.1',
      DEMO_DB_PATH: dbPath,
      DEMO_ACCOUNTS_FILE: accountsPath,
      DEMO_SEED_MODE: 'dashboard',
      DEMO_OPERATOR_PASSWORD: 'op-cloud-secret-password',
      DEMO_USER_PASSWORD: 'user-cloud-secret-password',
      TRUST_PROXY: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise(resolve => child.once('exit', resolve));
    }
  });

  const output = await new Promise((resolve, reject) => {
    let text = '';
    let errText = '';
    const timer = setTimeout(() => reject(new Error(`cloud-start did not listen: ${errText}`)), 8000);
    child.stderr.on('data', chunk => { errText += chunk; });
    child.stdout.on('data', chunk => {
      text += chunk;
      if (text.includes('\n')) {
        clearTimeout(timer);
        resolve(text);
      }
    });
    child.once('error', reject);
    child.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(`cloud-start exited (${code}): ${errText}`));
    });
  });

  const match = output.match(/127\.0\.0\.1:(\d+)/);
  assert.ok(match, output);
  const base = `http://127.0.0.1:${match[1]}`;

  const rawAccounts = fs.readFileSync(accountsPath, 'utf8');
  assert.ok(!rawAccounts.includes('op-cloud-secret-password'));
  assert.ok(!rawAccounts.includes('user-cloud-secret-password'));

  const health = await fetch(`${base}/healthz`);
  assert.equal(health.status, 200);

  const login = await fetch(`${base}/api/v1/session`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'demo.onrender.com',
      origin: 'https://demo.onrender.com'
    },
    body: JSON.stringify({ username: 'operator', password: 'op-cloud-secret-password' })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const hubs = await fetch(`${base}/api/v1/operations/hubs`, { headers: { cookie } });
  assert.equal(hubs.status, 200);
  const body = await hubs.json();
  assert.ok(Array.isArray(body.data) && body.data.length > 0);
});
