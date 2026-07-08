import { getAllCards } from 'game-engine';
import { getCardArtUrl } from './cardArt';

/** Bump when new card art ships so clients re-warm the cache. */
const CACHE_VERSION = '2';

const CACHE_WARMED_KEY = `lotm-card-art-warmed-${CACHE_VERSION}`;

const BATCH_SIZE = 8;

let warmingPromise: Promise<void> | null = null;

async function fetchCardImage(cardId: string): Promise<void> {
  const url = getCardArtUrl(cardId);
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    await res.blob();
  } catch {
    // Missing art or offline — skip.
  }
}

export async function prefetchCardArt(cardIds: string[]): Promise<void> {
  const unique = [...new Set(cardIds)];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((id) => fetchCardImage(id)));
  }
}

/** Downloads all card PNGs once; later loads hit the service worker cache. */
export function warmCardArtCache(force = false): Promise<void> {
  if (warmingPromise) return warmingPromise;

  if (!force) {
    try {
      if (localStorage.getItem(CACHE_WARMED_KEY) === '1') {
        return Promise.resolve();
      }
    } catch {
      /* ignore */
    }
  }

  warmingPromise = (async () => {
    const ids = getAllCards().map((c) => c.id);
    await prefetchCardArt(ids);
    try {
      localStorage.setItem(CACHE_WARMED_KEY, '1');
    } catch {
      /* ignore */
    }
  })().finally(() => {
    warmingPromise = null;
  });

  return warmingPromise;
}
