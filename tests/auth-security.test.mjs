import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const projectDir = fileURLToPath(new URL('../', import.meta.url));
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdm-auth-test-'));
const previousCwd = process.cwd();
const savedEnv = Object.fromEntries(['AUTH_SECRET', 'AUTH_DATA_DIR', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'NODE_ENV'].map(key => [key, process.env[key]]));
const accountsFile = path.join(testDir, 'src/data/admins.json');

try {
  const authUrl = pathToFileURL(path.join(projectDir, 'src/lib/auth.ts')).href;
  const apiSource = fs.readFileSync(path.join(projectDir, 'src/pages/api/auth.ts'), 'utf8')
    .replace("'../../lib/auth'", JSON.stringify(authUrl));
  process.chdir(testDir);
  process.env.NODE_ENV = 'production';
  delete process.env.AUTH_SECRET;
  delete process.env.AUTH_DATA_DIR;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
  const auth = await import(authUrl);
  const api = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(apiSource)).toString('base64'));

  assert.deepEqual(auth.getAdmins(), []);
  assert.equal(fs.existsSync(accountsFile), false, 'production must not create default accounts');
  for (const unsafePath of ['public', 'public/accounts', 'dist/client', 'dist/client/accounts']) {
    process.env.AUTH_DATA_DIR = path.join(testDir, unsafePath);
    assert.throws(() => auth.getAdmins(), auth.AuthConfigurationError, 'public account directories must be rejected');
  }
  delete process.env.AUTH_DATA_DIR;
  assert.throws(() => auth.authenticate('root', 'root'), auth.AuthConfigurationError);
  assert.equal(auth.verifyToken('invalid').valid, false);

  process.env.AUTH_SECRET = crypto.randomBytes(48).toString('base64url');
  assert.throws(() => auth.authenticate('root', 'root'), auth.AuthConfigurationError);
  assert.equal(fs.existsSync(accountsFile), false, 'a secret alone must not bootstrap an account');
  process.env.ADMIN_USERNAME = 'site-owner';
  process.env.ADMIN_PASSWORD = crypto.randomBytes(24).toString('base64url');
  const accounts = auth.getAdmins();
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].username, 'site-owner');
  const existingFile = fs.readFileSync(accountsFile, 'utf8');
  process.env.ADMIN_USERNAME = 'replacement-owner';
  assert.equal(auth.getAdmins()[0].username, 'site-owner');
  assert.equal(fs.readFileSync(accountsFile, 'utf8'), existingFile, 'configured accounts must remain unchanged');

  const login = auth.authenticate('site-owner', process.env.ADMIN_PASSWORD);
  assert.equal(login.success, true);
  assert.equal(auth.verifyToken(login.token).valid, true);
  assert.equal(auth.verifyToken(login.token.slice(0, -64) + '0'.repeat(64)).valid, false);
  const sign = payload => {
    const serialized = JSON.stringify(payload);
    return Buffer.from(serialized).toString('base64') + '.' + crypto.createHmac('sha256', process.env.AUTH_SECRET).update(serialized).digest('hex');
  };
  const session = { sub: accounts[0].id, username: 'site-owner', role: 'superadmin' };
  assert.equal(auth.verifyToken(sign({ ...session, exp: Date.now() - 1000 })).valid, false, 'expired sessions must be rejected');
  assert.equal(auth.verifyToken(sign(session)).valid, false, 'expiration is required');
  assert.equal(auth.verifyToken(sign({ ...session, role: 'admin', exp: Date.now() + 10000 })).valid, false, 'roles must match the stored account');
  assert.equal(auth.createAdmin('short-password', 'tiny').success, false);
  assert.equal(auth.verifyPassword('test', 'malformed', 'salt'), false);

  const context = body => ({ request: new Request('https://example.test/api/auth', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }) });
  const response = await api.POST(context({ username: 'site-owner', password: process.env.ADMIN_PASSWORD }));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; SameSite=Lax/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal('token' in await response.json(), false, 'sessions should only be returned in the HttpOnly cookie');
  const status = await api.GET({ request: new Request('https://example.test/api/auth', { headers: { cookie: 'other=1; ' + cookie.split(';')[0] } }) });
  assert.equal((await status.json()).authenticated, true);
  assert.equal((await api.POST(context({ username: [], password: 'x' }))).status, 400);
  assert.equal((await api.POST({ request: new Request('https://example.test/api/auth', { method: 'POST', body: '{' }) })).status, 400);
  assert.equal((await api.POST(context({ username: 'site-owner', password: 'incorrect' }))).status, 401);
  assert.match((await api.DELETE({})).headers.get('set-cookie'), /Max-Age=0; Secure/);
  delete process.env.AUTH_SECRET;
  assert.equal((await api.POST(context({ username: 'site-owner', password: process.env.ADMIN_PASSWORD }))).status, 503);
  process.env.AUTH_SECRET = crypto.randomBytes(48).toString('base64url');
  assert.equal(auth.verifyToken(login.token).valid, false, 'rotating the secret must invalidate sessions');

  const legacyPassword = auth.hashPassword('root');
  auth.saveAdmins([...accounts, { id: 'legacy-root', username: 'root', passwordHash: legacyPassword.hash, salt: legacyPassword.salt, role: 'superadmin', createdAt: new Date().toISOString() }]);
  assert.equal(auth.authenticate('root', 'root').success, false, 'known legacy default credentials must be blocked');
  auth.saveAdmins([]);
  assert.equal(auth.verifyToken(sign({ ...session, exp: Date.now() + 10000 })).valid, false, 'deleted accounts must lose access');
  assert.deepEqual(auth.getAdmins(), [], 'an existing empty account file must not be provisioned again');
  const privateDirectory = path.join(testDir, 'private-runtime-volume', 'accounts');
  process.env.AUTH_DATA_DIR = privateDirectory;
  assert.equal(auth.getAdmins()[0].username, 'replacement-owner', 'explicit provisioning must support the private runtime volume');
  assert.equal(fs.existsSync(path.join(privateDirectory, 'admins.json')), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(accountsFile, 'utf8')), [], 'a custom account directory must leave the default file untouched');
  delete process.env.AUTH_DATA_DIR;
  assert.deepEqual(auth.getAdmins(), [], 'the legacy default path must remain supported');
  console.log('Auth security checks passed (isolated production fixture, sessions, provisioning, cookies and API errors).');
} finally {
  process.chdir(previousCwd);
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  if (path.resolve(testDir).startsWith(path.resolve(os.tmpdir()) + path.sep)) fs.rmSync(testDir, { recursive: true, force: true });
}
