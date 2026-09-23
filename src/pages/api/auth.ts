export const prerender = false;

import type { APIRoute } from 'astro';
import { authenticate, verifyToken } from '../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Identifiant et mot de passe requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const authResult = authenticate(username, password);
    if (!authResult.success || !authResult.token) {
      return new Response(JSON.stringify({ error: 'Identifiants invalides' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set(
      'Set-Cookie',
      `tdm_admin_token=${authResult.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        user: authResult.user,
        token: authResult.token
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/tdm_admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const check = verifyToken(token);
  return new Response(JSON.stringify({ authenticated: check.valid, user: check.user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async () => {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Set-Cookie', 'tdm_admin_token=; Path=/; HttpOnly; Max-Age=0');
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
};
