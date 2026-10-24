export const prerender = false;

import type { APIRoute } from 'astro';
import { authenticate, AuthConfigurationError, verifyToken } from '../../lib/auth';

const cookieSecurity = () => import.meta.env?.PROD || process.env.NODE_ENV === 'production' ? '; Secure' : '';
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }
});

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requête invalide' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: 'Requête invalide' }, 400);
  const { username, password } = body as { username?: unknown; password?: unknown };
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password ||
      username.length > 64 || password.length > 1024) {
    return json({ error: 'Identifiant et mot de passe requis' }, 400);
  }
  try {
    const authResult = authenticate(username, password);
    if (!authResult.success || !authResult.token) return json({ error: 'Identifiants invalides' }, 401);
    return json({ success: true, user: authResult.user }, 200, {
      'Set-Cookie': `tdm_admin_token=${authResult.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${cookieSecurity()}`
    });
  } catch (error) {
    return json({ error: error instanceof AuthConfigurationError ? error.message : 'Erreur serveur' }, error instanceof AuthConfigurationError ? 503 : 500);
  }
};

export const GET: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)tdm_admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return json({ authenticated: false });
  const check = verifyToken(token);
  return json({ authenticated: check.valid, user: check.user }, 200, check.valid ? {} : {
    'Set-Cookie': `tdm_admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecurity()}`
  });
};

export const DELETE: APIRoute = async () => json({ success: true }, 200, {
  'Set-Cookie': `tdm_admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecurity()}`
});
