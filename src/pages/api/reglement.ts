export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import { getReglementSync, saveReglement, parsePdfTextToChapters } from '../../lib/reglement';
import { verifyToken } from '../../lib/auth';

function getAuthenticatedUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/tdm_admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const check = verifyToken(token);
  return check.valid ? check.user : null;
}

export const GET: APIRoute = async () => {
  const reglement = getReglementSync();
  return new Response(JSON.stringify({ reglement }), {
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

  const contentType = request.headers.get('content-type') || '';

  try {
    // Cas 1 : Téléversement du fichier PDF (FormData)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const autoParse = formData.get('autoParse') !== 'false';

      if (!file) {
        return new Response(JSON.stringify({ error: 'Aucun fichier PDF fourni' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const mediaDir = path.resolve(process.cwd(), 'public/medias');
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }

      const targetPath = path.join(mediaDir, 'reglement.pdf');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Écriture du fichier sur le disque
      fs.writeFileSync(targetPath, buffer);

      let extractedChapters = null;
      if (autoParse) {
        try {
          const parser = new PDFParse({ data: buffer, verbosity: 0 });
          const textResult = await parser.getText();
          if (textResult && textResult.text) {
            extractedChapters = parsePdfTextToChapters(textResult.text);
          }
        } catch (parseErr) {
          console.error('Erreur extraction texte PDF:', parseErr);
        }
      }

      const updated = saveReglement({
        pdfUrl: '/medias/reglement.pdf',
        pdfFilename: file.name || 'reglement.pdf',
        pdfSizeBytes: file.size,
        lastUpdated: new Date().toISOString(),
        ...(extractedChapters && extractedChapters.length > 0 ? { chapters: extractedChapters } : {})
      });

      return new Response(
        JSON.stringify({
          success: true,
          count: extractedChapters ? extractedChapters.length : updated.chapters.length,
          chapters: updated.chapters,
          reglement: updated
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Cas 2 : Modification manuelle / JSON des chapitres
    const body = await request.json();
    const updated = saveReglement(body);

    return new Response(JSON.stringify({ success: true, reglement: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Erreur API reglement:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
