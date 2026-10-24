import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectDir = process.cwd();
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdm-contacts-test-'));
const savedEnv = Object.fromEntries(['AUTH_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'CONTACT_DATA_DIR', 'DATA_DIR', 'CONTACT_RETENTION_MONTHS'].map(key => [key, process.env[key]]));

try {
  process.chdir(temporaryDir);
  process.env.AUTH_SECRET = crypto.randomBytes(48).toString('base64url');
  process.env.ADMIN_USERNAME = 'contact-test-admin';
  process.env.ADMIN_PASSWORD = crypto.randomBytes(24).toString('base64url');
  process.env.CONTACT_DATA_DIR = path.join(temporaryDir, 'private-contacts');
  delete process.env.CONTACT_RETENTION_MONTHS;
  const contactsUrl = new URL('../src/lib/contacts.ts', import.meta.url);
  const contacts = await import(contactsUrl);
  const auth = await import(new URL('../src/lib/auth.ts', import.meta.url));
  const api = await import(new URL('../src/pages/api/contacts.ts', import.meta.url));
  const input = { firstName: 'Élodie', lastName: 'Test', email: 'RUNNER@example.test', phone: '', subject: 'parcours', message: 'Une question de test sur les parcours.', consent: true };
  assert.equal(contacts.getContactRetentionMonths(), 24);
  assert.equal(contacts.validateContact(input).data.email, 'runner@example.test');
  for (const invalid of [
    { ...input, consent: false }, { ...input, subject: 'constructor' }, { ...input, email: 'broken' },
    { ...input, email: 'user@example.test\r\nBcc: other@example.test' }, { ...input, firstName: [] },
    { ...input, message: 'a'.repeat(5001) }, { ...input, message: 'short' },
  ]) assert.equal(contacts.validateContact(invalid).data, undefined);
  const first = contacts.createContact(input);
  const second = contacts.createContact({ ...input, message: '<script>alert("escaped by Astro")</script>' });
  assert.notEqual(first.id, second.id);
  assert.equal(contacts.listContacts().length, 2);
  const restartCount = execFileSync(process.execPath, ['--input-type=module', '-e', `const contacts = await import(${JSON.stringify(contactsUrl.href)}); process.stdout.write(String(contacts.listContacts().length));`], { encoding: 'utf8', cwd: temporaryDir });
  assert.equal(restartCount, '2', 'messages must survive a separate process');
  assert.equal(contacts.setContactRead('../outside', true), null, 'identifiers must not escape the private directory');
  assert.equal(contacts.setContactRead(first.id, true).lastActivityAt, first.lastActivityAt, 'reading does not extend retention');
  assert.ok(contacts.listContacts().find(item => item.id === first.id).readAt);
  assert.equal(contacts.setContactRead(first.id, false).readAt, null);

  const old = new Date(); old.setUTCFullYear(old.getUTCFullYear() - 3);
  const firstFile = path.join(contacts.getContactDataDir(), `${first.id}.json`);
  fs.writeFileSync(firstFile, JSON.stringify({ ...first, createdAt: old.toISOString(), lastActivityAt: first.createdAt }));
  assert.equal(contacts.listContacts().length, 2, 'recent exchange retains an older request');
  fs.writeFileSync(firstFile, JSON.stringify({ ...first, createdAt: old.toISOString(), lastActivityAt: old.toISOString() }));
  assert.equal(contacts.listContacts().length, 1, 'expired messages are purged');
  assert.equal(fs.existsSync(firstFile), false);
  assert.ok(contacts.recordContactExchange(second.id).lastActivityAt);
  const purgeResult = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/purge-contacts.mjs', import.meta.url))], { encoding: 'utf8', cwd: temporaryDir });
  assert.match(purgeResult, /Demandes conservées : 1/, 'the private scheduled task must use the configured store');

  const context = (method, body, headers = {}, clientAddress = crypto.randomUUID()) => ({
    clientAddress,
    request: new Request('https://example.test/api/contacts', {
      method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  });
  assert.equal((await api.GET(context('GET'))).status, 401);
  assert.equal((await api.PATCH(context('PATCH', { id: second.id, read: true }))).status, 401);
  assert.equal((await api.DELETE(context('DELETE', { id: second.id }))).status, 401);
  assert.equal((await api.GET(context('GET', undefined, { Cookie: 'tdm_admin_token=forged' }))).status, 401);
  assert.equal((await api.POST(context('POST', { ...input, consent: false }))).status, 422);
  assert.equal((await api.POST(context('POST', { ...input, website: 'spam.test' }))).status, 400);
  assert.equal((await api.POST(context('POST', input, { Origin: 'https://evil.test' }))).status, 403);
  assert.equal((await api.POST(context('POST', input, { 'Sec-Fetch-Site': 'cross-site' }))).status, 403);
  assert.equal((await api.POST(context('POST', { ...input, message: 'a'.repeat(30000) }))).status, 413);
  const posted = await api.POST(context('POST', input));
  assert.equal(posted.status, 201);
  assert.deepEqual(await posted.json(), { success: true });
  assert.equal(posted.headers.get('cache-control'), 'no-store');
  const native = await api.POST({ clientAddress: 'native-form', request: new Request('https://example.test/api/contacts', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...input, consent: 'on' }),
  }) });
  assert.equal(native.status, 303);
  assert.equal(native.headers.get('location'), 'https://example.test/contact?sent=1#contact-form');
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await api.POST(context('POST', {}, {}, 'rate-limit-fixture'))).status, 422);
  assert.equal((await api.POST(context('POST', input, {}, 'rate-limit-fixture'))).status, 429);

  const login = auth.authenticate('contact-test-admin', process.env.ADMIN_PASSWORD);
  assert.ok(login.token);
  const authorization = { Cookie: `unrelated=1; tdm_admin_token=${login.token}` };
  const listed = await api.GET(context('GET', undefined, authorization));
  assert.equal(listed.status, 200);
  assert.equal((await listed.json()).contacts.length, 3);
  assert.equal((await api.PATCH(context('PATCH', { id: second.id, read: true }, authorization))).status, 200);
  assert.equal((await api.PATCH(context('PATCH', { id: second.id, action: 'exchange' }, authorization))).status, 200);
  assert.equal((await api.DELETE(context('DELETE', { id: second.id }, { ...authorization, Origin: 'https://evil.test' }))).status, 403);
  assert.equal((await api.DELETE(context('DELETE', { id: second.id }, authorization))).status, 200);
  assert.equal((await api.DELETE(context('DELETE', { id: second.id }, authorization))).status, 404);

  const brokenFile = path.join(contacts.getContactDataDir(), `${crypto.randomUUID()}.json`);
  fs.writeFileSync(brokenFile, '{broken');
  assert.throws(() => contacts.listContacts(), 'corrupt data must be surfaced, never overwritten');
  assert.equal((await api.GET(context('GET', undefined, authorization))).status, 500);
  assert.equal((await api.POST(context('POST', input))).status, 503, 'stored JSON corruption is a storage failure, not an invalid form');
  fs.unlinkSync(brokenFile);
  const remainingCount = contacts.listContacts().length;
  assert.equal(remainingCount, 2);
  process.env.CONTACT_DATA_DIR = path.join(temporaryDir, 'public', 'contacts');
  assert.throws(() => contacts.getContactDataDir(), /privé/);
  process.env.CONTACT_DATA_DIR = path.join(temporaryDir, 'dist', 'client', 'contacts');
  assert.throws(() => contacts.getContactDataDir(), /privé/);
  console.log('Contact checks passed: validation, private persistence across processes, retention, consent, session access, rate limiting, status and deletion.');
} finally {
  process.chdir(projectDir);
  for (const [key, value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  if (path.resolve(temporaryDir).startsWith(path.resolve(os.tmpdir()) + path.sep)) fs.rmSync(temporaryDir, { recursive: true, force: true });
}
