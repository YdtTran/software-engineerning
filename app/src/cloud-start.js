const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, scryptSync } = require('node:crypto');
const { initializeDatabase } = require('../db/initialize');
const { createDashboardDemo } = require('../db/create-dashboard-demo');

function hashAccount({ username, id, roles, password }) {
  if (!username || typeof username !== 'string' || !username.trim()) {
    throw new Error('Account username must be a nonempty string.');
  }
  if (!password || typeof password !== 'string' || password.length > 256) {
    throw new Error(`Password for account "${username}" must be between 1 and 256 characters.`);
  }
  const salt = randomBytes(16);
  return {
    username: username.trim(),
    id,
    roles,
    salt: salt.toString('hex'),
    passwordHash: scryptSync(password, salt, 64).toString('hex')
  };
}

function ensureDatabase(dbPath, seedMode) {
  const resolved = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const mode = String(seedMode || 'clean').trim().toLowerCase();
  if (!['clean', 'init', 'dashboard'].includes(mode)) {
    throw new Error(`Unsupported DEMO_SEED_MODE "${seedMode}". Use "dashboard" or "clean".`);
  }
  if (!fs.existsSync(resolved)) {
    if (mode === 'dashboard') {
      createDashboardDemo(resolved);
    } else {
      initializeDatabase(resolved);
    }
  } else {
    initializeDatabase(resolved);
  }
  return resolved;
}

function ensureAccountsFile(accountsPath, env) {
  const resolved = path.resolve(accountsPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  if (env.DEMO_ACCOUNTS_JSON && env.DEMO_ACCOUNTS_JSON.trim()) {
    let parsed;
    try {
      parsed = JSON.parse(env.DEMO_ACCOUNTS_JSON);
    } catch {
      throw new Error('DEMO_ACCOUNTS_JSON must be valid JSON.');
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('DEMO_ACCOUNTS_JSON must be a non-empty JSON array of hashed account objects.');
    }
    fs.writeFileSync(resolved, JSON.stringify(parsed, null, 2) + '\n', { mode: 0o600 });
    return resolved;
  }

  const operatorPassword = env.DEMO_OPERATOR_PASSWORD;
  const userPassword = env.DEMO_USER_PASSWORD;
  if (operatorPassword || userPassword) {
    const accounts = [];
    if (operatorPassword) {
      accounts.push(hashAccount({
        username: env.DEMO_OPERATOR_USERNAME || 'operator',
        id: env.DEMO_OPERATOR_ID || 'op-cloud-1',
        roles: ['operator'],
        password: operatorPassword
      }));
    }
    if (userPassword) {
      accounts.push(hashAccount({
        username: env.DEMO_USER_USERNAME || 'user',
        id: env.DEMO_USER_ID || 'user-cloud-1',
        roles: ['user'],
        password: userPassword
      }));
    }
    fs.writeFileSync(resolved, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
    return resolved;
  }

  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return resolved;
  }

  throw new Error(
    'No demo accounts configured. Set DEMO_OPERATOR_PASSWORD and/or DEMO_USER_PASSWORD, ' +
    'provide DEMO_ACCOUNTS_JSON, or mount a pre-provisioned DEMO_ACCOUNTS_FILE.'
  );
}

function prepareCloudEnvironment(env = process.env) {
  const defaultDataDir = path.resolve(__dirname, '../db/.local');
  const dbPath = ensureDatabase(
    env.DEMO_DB_PATH || path.join(defaultDataDir, 'hub.sqlite'),
    env.DEMO_SEED_MODE || 'clean'
  );
  const accountsFile = ensureAccountsFile(
    env.DEMO_ACCOUNTS_FILE || path.join(path.dirname(dbPath), 'accounts.json'),
    env
  );
  return {
    DEMO_DB_PATH: dbPath,
    DEMO_ACCOUNTS_FILE: accountsFile,
    DEMO_HOST: (env.DEMO_HOST || '0.0.0.0').trim(),
    DEMO_PORT: env.DEMO_PORT || env.PORT || '3000',
    TRUST_PROXY: env.TRUST_PROXY !== undefined ? env.TRUST_PROXY : '1'
  };
}

if (require.main === module) {
  const prepared = prepareCloudEnvironment(process.env);
  Object.assign(process.env, prepared);
  require('./demo-server');
}

module.exports = {
  ensureDatabase,
  ensureAccountsFile,
  prepareCloudEnvironment
};
