import type { Card, Pathway, Rarity } from '../types.js';
import { getAllCards, getCardsForPathway } from '../cards/index.js';
import { mulberry32, pickRandom, shuffleWithRng } from './rng.js';
import type { RelicId } from './types.js';
import { ALL_RELIC_IDS } from './relics.js';

function rarityValue(rarity: Rarity): number {
  switch (rarity) {
    case 'common': return 0;
    case 'rare': return 1;
    case 'epic': return 2;
    case 'legendary': return 3;
  }
}

function minRarityForFloor(floor: number): Rarity {
  if (floor >= 10) return 'epic';
  if (floor >= 6) return 'rare';
  return 'common';
}

export function generateCardOffers(
  pathway: Pathway,
  floor: number,
  ownedCardIds: string[],
  seed: number,
  count = 3
): Card[] {
  const rng = mulberry32(seed);
  const minRarity = minRarityForFloor(floor);
  const minVal = rarityValue(minRarity);

  const pathwayPool = getCardsForPathway(pathway).filter((c) => rarityValue(c.rarity) >= minVal);
  const neutralPool = getCardsForPathway('neutral').filter((c) => rarityValue(c.rarity) >= minVal);
  const pool: Card[] = [];

  for (let i = 0; i < 8; i++) {
    pool.push(pickRandom(pathwayPool.length > 0 ? pathwayPool : getAllCards(), rng));
  }
  for (let i = 0; i < 4; i++) {
    if (neutralPool.length > 0) pool.push(pickRandom(neutralPool, rng));
  }

  const counts = new Map<string, number>();
  for (const id of ownedCardIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const valid = pool.filter((c) => {
    const max = c.rarity === 'legendary' ? 1 : 2;
    return (counts.get(c.id) ?? 0) < max;
  });

  const unique: Card[] = [];
  const seen = new Set<string>();
  for (const card of shuffleWithRng(valid.length > 0 ? valid : pool, rng)) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    unique.push(card);
    if (unique.length >= count) break;
  }

  return unique;
}

export function generateRelicOffers(
  ownedRelics: RelicId[],
  seed: number,
  count = 3
): RelicId[] {
  const rng = mulberry32(seed);
  const available = ALL_RELIC_IDS.filter((id) => !ownedRelics.includes(id));
  const pool = available.length > 0 ? available : ALL_RELIC_IDS;
  const shuffled = shuffleWithRng(pool, rng);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function canAddCard(deck: string[], cardId: string): boolean {
  const card = getAllCards().find((c) => c.id === cardId);
  if (!card) return false;
  const count = deck.filter((id) => id === cardId).length;
  const max = card.rarity === 'legendary' ? 1 : 2;
  return count < max;
}

export function swapCardInDeck(deck: string[], addId: string, removeId: string): string[] {
  const idx = deck.indexOf(removeId);
  if (idx === -1) return deck;
  const next = [...deck];
  next[idx] = addId;
  return next;
}

export function removeCardFromDeck(deck: string[], cardId: string): string[] {
  const idx = deck.indexOf(cardId);
  if (idx === -1) return deck;
  const next = [...deck];
  next.splice(idx, 1);
  return next;
}

export function addCardToDeckWithSwap(deck: string[], addId: string, removeId: string): string[] {
  return swapCardInDeck(deck, addId, removeId);
}
