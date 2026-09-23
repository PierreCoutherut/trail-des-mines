export const prerender = false;

import type { APIRoute } from 'astro';
import { saveResultLinks } from '../../lib/db';
import { verifyToken } from '../../lib/auth';

function getAuthenticatedUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/tdm_admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const check = verifyToken(token);
  return check.valid ? check.user : null;
}

export const POST: APIRoute = async ({ request }) => {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    const { year, resultLinks } = data;
    if (!year) {
      return new Response(JSON.stringify({ error: "L'année de l'édition est obligatoire" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!Array.isArray(resultLinks)) {
      return new Response(JSON.stringify({ error: "Format des liens invalide" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const res = await saveResultLinks(year, resultLinks);
    if (!res.success) {
      return new Response(JSON.stringify({ error: res.error || "Erreur lors de la sauvegarde" }), {
        status: 404,
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
