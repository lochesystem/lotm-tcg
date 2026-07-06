import { getSupabase, isSupabaseConfigured, resetSupabaseClient, type DbDeck, type DbPlayerProgress, type DbProfile, type DbMatchHistory, type MatchMode } from '../lib/supabase';
import { createStarterDeck, getStoryWinUnlock, type Pathway } from 'game-engine';

const LOCAL_COLLECTION_KEY = 'lotm-tcg-collection';

export const DECK_SLOT_COUNT = 3;

export type OwnedCards = Record<string, number>;

export interface PlayerProgress {
  ownedCards: OwnedCards;
  winStreak: number;
  wins: number;
  losses: number;
  storyProgress: number;
}

function emptyProgress(): PlayerProgress {
  return { ownedCards: {}, winStreak: 0, wins: 0, losses: 0, storyProgress: 0 };
}

function fromDb(row: DbPlayerProgress): PlayerProgress {
  return {
    ownedCards: row.owned_cards ?? {},
    winStreak: row.win_streak ?? 0,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    storyProgress: row.story_progress ?? 0,
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
    story_progress: progress.storyProgress,
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

export async function recordStoryWinCloud(
  userId: string
): Promise<{ progress: PlayerProgress; unlockedPathway: Pathway | null }> {
  const current = await fetchProgress(userId);
  const unlockedPathway = getStoryWinUnlock(current.storyProgress);
  const progress: PlayerProgress = {
    ...current,
    storyProgress: current.storyProgress + 1,
    winStreak: current.winStreak + 1,
    wins: current.wins + 1,
  };
  await saveProgress(userId, progress);
  return { progress, unlockedPathway };
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
    matchMode: MatchMode;
    opponentLabel: string;
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
    match_mode: opts.matchMode,
    opponent_label: opts.opponentLabel,
    npc_tier: opts.npcTier ?? null,
    won: opts.won,
    is_draw: opts.isDraw ?? false,
    duration_turns: opts.durationTurns,
  });
  if (error) throw error;
}

export async function fetchMatchHistory(
  userId: string,
  limit = 5
): Promise<DbMatchHistory[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('match_history')
    .select('*')
    .eq('player_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DbMatchHistory[];
}

export async function fetchDecks(userId: string): Promise<DbDeck[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('decks')
    .select('*')
    .eq('owner_id', userId)
    .order('slot_index', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as DbDeck[];
}

export async function fetchDeckSlots(userId: string): Promise<(DbDeck | null)[]> {
  const decks = await fetchDecks(userId);
  const slots: (DbDeck | null)[] = Array(DECK_SLOT_COUNT).fill(null);

  for (const deck of decks) {
    if (deck.slot_index != null && deck.slot_index >= 0 && deck.slot_index < DECK_SLOT_COUNT) {
      slots[deck.slot_index] = deck;
    }
  }

  const unslotted = decks.filter((d) => d.slot_index == null);
  for (const deck of unslotted) {
    const free = slots.findIndex((s) => s === null);
    if (free === -1) break;
    const assigned = await assignDeckSlot(userId, deck.id, free);
    slots[free] = assigned;
  }

  return slots;
}

async function assignDeckSlot(userId: string, deckId: string, slotIndex: number): Promise<DbDeck> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');

  const { data, error } = await sb
    .from('decks')
    .update({ slot_index: slotIndex, updated_at: new Date().toISOString() })
    .eq('id', deckId)
    .eq('owner_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as DbDeck;
}

export async function fetchActiveDeck(userId: string): Promise<DbDeck | null> {
  const decks = await fetchDecks(userId);
  return decks.find((d) => d.is_active) ?? decks[0] ?? null;
}

export async function activateDeck(userId: string, deckId: string): Promise<DbDeck> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');

  await sb.from('decks').update({ is_active: false }).eq('owner_id', userId);
  const { data, error } = await sb
    .from('decks')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', deckId)
    .eq('owner_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as DbDeck;
}

export async function saveDeckToSlot(
  userId: string,
  slotIndex: number,
  deck: { id?: string; name: string; pathway: Pathway; cards: string[]; isActive?: boolean }
): Promise<DbDeck> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  if (slotIndex < 0 || slotIndex >= DECK_SLOT_COUNT) {
    throw new Error('Slot de deck inválido');
  }

  const slots = await fetchDeckSlots(userId);
  const existing = slots[slotIndex];

  if (deck.isActive) {
    await sb.from('decks').update({ is_active: false }).eq('owner_id', userId);
  }

  const deckId = deck.id ?? existing?.id;
  const row = {
    ...(deckId ? { id: deckId } : {}),
    owner_id: userId,
    name: deck.name,
    pathway: deck.pathway,
    cards: deck.cards,
    slot_index: slotIndex,
    is_active: deck.isActive ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb.from('decks').upsert(row).select().single();
  if (error) throw error;
  return data as DbDeck;
}

/** @deprecated use saveDeckToSlot */
export async function saveDeck(
  userId: string,
  deck: { id?: string; name: string; pathway: Pathway; cards: string[]; isActive?: boolean; slotIndex?: number }
): Promise<DbDeck> {
  const slotIndex = deck.slotIndex ?? 0;
  return saveDeckToSlot(userId, slotIndex, deck);
}

export async function ensureDeckSlots(userId: string, pathway: Pathway): Promise<(DbDeck | null)[]> {
  const slots = await fetchDeckSlots(userId);
  const hasAny = slots.some((s) => s !== null);
  if (hasAny) return slots;

  const starter = createStarterDeck(pathway);
  const deck = await saveDeckToSlot(userId, 0, {
    name: 'Starter Deck',
    pathway,
    cards: [...starter.cards],
    isActive: true,
  });
  slots[0] = deck;
  return slots;
}

export async function ensureStarterDeck(userId: string, pathway: Pathway): Promise<DbDeck> {
  const slots = await ensureDeckSlots(userId, pathway);
  const active = slots.find((d) => d?.is_active && d.cards.length === 30);
  if (active) return active;

  const firstComplete = slots.find((d) => d && d.cards.length === 30);
  if (firstComplete) {
    return activateDeck(userId, firstComplete.id);
  }

  const fallback = slots.find((d) => d !== null);
  if (fallback) return fallback;

  const starter = createStarterDeck(pathway);
  return saveDeckToSlot(userId, 0, {
    name: 'Starter Deck',
    pathway,
    cards: [...starter.cards],
    isActive: true,
  });
}

export { isSupabaseConfigured, clearLegacyLocalCollection, readLegacyLocalCollection };
