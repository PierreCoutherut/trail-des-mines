export const prerender = false;

import type { APIRoute } from 'astro';
import { getAllEditions, saveEdition } from '../../lib/db';
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
    const body = await request.json();
    const { editionYear, photographerName, photographerSlug, bio, instagramUrl, websiteUrl } = body;

    const editions = await getAllEditions();
    const edition = editions.find(e => e.year === Number(editionYear));
    if (!edition) {
      return new Response(JSON.stringify({ error: 'Édition introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const slug = (photographerSlug || photographerName.toLowerCase().replace(/[^a-z0-9-]/g, '-')).trim();
    let gallery = edition.galleries.find(g => g.photographerSlug === slug);

    if (gallery) {
      gallery.photographerName = photographerName || gallery.photographerName;
      gallery.bio = bio !== undefined ? bio : gallery.bio;
      gallery.instagramUrl = instagramUrl !== undefined ? instagramUrl : gallery.instagramUrl;
      gallery.websiteUrl = websiteUrl !== undefined ? websiteUrl : gallery.websiteUrl;
    } else {
      gallery = {
        id: `${slug}-${editionYear}`,
        photographerName,
        photographerSlug: slug,
        bio: bio || '',
        instagramUrl: instagramUrl || '',
        websiteUrl: websiteUrl || '',
        subGalleries: []
      };
      edition.galleries.push(gallery);
    }

    await saveEdition(edition);
    return new Response(JSON.stringify({ success: true, gallery }), {
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
    const editionYear = Number(url.searchParams.get('editionYear'));
    const photographerSlug = url.searchParams.get('photographerSlug');
    const photoId = url.searchParams.get('photoId');
    const subGalleryId = url.searchParams.get('subGalleryId');

    const editions = await getAllEditions();
    const edition = editions.find(e => e.year === editionYear);
    if (!edition) {
      return new Response(JSON.stringify({ error: 'Édition introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const gallery = edition.galleries.find(g => g.photographerSlug === photographerSlug);
    if (!gallery) {
      return new Response(JSON.stringify({ error: 'Galerie introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (photoId) {
      // Supprimer une photo précise
      for (const sub of gallery.subGalleries) {
        sub.photos = sub.photos.filter(p => p.id !== photoId);
      }
    } else if (subGalleryId) {
      // Supprimer une sous-galerie
      gallery.subGalleries = gallery.subGalleries.filter(s => s.id !== subGalleryId);
    } else {
      // Supprimer le photographe entier de l'édition
      edition.galleries = edition.galleries.filter(g => g.photographerSlug !== photographerSlug);
    }

    await saveEdition(edition);
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
