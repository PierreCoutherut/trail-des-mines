export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { addPhotoToGallery, getEditionByYear, saveEdition } from '../../lib/db';
import { verifyToken } from '../../lib/auth';
import type { PhotoItem } from '../../lib/types';

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
    const formData = await request.formData();
    const uploadType = formData.get('type')?.toString() || 'gallery'; // 'gallery' ou 'poster'
    const editionYear = formData.get('editionYear')?.toString();

    if (!editionYear) {
      return new Response(JSON.stringify({ error: "L'année de l'édition est requise" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const watermarkPath = path.resolve(process.cwd(), 'public/medias/watermark.png');
    const hasWatermarkFile = fs.existsSync(watermarkPath);

    // =========================================================================
    // CAS 1 : Upload de l'Affiche officielle de l'année
    // =========================================================================
    if (uploadType === 'poster') {
      const file = formData.get('file') as File | null;
      if (!file) {
        return new Response(JSON.stringify({ error: 'Aucun fichier affiche fourni' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const affichesDir = path.resolve(process.cwd(), 'public/medias/affiches');
      if (!fs.existsSync(affichesDir)) fs.mkdirSync(affichesDir, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileNameWebp = `affiche-${editionYear}.webp`;
      const fileNameThumb = `affiche-${editionYear}-thumb.webp`;
      const destWebp = path.join(affichesDir, fileNameWebp);
      const destThumb = path.join(affichesDir, fileNameThumb);

      await sharp(buffer)
        .resize({ width: 1400, withoutEnlargement: true })
        .webp({ quality: 88 })
        .toFile(destWebp);

      await sharp(buffer)
        .resize({ width: 480, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(destThumb);

      const posterUrl = `/medias/affiches/${fileNameWebp}`;
      
      // Mise à jour de l'affiche dans l'édition
      const edition = await getEditionByYear(editionYear);
      if (edition) {
        edition.posterUrl = posterUrl;
        await saveEdition(edition);
      }

      return new Response(JSON.stringify({ success: true, posterUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // =========================================================================
    // CAS 2 : Upload et Traitement de Photos de Galerie
    // =========================================================================
    const photographerSlug = (formData.get('photographerSlug')?.toString() || 'officiel').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const rawRace = formData.get('race')?.toString()?.trim();
    const rawMoment = formData.get('moment')?.toString()?.trim();
    const race = rawRace || 'Toutes courses';
    const moment = rawMoment || 'Moments forts';
    const caption = formData.get('caption')?.toString()?.trim() || '';
    const applyWatermark = formData.get('applyWatermark') === 'true';
    const quality = parseInt(formData.get('quality')?.toString() || '85', 10);
    const maxWidth = parseInt(formData.get('maxWidth')?.toString() || '1920', 10);

    const targetDir = path.resolve(process.cwd(), `public/medias/galeries/${editionYear}/${photographerSlug}`);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // Récupération de tous les fichiers envoyés
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if ((key === 'photos' || key === 'photo' || key === 'files' || key.startsWith('file')) && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucun fichier image trouvé' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ID de sous-galerie dérivé de la course et du moment
    const subGalleryId = `sub_${race.replace(/[^a-zA-Z0-9]/g, '_')}_${moment.replace(/[^a-zA-Z0-9]/g, '_')}`.toLowerCase();

    const processedPhotos: PhotoItem[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const baseTimestamp = Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const hdFileName = `photo_${baseTimestamp}-hd.webp`;
      const thumbFileName = `photo_${baseTimestamp}-thumb.webp`;

      const hdPath = path.join(targetDir, hdFileName);
      const thumbPath = path.join(targetDir, thumbFileName);

      // Traitement Sharp HD
      let sharpPipeline = sharp(buffer).resize({ width: maxWidth, withoutEnlargement: true });

      // Option Filigrane
      if (applyWatermark && hasWatermarkFile) {
        sharpPipeline = sharpPipeline.composite([
          {
            input: watermarkPath,
            gravity: 'southeast',
            blend: 'over'
          }
        ]);
      }

      await sharpPipeline.webp({ quality }).toFile(hdPath);

      // Traitement Sharp Vignette légère
      await sharp(buffer)
        .resize({ width: 600, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(thumbPath);

      const meta = await sharp(hdPath).metadata();

      const photoItem: PhotoItem = {
        id: `ph_${baseTimestamp}`,
        filename: file.name,
        urlHd: `/medias/galeries/${editionYear}/${photographerSlug}/${hdFileName}`,
        urlThumb: `/medias/galeries/${editionYear}/${photographerSlug}/${thumbFileName}`,
        caption: caption || (rawRace && rawMoment ? `Cliché de course - ${race} (${moment})` : rawRace ? `Cliché de course - ${race}` : rawMoment ? `Cliché de course - ${moment}` : 'Cliché officiel - Trail des Mines'),
        race,
        moment,
        width: meta.width || 1920,
        height: meta.height || 1080,
        sizeBytes: meta.size || file.size,
        uploadedAt: new Date().toISOString()
      };

      // Inscription dans la base de données
      await addPhotoToGallery(editionYear, photographerSlug, subGalleryId, photoItem);
      processedPhotos.push(photoItem);
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: processedPhotos.length,
        photos: processedPhotos
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    console.error('Erreur traitement upload:', err);
    return new Response(JSON.stringify({ error: err.message || "Erreur lors du traitement d'image" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
