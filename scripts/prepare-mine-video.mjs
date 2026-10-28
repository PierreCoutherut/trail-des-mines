import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const source = 'Media sources/parcoursEffetDesktop.mp4';
const directory = 'public/medias/mine';
await fs.mkdir(directory, { recursive: true });
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,duration,avg_frame_rate,nb_frames', '-of', 'json', source], { encoding: 'utf8' }));
const stream = probe.streams[0];
const [numerator, denominator] = stream.avg_frame_rate.split('/').map(Number);
const frameRate = numerator / denominator;
const duration = Number(stream.duration);
const lastFrame = (Number(stream.nb_frames) - 1) / frameRate;
const file = 'parcoursEffetDesktop.mp4';
// Serve the exact original bytes on every screen. Never re-encode or resize this video.
await fs.copyFile(source, path.join(directory, file));
const sourceBytes = await fs.readFile(source);
const publishedBytes = await fs.readFile(path.join(directory, file));
if (!sourceBytes.equals(publishedBytes)) throw new Error('Published video must match its original exactly.');
const sha256 = createHash('sha256').update(sourceBytes).digest('hex');
const version = sha256.slice(0, 12);
const manifest = { source, src: `/medias/mine/${file}?v=${version}`, duration, frameRate, lastFrame, width: stream.width, height: stream.height, bytes: sourceBytes.length, sha256, startPoster: `/medias/mine/parcours-start.png?v=${version}` };
// Only the still poster is extracted, losslessly; the MP4 itself is copied unchanged.
const frame = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', source, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], { maxBuffer: 12 * 1024 * 1024 });
await fs.writeFile(path.join(directory, 'parcours-start.png'), frame);
await fs.writeFile('src/data/mine-video.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
