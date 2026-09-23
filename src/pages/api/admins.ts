export const prerender = false;

import type { APIRoute } from 'astro';
import { getAdmins, createAdmin, deleteAdmin, verifyToken } from '../../lib/auth';

function getAuthenticatedUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/tdm_admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const check = verifyToken(token);
  return check.valid ? check.user : null;
}

export const GET: APIRoute = async ({ request }) => {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const admins = getAdmins().map(a => ({
    id: a.id,
    username: a.username,
    role: a.role,
    createdAt: a.createdAt
  }));

  return new Response(JSON.stringify({ admins }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { username, password, role } = body;

    const result = createAdmin(username, password, role === 'superadmin' ? 'superadmin' : 'admin');
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.message || 'Impossible de créer cet administrateur' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        admin: {
          id: result.user?.id,
          username: result.user?.username,
          role: result.user?.role,
          createdAt: result.user?.createdAt
        }
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = deleteAdmin(id, user.username);
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
