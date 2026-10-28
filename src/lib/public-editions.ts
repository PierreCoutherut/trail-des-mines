import { getAllEditionsSync } from './db';

// Public archives currently cover these two editions. Keep historical data in the back office.
export const isPublicEdition = (year: unknown): boolean => year === 2026 || year === 2025 || year === '2026' || year === '2025';

export const getPublicEditionsSync = () => getAllEditionsSync().filter(edition => isPublicEdition(edition.year));
