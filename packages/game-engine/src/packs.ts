import { Card, Rarity } from './types.js';
import { getAllCards } from './cards/index.js';

export type PackType = 'ordinary' | 'beyonder' | 'sealed';

export interface PackResult {
  packType: PackType;
  cards: Card[];
}

const RARITY_WEIGHTS: Record<PackType, Record<Rarity, number>> = {
  ordinary: { common: 60, rare: 30, epic: 8, legendary: 2 },
  beyonder: { common: 30, rare: 40, epic: 25, legendary: 5 },
  sealed: { common: 10, rare: 30, epic: 40, legendary: 20 },
};

const PACK_SIZES: Record<PackType, number> = {
  ordinary: 3,
  beyonder: 5,
  sealed: 5,
};

const GUARANTEED_RARITY: Record<PackType, Rarity> = {
  ordinary: 'rare',
  beyonder: 'epic',
  sealed: 'legendary',
};

export function getPackTypeForReward(npcTier: number, winStreak: number): PackType {
  if (npcTier >= 5 || winStreak >= 5) return 'sealed';
  if (npcTier >= 3 || winStreak >= 3) return 'beyonder';
  return 'ordinary';
}

export function openPack(packType: PackType, seed?: number): PackResult {
  const rng = seed ? mulberry32(seed) : () => Math.random();
  const allCards = getAllCards();
  const size = PACK_SIZES[packType];
  const weights = RARITY_WEIGHTS[packType];
  const guaranteed = GUARANTEED_RARITY[packType];

  const cards: Card[] = [];

  // First card: guaranteed minimum rarity
  const guaranteedPool = allCards.filter((c) => rarityValue(c.rarity) >= rarityValue(guaranteed));
  if (guaranteedPool.length > 0) {
    cards.push(guaranteedPool[Math.floor(rng() * guaranteedPool.length)]);
  }

  // Remaining cards: weighted random
  while (cards.length < size) {
    const rarity = rollRarity(weights, rng);
    const pool = allCards.filter((c) => c.rarity === rarity);
    if (pool.length > 0) {
      cards.push(pool[Math.floor(rng() * pool.length)]);
    }
  }

  return { packType, cards };
}

function rollRarity(weights: Record<Rarity, number>, rng: () => number): Rarity {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = rng() * total;

  for (const [rarity, weight] of Object.entries(weights) as [Rarity, number][]) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'common';
}

function rarityValue(rarity: Rarity): number {
  switch (rarity) {
    case 'common': return 0;
    case 'rare': return 1;
    case 'epic': return 2;
    case 'legendary': return 3;
  }
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
