export interface RunnerPodium {
  rank: number;
  gender: 'M' | 'F';
  name: string;
  time: string;
  speed?: string;
  club?: string;
  bib?: string;
}

export interface RaceResult {
  id: string;
  name: string;
  distance: string;
  elevation: string;
  finishersCount?: number;
  resultsPdfUrl?: string;
  chronoUrl?: string;
  podiumScratch: RunnerPodium[];
  podiumWomen: RunnerPodium[];
}

export interface PhotoItem {
  id: string;
  filename: string;
  urlHd: string;
  urlThumb: string;
  caption?: string;
  race?: string;
  moment?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  uploadedAt: string;
}

export interface SubGallery {
  id: string;
  name: string;
  race: string;
  moment: string;
  description?: string;
  photos: PhotoItem[];
}

export interface PhotographerGallery {
  id: string;
  photographerName: string;
  photographerSlug: string;
  bio?: string;
  avatarUrl?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  subGalleries: SubGallery[];
}

export interface ResultLink {
  id?: string;
  label: string;
  url: string;
}

export interface Edition {
  id: string; // ex: "2025"
  year: number;
  title: string;
  subtitle: string;
  date: string;
  description: string;
  posterUrl: string;
  stats: {
    finishers: number;
    runners?: number;
    volunteers: number;
    recordHolder?: string;
    recordTime?: string;
    weather?: string;
  };
  highlights?: string[];
  resultLinks?: ResultLink[];
  races: RaceResult[];
  galleries: PhotographerGallery[];
}
