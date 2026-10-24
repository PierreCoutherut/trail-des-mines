export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const GET: APIRoute = async ({ url }) => {
  const imageUrl = url.searchParams.get('url');
  let filename = url.searchParams.get('name') || 'photo-trail-des-mines.jpg';

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'URL requise' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl).split('?')[0];
    const cleanPath = decodedUrl.replace(/^(\.\.[\/\\])+/, '').replace(/^\/+/, '');
    const publicDir = path.resolve(process.cwd(), 'public');
    const fullPath = path.resolve(publicDir, cleanPath);

    if (!fullPath.startsWith(publicDir)) {
      return new Response(JSON.stringify({ error: 'Accès non autorisé' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      return new Response(JSON.stringify({ error: 'Fichier image introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Nom propre en sortie terminé par .jpg
    const baseName = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-\. ]/g, '_').trim();
    const safeFilename = `${baseName || 'photo-trail-des-mines'}.jpg`;

    // Conversion haute fidélité vers JPEG
    const jpegBuffer = await sharp(fullPath)
      .jpeg({
        quality: 92,
        mozjpeg: true
      })
      .toBuffer();

    return new Response(jpegBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': jpegBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err: any) {
    console.error('Erreur API download-photo:', err);
    return new Response(JSON.stringify({ error: 'Erreur lors de la conversion JPG' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
