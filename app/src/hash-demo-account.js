const fs = require('node:fs');
const { randomBytes, scryptSync } = require('node:crypto');

const [username, id, roleList] = process.argv.slice(2);
const roles = roleList && roleList.split(',');
if (!username || !id || !roles || !roles.length || !roles.every(role => ['user', 'operator'].includes(role))) {
  throw new Error('Usage: node hash-demo-account.js USERNAME ID user[,operator] < password-source');
}
const password = fs.readFileSync(0, 'utf8').replace(/\r?\n$/, '');
if (!password || password.length > 256) throw new Error('A nonempty password of at most 256 characters is required on stdin.');
const salt = randomBytes(16);
const account = { username, id, roles, salt: salt.toString('hex'), passwordHash: scryptSync(password, salt, 64).toString('hex') };
process.stdout.write(`${JSON.stringify([account], null, 2)}\n`);
