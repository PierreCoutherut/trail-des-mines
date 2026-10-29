import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Preserve the source files; publish appropriately sized WebP variants.
const outputDir = 'public/medias/responsive';
await fs.mkdir(outputDir, { recursive: true });
const manifest = { heroes: {}, logos: {} };

async function variants(source, name, widths, { trim = false, quality = 82 } = {}) {
  const image = sharp(source).rotate();
  if (trim) image.trim({ background: '#ffffff', threshold: 12 });
  const { data, info } = await image.toBuffer({ resolveWithObject: true });
  const candidates = [...new Set(widths.map(width => Math.min(width, info.width)))];
  const files = [];
  for (const width of candidates) {
    const file = `${name}-${width}.webp`;
    const result = await sharp(data).resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(path.join(outputDir, file));
    files.push({ src: `/medias/responsive/${file}`, width: result.width });
  }
  return {
    src: files[files.length - 1].src,
    srcset: files.map(file => `${file.src} ${file.width}w`).join(', '),
    width: info.width,
    height: info.height,
    shape: info.width / info.height > 1.65 ? 'wide' : info.width / info.height < .85 ? 'portrait' : 'square',
  };
}

manifest.heroes.partners = await variants('public/medias/Index/Pierre-Coutherut_TDM-2024-233.jpg', 'partners-hero', [640, 960, 1440, 1920], { quality: 80 });
manifest.heroes.home = await variants('public/medias/Index/Elodie-Bermond_bg.webp', 'home-hero', [640, 960, 1440, 1920], { quality: 80 });
for (const file of (await fs.readdir('public/medias/Sponsors')).filter(file => /\.(png|jpe?g)$/i.test(file))) {
  const name = file === 'Sponsor.png' ? 'credit-mutuel'
    : /^Sponsor \(\d+\)\.jpg$/i.test(file) ? `sponsor-${file.match(/\d+/)[0]}`
    : path.parse(file).name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  manifest.logos[file] = await variants(path.join('public/medias/Sponsors', file), name, [160, 320, 480], { trim: true, quality: 88 });
}
await fs.writeFile('src/data/responsive-images.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${Object.keys(manifest.heroes).length} responsive photos and ${Object.keys(manifest.logos).length} logos.`);
