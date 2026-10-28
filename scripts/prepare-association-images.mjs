import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const photos = {
  together: { file: 'Noé SOURY-FOCKI-selection/Noé SOURY-FOCKI/@noe_sfocki-65.jpg', author: 'Noé Soury-Focki', alt: 'Les coureurs réunis au départ du Trail des Mines, les bras levés et le sourire aux lèvres' },
  welcome: { file: 'Bermond Elodie-selection/Bermond Elodie/IMG_7438.jpg', author: 'Élodie Bermond', alt: 'Une bénévole en tee-shirt Run in Champagney accueille les coureurs avec leurs médailles' },
  trails: { file: 'Bermond Elodie-selection/Bermond Elodie/IMG_7139.jpg', author: 'Élodie Bermond', alt: 'Des coureuses et coureurs partagent un sentier ombragé dans la forêt de Champagney' },
  volunteers: { file: 'Noé SOURY-FOCKI-selection/Noé SOURY-FOCKI/@noe_sfocki-79.jpg', author: 'Noé Soury-Focki', alt: 'Des bénévoles en tee-shirts turquoise partagent un moment convivial autour d’une table' },
  organisation: { file: 'Noé SOURY-FOCKI-selection/Noé SOURY-FOCKI/@noe_sfocki-1.jpg', author: 'Noé Soury-Focki', alt: 'L’équipe bénévole prépare l’accueil et les dossards du Trail des Mines' },
};
const manifest = {};
const output = 'public/medias/association';
await fs.mkdir(output, { recursive: true });
const escapeXml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (const [key, photo] of Object.entries(photos)) {
  const source = path.join('Media sources', photo.file);
  const meta = await sharp(source).rotate().metadata();
  const widths = [...new Set([480, 800, 1200, ...(key === 'together' ? [1600, 1920] : [])].map(w => Math.min(w, meta.width)))];
  const variants = [];
  for (const width of widths) {
    const file = `${key}-${width}.webp`;
    await sharp(source).rotate().resize({ width, withoutEnlargement: true }).withXmp(`<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" dc:source="${escapeXml(source)}" dc:creator="${escapeXml(photo.author)}" /></rdf:RDF></x:xmpmeta>`).webp({ quality: 83 }).toFile(path.join(output, file));
    variants.push({ src: `/medias/association/${file}`, width });
  }
  manifest[key] = { src: variants.at(-1).src, srcset: variants.map(v => `${v.src} ${v.width}w`).join(', '), width: meta.width, height: meta.height, alt: photo.alt, author: photo.author, source };
}
await fs.writeFile('src/data/association-images.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${Object.keys(manifest).length} credited photographs from Media sources.`);
