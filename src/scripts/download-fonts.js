import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const FONTS_DIR = path.resolve('public/fonts');
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Oswald:wght@500;600;700&display=swap';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  console.log('Fetching Google Fonts stylesheet...');
  const css = await fetchText(GOOGLE_FONTS_URL);
  
  // We want to download the font files and replace URLs in the CSS with /fonts/...
  // Parse blocks:
  // e.g. /* latin */ or /* latin-ext */
  const regex = /(@font-face\s*\{[^}]+\})/g;
  let match;
  let updatedCss = '/* Polices hébergées en local pour performance optimale & respect RGPD */\n\n';
  
  const blocks = css.match(regex) || [];
  console.log(`Found ${blocks.length} font-face blocks.`);

  let count = 0;
  for (const block of blocks) {
    const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
    const weightMatch = block.match(/font-weight:\s*([0-9]+)/);
    const styleMatch = block.match(/font-style:\s*([a-z]+)/);
    const urlMatch = block.match(/url\((https:[^)]+\.woff2)\)/);
    const unicodeRangeMatch = block.match(/unicode-range:\s*([^;]+);/);

    if (familyMatch && weightMatch && urlMatch) {
      const family = familyMatch[1].trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
      const weight = weightMatch[1].trim();
      const style = styleMatch ? styleMatch[1].trim() : 'normal';
      const remoteUrl = urlMatch[1];
      
      count++;
      const filename = `${family}-${weight}-${style}-${count}.woff2`;
      const localPath = path.join(FONTS_DIR, filename);
      
      console.log(`Downloading ${remoteUrl} -> ${filename}...`);
      await downloadFile(remoteUrl, localPath);

      let localBlock = block.replace(remoteUrl, `/fonts/${filename}`);
      localBlock = localBlock.replace(/font-display:\s*[^;]+;/, 'font-display: swap;');
      updatedCss += localBlock + '\n\n';
    }
  }

  const cssPath = path.resolve('src/styles/fonts.css');
  fs.writeFileSync(cssPath, updatedCss, 'utf-8');
  console.log(`Saved fonts CSS to ${cssPath} with ${count} font files downloaded!`);
}

run().catch(console.error);
