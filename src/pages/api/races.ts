export const prerender = false;

import type { APIRoute } from 'astro';
import { saveRace, deleteRace, getEditionByYearSync } from '../../lib/db';
import { verifyToken } from '../../lib/auth';
import type { RaceResult } from '../../lib/types';

function getAuthenticatedUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/tdm_admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const check = verifyToken(token);
  return check.valid ? check.user : null;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const year = url.searchParams.get('editionYear');
  if (!year) {
    return new Response(JSON.stringify({ error: "L'année de l'édition est requise" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const edition = getEditionByYearSync(year);
  if (!edition) {
    return new Response(JSON.stringify({ error: 'Édition introuvable' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ races: edition.races }), {
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
    const { editionYear, race } = body;

    if (!editionYear || !race || !race.name) {
      return new Response(JSON.stringify({ error: "L'année de l'édition et le nom de l'épreuve sont obligatoires" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const raceData: RaceResult = {
      id: race.id || `race-${race.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${editionYear}`,
      name: race.name.trim(),
      distance: race.distance || '0 km',
      elevation: race.elevation || '+0 m',
      finishersCount: Number(race.finishersCount) || 0,
      chronoUrl: race.chronoUrl || '',
      resultsPdfUrl: race.resultsPdfUrl || '',
      podiumScratch: Array.isArray(race.podiumScratch) ? race.podiumScratch : [],
      podiumWomen: Array.isArray(race.podiumWomen) ? race.podiumWomen : []
    };

    const res = await saveRace(editionYear, raceData);
    if (!res.success) {
      return new Response(JSON.stringify({ error: res.error || 'Erreur lors de la sauvegarde de la course' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, race: res.race }), {
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
    const editionYear = url.searchParams.get('editionYear');
    const raceId = url.searchParams.get('raceId');

    if (!editionYear || !raceId) {
      return new Response(JSON.stringify({ error: "L'année d'édition et l'identifiant de la course sont requis" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ok = await deleteRace(editionYear, raceId);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Course introuvable ou déjà supprimée' }), {
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
