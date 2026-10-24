/** Pages conservées dans le code pour une prochaine version, hors MVP public. */
export const deferredMvpPaths = [
  '/inscription',
  '/parcours',
  '/galibots',
  '/terrils',
  '/gueules-noires',
  '/autres',
  '/infos-pratiques',
  '/association',
  '/benevoles',
  '/eco-engagement',
  '/dossard-solidaire',
  '/presse',
  '/preparer-mon-trail',
] as const;

export function isDeferredMvpPath(pathname: string): boolean {
  let decodedPath = pathname;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    // Une URL mal encodée reste traitée normalement par Astro.
  }
  const normalizedPath = decodedPath.replace(/\/+$/, '') || '/';
  return deferredMvpPaths.some(path => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
}
