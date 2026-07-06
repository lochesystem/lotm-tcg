import type { Pathway } from 'game-engine';

const BATTLEFIELD_PATHWAYS = new Set<Pathway>([
  'fool',
  'red-priest',
  'tyrant',
  'sun',
  'door',
  'demoness',
]);

export function getBattlefieldUrl(pathway: Pathway | null | undefined): string | null {
  if (!pathway || !BATTLEFIELD_PATHWAYS.has(pathway)) return null;
  const base = import.meta.env.BASE_URL;
  return `${base}battlefields/${pathway}.png`;
}

/** Optional looping MP4 alongside the PNG poster (same basename). */
export function getBattlefieldVideoUrl(pathway: Pathway | null | undefined): string | null {
  if (!pathway || !BATTLEFIELD_PATHWAYS.has(pathway)) return null;
  const base = import.meta.env.BASE_URL;
  return `${base}battlefields/${pathway}.mp4`;
}
