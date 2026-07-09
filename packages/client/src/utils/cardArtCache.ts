import { getAllCards } from 'game-engine';
import { getCardArtUrl } from './cardArt';

/** Bump when cache strategy changes so clients re-warm memory. */
const CACHE_VERSION = '4';

const CACHE_WARMED_KEY = `lotm-card-art-warmed-${CACHE_VERSION}`;
const MIN_MEMORY_ENTRIES_TO_SKIP = 40;

const BATCH_SIZE = 16;

const memoryUrls = new Map<string, string>();
const missingArt = new Set<string>();

let warmingPromise: Promise<void> | null = null;

const CARD_ID_FROM_URL = /\/cards\/([^/?#]+)\.png/i;

function extractCardId(url: string): string | null {
  const match = url.match(CARD_ID_FROM_URL);
  return match?.[1] ?? null;
}

export function getMemoryCachedCardArtUrl(cardId: string): string | null {
  return memoryUrls.get(cardId) ?? null;
}

function storeBlob(cardId: string, blob: Blob): string {
  const existing = memoryUrls.get(cardId);
  if (existing) return existing;

  const objectUrl = URL.createObjectURL(blob);
  memoryUrls.set(cardId, objectUrl);
  missingArt.delete(cardId);
  return objectUrl;
}

async function matchCachedResponse(url: string): Promise<Response | undefined> {
  if (typeof caches === 'undefined') return undefined;

  const candidates = [url];
  try {
    candidates.push(new URL(url, window.location.origin).href);
  } catch {
    /* ignore */
  }

  const base = import.meta.env.BASE_URL;
  if (base && url.startsWith(base)) {
    candidates.push(url.slice(base.length));
  }

  for (const candidate of candidates) {
    const hit = await caches.match(candidate);
    if (hit) return hit;
  }

  return undefined;
}

async function cacheCardInMemory(cardId: string): Promise<string | null> {
  if (memoryUrls.has(cardId)) return memoryUrls.get(cardId)!;
  if (missingArt.has(cardId)) return null;

  const url = getCardArtUrl(cardId);
  const cached = await matchCachedResponse(url);
  if (cached?.ok) {
    return storeBlob(cardId, await cached.blob());
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      missingArt.add(cardId);
      return null;
    }
    return storeBlob(cardId, await res.blob());
  } catch {
    missingArt.add(cardId);
    return null;
  }
}

export function ensureCardArtInMemory(cardId: string): Promise<string | null> {
  if (memoryUrls.has(cardId)) return Promise.resolve(memoryUrls.get(cardId)!);
  if (missingArt.has(cardId)) return Promise.resolve(null);
  return cacheCardInMemory(cardId);
}

export async function prefetchCardArt(cardIds: string[]): Promise<void> {
  const unique = [...new Set(cardIds)].filter((id) => !memoryUrls.has(id) && !missingArt.has(id));

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((id) => cacheCardInMemory(id)));
  }
}

async function waitForServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.ready;
  } catch {
    /* ignore */
  }
}

async function warmMemoryFromCacheStorage(): Promise<number> {
  if (typeof caches === 'undefined') return 0;

  let loaded = 0;
  const names = await caches.keys();

  for (const name of names) {
    const cache = await caches.open(name);
    const requests = await cache.keys();

    await Promise.all(
      requests.map(async (request) => {
        const cardId = extractCardId(request.url);
        if (!cardId || memoryUrls.has(cardId)) return;

        const response = await cache.match(request);
        if (!response?.ok) return;

        storeBlob(cardId, await response.blob());
        loaded += 1;
      })
    );
  }

  return loaded;
}

/** Hydrates in-memory blobs from SW/precache, then fetches any stragglers. */
export function warmCardArtCache(force = false): Promise<void> {
  if (warmingPromise) return warmingPromise;

  if (!force) {
    try {
      const markedWarm = localStorage.getItem(CACHE_WARMED_KEY) === '1';
      if (markedWarm && memoryUrls.size >= MIN_MEMORY_ENTRIES_TO_SKIP) {
        return Promise.resolve();
      }
    } catch {
      /* ignore */
    }
  }

  warmingPromise = (async () => {
    await waitForServiceWorker();
    const fromCaches = await warmMemoryFromCacheStorage();

    if (fromCaches < MIN_MEMORY_ENTRIES_TO_SKIP) {
      const ids = getAllCards().map((c) => c.id);
      await prefetchCardArt(ids);
    }

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

export function resolveCardArtUrl(cardId: string): string {
  return getMemoryCachedCardArtUrl(cardId) ?? getCardArtUrl(cardId);
}
