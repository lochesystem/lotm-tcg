import { getSupabase, isSupabaseConfigured, resetSupabaseClient, type DbDeck, type DbPlayerProgress, type DbProfile } from '../lib/supabase';
import { createStarterDeck, type Pathway } from 'game-engine';

const LOCAL_COLLECTION_KEY = 'lotm-tcg-collection';

export type OwnedCards = Record<string, number>;

export interface PlayerProgress {
  ownedCards: OwnedCards;
  winStreak: number;
  wins: number;
  losses: number;
}

function emptyProgress(): PlayerProgress {
  return { ownedCards: {}, winStreak: 0, wins: 0, losses: 0 };
}

function fromDb(row: DbPlayerProgress): PlayerProgress {
  return {
    ownedCards: row.owned_cards ?? {},
    winStreak: row.win_streak ?? 0,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
  };
}

function mergeOwnedCards(a: OwnedCards, b: OwnedCards): OwnedCards {
  const merged = { ...a };
  for (const [id, qty] of Object.entries(b)) {
    merged[id] = (merged[id] ?? 0) + qty;
  }
  return merged;
}

function readLegacyLocalCollection(): { ownedCards: OwnedCards; winStreak: number } | null {
  try {
    const raw = localStorage.getItem(LOCAL_COLLECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { ownedCardIds?: OwnedCards; winStreak?: number } };
    const ownedCards = parsed.state?.ownedCardIds;
    if (!ownedCards || Object.keys(ownedCards).length === 0) return null;
    return { ownedCards, winStreak: parsed.state?.winStreak ?? 0 };
  } catch {
    return null;
  }
}

function clearLegacyLocalCollection(): void {
  try {
    localStorage.removeItem(LOCAL_COLLECTION_KEY);
  } catch { /* ignore */ }
}

export async function fetchProfile(userId: string): Promise<DbProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePreferredPathway(userId: string, pathway: Pathway): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('profiles').update({ preferred_pathway: pathway }).eq('id', userId);
  if (error) throw error;
}

export async function fetchProgress(userId: string): Promise<PlayerProgress> {
  const sb = getSupabase();
  if (!sb) return emptyProgress();

  const { data, error } = await sb.from('player_progress').select('*').eq('owner_id', userId).maybeSingle();
  if (error) throw error;

  if (!data) {
    const legacy = readLegacyLocalCollection();
    const progress = legacy
      ? { ...emptyProgress(), ownedCards: legacy.ownedCards, winStreak: legacy.winStreak }
      : emptyProgress();
    await saveProgress(userId, progress);
    if (legacy) clearLegacyLocalCollection();
    return progress;
  }

  const progress = fromDb(data as DbPlayerProgress);
  const isEmpty = Object.keys(progress.ownedCards).length === 0;
  const legacy = isEmpty ? readLegacyLocalCollection() : null;

  if (legacy) {
    const merged: PlayerProgress = {
      ...progress,
      ownedCards: mergeOwnedCards(progress.ownedCards, legacy.ownedCards),
      winStreak: Math.max(progress.winStreak, legacy.winStreak),
    };
    await saveProgress(userId, merged);
    clearLegacyLocalCollection();
    return merged;
  }

  return progress;
}

export async function saveProgress(userId: string, progress: PlayerProgress): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const row = {
    owner_id: userId,
    owned_cards: progress.ownedCards,
    win_streak: progress.winStreak,
    wins: progress.wins,
    losses: progress.losses,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from('player_progress').upsert(row, { onConflict: 'owner_id' });
  if (error) throw error;
}

export async function addCardsToCloud(userId: string, cardIds: string[]): Promise<PlayerProgress> {
  const current = await fetchProgress(userId);
  const ownedCards = { ...current.ownedCards };
  for (const id of cardIds) {
    ownedCards[id] = (ownedCards[id] ?? 0) + 1;
  }
  const next = { ...current, ownedCards };
  await saveProgress(userId, next);
  return next;
}

export async function recordNpcWinCloud(userId: string): Promise<PlayerProgress> {
  const current = await fetchProgress(userId);
  const next: PlayerProgress = {
    ...current,
    winStreak: current.winStreak + 1,
    wins: current.wins + 1,
  };
  await saveProgress(userId, next);
  return next;
}

export async function recordNpcLossCloud(userId: string): Promise<PlayerProgress> {
  const current = await fetchProgress(userId);
  const next: PlayerProgress = {
    ...current,
    winStreak: 0,
    losses: current.losses + 1,
  };
  await saveProgress(userId, next);
  return next;
}

export async function recordMatch(
  userId: string,
  opts: {
    opponentType: 'npc' | 'pvp';
    npcTier?: number;
    won: boolean;
    isDraw?: boolean;
    durationTurns: number;
  }
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from('match_history').insert({
    player_id: userId,
    opponent_type: opts.opponentType,
    npc_tier: opts.npcTier ?? null,
    won: opts.won,
    is_draw: opts.isDraw ?? false,
    duration_turns: opts.durationTurns,
  });
  if (error) throw error;
}

export async function fetchDecks(userId: string): Promise<DbDeck[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb.from('decks').select('*').eq('owner_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbDeck[];
}

export async function fetchActiveDeck(userId: string): Promise<DbDeck | null> {
  const decks = await fetchDecks(userId);
  return decks.find((d) => d.is_active) ?? decks[0] ?? null;
}

export async function saveDeck(
  userId: string,
  deck: { id?: string; name: string; pathway: Pathway; cards: string[]; isActive?: boolean }
): Promise<DbDeck> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');

  if (deck.isActive) {
    await sb.from('decks').update({ is_active: false }).eq('owner_id', userId);
  }

  const row = {
    ...(deck.id ? { id: deck.id } : {}),
    owner_id: userId,
    name: deck.name,
    pathway: deck.pathway,
    cards: deck.cards,
    is_active: deck.isActive ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb.from('decks').upsert(row).select().single();
  if (error) throw error;
  return data as DbDeck;
}

export async function ensureStarterDeck(userId: string, pathway: Pathway): Promise<DbDeck> {
  const existing = await fetchActiveDeck(userId);
  if (existing && existing.cards.length === 30) return existing;

  const starter = createStarterDeck(pathway);
  return saveDeck(userId, {
    name: 'Starter Deck',
    pathway,
    cards: [...starter.cards],
    isActive: true,
  });
}

export { isSupabaseConfigured, clearLegacyLocalCollection, readLegacyLocalCollection };
