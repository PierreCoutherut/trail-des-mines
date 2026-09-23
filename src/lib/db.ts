import fs from 'node:fs';
import path from 'node:path';
import type { Edition, PhotographerGallery, PhotoItem, RaceResult, SubGallery } from './types';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const EDITIONS_FILE = path.join(DATA_DIR, 'editions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Lecture synchrone pour les pages Astro SSG / SSR
export function getAllEditionsSync(): Edition[] {
  ensureDataDir();
  if (!fs.existsSync(EDITIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(EDITIONS_FILE, 'utf-8');
    const editions: Edition[] = JSON.parse(raw);
    return editions.sort((a, b) => b.year - a.year);
  } catch (err) {
    console.error('Erreur lecture editions.json:', err);
    return [];
  }
}

export function getEditionByYearSync(year: number | string): Edition | null {
  const editions = getAllEditionsSync();
  const y = typeof year === 'string' ? parseInt(year, 10) : year;
  return editions.find(e => e.year === y) || null;
}

export async function getAllEditions(): Promise<Edition[]> {
  return getAllEditionsSync();
}

export async function getEditionByYear(year: number | string): Promise<Edition | null> {
  return getEditionByYearSync(year);
}

export async function saveEdition(editionData: Partial<Edition> & { year: number }): Promise<Edition> {
  ensureDataDir();
  const editions = getAllEditionsSync();
  const index = editions.findIndex(e => e.year === Number(editionData.year) || (editionData.id && e.id === editionData.id));

  let updated: Edition;
  if (index >= 0) {
    // Mise à jour sécurisée avec fusion profonde des statistiques
    const existing = editions[index];
    updated = {
      ...existing,
      ...editionData,
      id: editionData.id || existing.id,
      year: Number(editionData.year),
      title: editionData.title || existing.title,
      subtitle: editionData.subtitle || existing.subtitle,
      date: editionData.date || existing.date,
      description: editionData.description !== undefined ? editionData.description : existing.description,
      posterUrl: editionData.posterUrl || existing.posterUrl,
      stats: {
        ...existing.stats,
        ...(editionData.stats || {})
      },
      highlights: editionData.highlights !== undefined ? editionData.highlights : (existing.highlights || []),
      resultLinks: editionData.resultLinks !== undefined ? editionData.resultLinks : (existing.resultLinks || []),
      races: editionData.races !== undefined ? editionData.races : existing.races,
      galleries: editionData.galleries !== undefined ? editionData.galleries : existing.galleries
    };
    editions[index] = updated;
  } else {
    // Création
    updated = {
      id: editionData.id || String(editionData.year),
      year: Number(editionData.year),
      title: editionData.title || `Édition ${editionData.year}`,
      subtitle: editionData.subtitle || `${editionData.year} • Trail des Mines`,
      date: editionData.date || `Mai ${editionData.year}`,
      description: editionData.description || '',
      posterUrl: editionData.posterUrl || `/medias/affiches/affiche-${editionData.year}.webp`,
      stats: {
        finishers: 0,
        volunteers: 0,
        ...(editionData.stats || {})
      },
      highlights: editionData.highlights || [],
      resultLinks: editionData.resultLinks || [],
      races: editionData.races || [],
      galleries: editionData.galleries || []
    };
    editions.push(updated);
  }

  // Tri par année décroissante
  editions.sort((a, b) => b.year - a.year);
  fs.writeFileSync(EDITIONS_FILE, JSON.stringify(editions, null, 2), 'utf-8');
  return updated;
}

export async function saveResultLinks(editionYear: number | string, links: { id?: string; label: string; url: string }[]): Promise<{ success: boolean; error?: string }> {
  ensureDataDir();
  const editions = getAllEditionsSync();
  const y = Number(editionYear);
  const edition = editions.find(e => e.year === y);
  if (!edition) return { success: false, error: 'Édition introuvable' };

  edition.resultLinks = links.map(l => ({
    id: l.id || `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    label: l.label.trim(),
    url: l.url.trim()
  })).filter(l => l.label && l.url);

  fs.writeFileSync(EDITIONS_FILE, JSON.stringify(editions, null, 2), 'utf-8');
  return { success: true };
}

export async function saveRace(editionYear: number | string, raceData: RaceResult): Promise<{ success: boolean; race?: RaceResult; error?: string }> {
  ensureDataDir();
  const editions = getAllEditionsSync();
  const y = Number(editionYear);
  const edition = editions.find(e => e.year === y);
  if (!edition) return { success: false, error: 'Édition introuvable' };

  if (!raceData.id) {
    const slug = raceData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    raceData.id = `${slug}-${y}`;
  }

  // S'assurer que les tableaux podiums existent
  if (!raceData.podiumScratch) raceData.podiumScratch = [];
  if (!raceData.podiumWomen) raceData.podiumWomen = [];

  const rIdx = edition.races.findIndex(r => r.id === raceData.id);
  if (rIdx >= 0) {
    edition.races[rIdx] = {
      ...edition.races[rIdx],
      ...raceData
    };
  } else {
    edition.races.push(raceData);
  }

  fs.writeFileSync(EDITIONS_FILE, JSON.stringify(editions, null, 2), 'utf-8');
  return { success: true, race: raceData };
}

export async function deleteRace(editionYear: number | string, raceId: string): Promise<boolean> {
  ensureDataDir();
  const editions = getAllEditionsSync();
  const y = Number(editionYear);
  const edition = editions.find(e => e.year === y);
  if (!edition) return false;

  const initialLen = edition.races.length;
  edition.races = edition.races.filter(r => r.id !== raceId);
  if (edition.races.length !== initialLen) {
    fs.writeFileSync(EDITIONS_FILE, JSON.stringify(editions, null, 2), 'utf-8');
    return true;
  }
  return false;
}

export async function deleteEdition(yearOrId: string | number): Promise<boolean> {
  ensureDataDir();
  const editions = getAllEditionsSync();
  const initialLength = editions.length;
  const filtered = editions.filter(e => e.id !== String(yearOrId) && e.year !== Number(yearOrId));
  
  if (filtered.length !== initialLength) {
    fs.writeFileSync(EDITIONS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  }
  return false;
}

export async function getPhotographerGallery(editionYear: number | string, photographerSlug: string): Promise<{ edition: Edition; gallery: PhotographerGallery } | null> {
  const edition = getEditionByYearSync(editionYear);
  if (!edition) return null;
  const gallery = edition.galleries.find(g => g.photographerSlug === photographerSlug || g.id === photographerSlug);
  if (!gallery) return null;
  return { edition, gallery };
}

export async function savePhotographerGallery(editionYear: number | string, galleryData: PhotographerGallery): Promise<boolean> {
  const editions = getAllEditionsSync();
  const y = Number(editionYear);
  const edition = editions.find(e => e.year === y);
  if (!edition) return false;

  const gIdx = edition.galleries.findIndex(g => g.photographerSlug === galleryData.photographerSlug || g.id === galleryData.id);
  if (gIdx >= 0) {
    edition.galleries[gIdx] = galleryData;
  } else {
    edition.galleries.push(galleryData);
  }

  fs.writeFileSync(EDITIONS_FILE, JSON.stringify(editions, null, 2), 'utf-8');
  return true;
}

export async function addPhotoToGallery(
  editionYear: number | string,
  photographerSlug: string,
  subGalleryId: string,
  photo: PhotoItem
): Promise<boolean> {
  const editions = getAllEditionsSync();
  const y = Number(editionYear);
  const edition = editions.find(e => e.year === y);
  if (!edition) return false;

  let gallery = edition.galleries.find(g => g.photographerSlug === photographerSlug || g.id === photographerSlug);
  if (!gallery) {
    // Création automatique de la galerie pour ce photographe s'il n'existe pas encore
    const niceName = photographerSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    gallery = {
      id: `${photographerSlug}-${y}`,
      photographerName: niceName,
      photographerSlug: photographerSlug,
      bio: `Photographe officiel de l'édition ${y}`,
      subGalleries: []
    };
    edition.galleries.push(gallery);
  }

  let sub = gallery.subGalleries.find(s => s.id === subGalleryId);
  if (!sub) {
    // Création automatique de la sous-galerie
    sub = {
      id: subGalleryId,
      name: photo.moment || photo.race || 'Clichés de course',
      race: photo.race || 'Toutes courses',
      moment: photo.moment || 'Moments forts',
      photos: []
    };
    gallery.subGalleries.push(sub);
  }

  sub.photos.unshift(photo); // Ajoute en tête
  fs.writeFileSync(EDITIONS_FILE, JSON.stringify(editions, null, 2), 'utf-8');
  return true;
}
