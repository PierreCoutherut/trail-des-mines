export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyToken } from '../../lib/auth.ts';
import { createContact, deleteContact, listContacts, recordContactExchange, setContactRead, validateContact } from '../../lib/contacts.ts';

const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_BODY_BYTES = 24000;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}

function authenticated(request: Request): boolean {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)tdm_admin_token=([^;]+)/)?.[1]
    || request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return false;
  const check = verifyToken(token);
  return Boolean(check.valid && check.user && ['admin', 'superadmin'].includes(check.user.role));
}
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return (!origin || origin === new URL(request.url).origin) && request.headers.get('sec-fetch-site') !== 'cross-site';
}
async function readBody(request: Request): Promise<Record<string, unknown>> {
  const maxBytes = request.headers.get('content-type')?.includes('application/x-www-form-urlencoded') ? 80000 : MAX_BODY_BYTES;
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new RangeError('body');
  const reader = request.body?.getReader(); if (!reader) throw new SyntaxError('body');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw new RangeError('body'); }
    chunks.push(value);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text));
  if (!request.headers.get('content-type')?.includes('application/json')) throw new TypeError('content-type');
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new SyntaxError('body');
  return parsed;
}

export const GET: APIRoute = async ({ request }) => {
  if (!authenticated(request)) return json({ error: 'Connectez-vous au back-office.' }, 401);
  try { return json({ contacts: listContacts() }); }
  catch { return json({ error: 'Impossible de lire les messages sauvegardés.' }, 500); }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!sameOrigin(request)) return json({ error: 'Envoi non autorisé depuis cette page.' }, 403);
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = clientAddress || 'unknown';
  const current = attempts.get(key) || { count: 0, until: now + WINDOW_MS };
  if (current.count >= 5 || (!attempts.has(key) && attempts.size >= 10000)) return json({ error: 'Trop de tentatives. Réessayez dans 15 minutes ou écrivez à runinchampagney70@gmail.com.' }, 429, { 'Retry-After': '900' });
  attempts.set(key, { ...current, count: current.count + 1 });
  const nativeForm = request.headers.get('content-type')?.includes('application/x-www-form-urlencoded');
  let body: Record<string, unknown>;
  try {
    body = await readBody(request);
  } catch (error) {
    if (error instanceof RangeError) return json({ error: 'Le message est trop volumineux (5 000 caractères maximum).' }, 413);
    return json({ error: 'Le formulaire est illisible. Rechargez la page puis réessayez.' }, 400);
  }
  if (body.website) return json({ error: 'Votre demande n’a pas pu être validée.' }, 400);
  const checked = validateContact(body);
  if (!checked.data) {
    if (nativeForm) return Response.redirect(new URL('/contact?error=validation#contact-form', request.url), 303);
    return json({ error: 'Vérifiez les champs indiqués.', fields: checked.errors }, 422);
  }
  try {
    createContact(checked.data);
    if (nativeForm) return Response.redirect(new URL('/contact?sent=1#contact-form', request.url), 303);
    return json({ success: true }, 201);
  } catch {
    if (nativeForm) return Response.redirect(new URL('/contact?error=storage#contact-form', request.url), 303);
    return json({ error: 'Votre message n’a pas été enregistré. Réessayez ou écrivez à runinchampagney70@gmail.com.' }, 503);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!authenticated(request)) return json({ error: 'Connectez-vous au back-office.' }, 401);
  if (!sameOrigin(request)) return json({ error: 'Action non autorisée depuis cette page.' }, 403);
  try {
    const body = await readBody(request);
    if (typeof body.id !== 'string' || (typeof body.read !== 'boolean' && body.action !== 'exchange')) return json({ error: 'Identifiant et action requis.' }, 422);
    const contact = body.action === 'exchange' ? recordContactExchange(body.id) : setContactRead(body.id, body.read as boolean);
    return contact ? json({ contact }) : json({ error: 'Message introuvable.' }, 404);
  } catch { return json({ error: 'Impossible de mettre à jour ce message. Réessayez.' }, 500); }
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!authenticated(request)) return json({ error: 'Connectez-vous au back-office.' }, 401);
  if (!sameOrigin(request)) return json({ error: 'Action non autorisée depuis cette page.' }, 403);
  try {
    const body = await readBody(request);
    if (typeof body.id !== 'string') return json({ error: 'Identifiant requis.' }, 422);
    return deleteContact(body.id) ? json({ success: true }) : json({ error: 'Message introuvable.' }, 404);
  } catch { return json({ error: 'Impossible de supprimer ce message. Réessayez.' }, 500); }
};
