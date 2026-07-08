import type { Deck, Pathway } from '../types.js';
import { createStarterDeck } from '../deck.js';
import { getCardById, getCardsForPathway } from '../cards/index.js';
import { STORY_BOSS_ORDER } from '../story.js';
import { mulberry32, pickRandom } from './rng.js';
import type { OpponentInfo } from './types.js';

export interface NpcProfile {
  name: string;
  pathway: Pathway;
  tier: number;
}

export const NPC_PROFILES: NpcProfile[] = [
  { name: 'Street Mystic', pathway: 'fool', tier: 1 },
  { name: 'Dock Preacher', pathway: 'red-priest', tier: 1 },
  { name: 'Harvest Church Acolyte', pathway: 'sun', tier: 1 },
  { name: 'Storm Sailor', pathway: 'tyrant', tier: 2 },
  { name: 'Night Witch', pathway: 'demoness', tier: 2 },
  { name: 'Wandering Magician', pathway: 'door', tier: 2 },
  { name: 'Sequence 7 Seer', pathway: 'fool', tier: 3 },
  { name: 'Crimson Zealot', pathway: 'red-priest', tier: 3 },
  { name: 'Thunder Lord', pathway: 'tyrant', tier: 4 },
  { name: 'Abyss Walker', pathway: 'demoness', tier: 4 },
  { name: 'Angel of the Church', pathway: 'sun', tier: 5 },
  { name: 'Planar Sovereign', pathway: 'door', tier: 5 },
];

function rarityRank(rarity: string): number {
  switch (rarity) {
    case 'common': return 0;
    case 'rare': return 1;
    case 'epic': return 2;
    case 'legendary': return 3;
    default: return 0;
  }
}

function replaceCards(
  deck: Deck,
  pathway: Pathway,
  minRarity: 'rare' | 'epic' | 'legendary',
  count: number,
  rng: () => number
): Deck {
  const cards = [...deck.cards];
  const pool = getCardsForPathway(pathway).filter(
    (c) => rarityRank(c.rarity) >= rarityRank(minRarity)
  );
  if (pool.length === 0) return deck;

  const indices = cards
    .map((id, i) => ({ id, i }))
    .filter(({ id }) => {
      const c = getCardById(id);
      return c && rarityRank(c.rarity) < rarityRank(minRarity);
    })
    .sort(() => rng() - 0.5)
    .slice(0, count);

  for (const { i } of indices) {
    const replacement = pickRandom(pool, rng);
    cards[i] = replacement.id;
  }

  return { pathway: deck.pathway, cards };
}

export function getTierForFloor(floor: number, ascension = 0): number {
  const base = Math.min(5, 1 + Math.floor((floor - 1) / 3));
  return Math.min(5, base + Math.floor(ascension / 3));
}

export function buildScaledDeck(
  pathway: Pathway,
  floor: number,
  isElite: boolean,
  isBoss: boolean,
  ascension = 0,
  rng: () => number
): Deck {
  let deck = createStarterDeck(pathway);

  if (isBoss) {
    deck = replaceCards(deck, pathway, 'rare', 8, rng);
    deck = replaceCards(deck, pathway, 'epic', 6, rng);
    deck = replaceCards(deck, pathway, 'legendary', 3, rng);
    return deck;
  }

  const tier = getTierForFloor(floor, ascension);
  const eliteBonus = isElite ? 1 : 0;

  if (tier >= 2 || eliteBonus) {
    deck = replaceCards(deck, pathway, 'rare', 4 + eliteBonus * 2, rng);
  }
  if (tier >= 3 || eliteBonus) {
    deck = replaceCards(deck, pathway, 'epic', 2 + eliteBonus * 2, rng);
  }
  if (tier >= 4) {
    deck = replaceCards(deck, pathway, 'epic', 4, rng);
    deck = replaceCards(deck, pathway, 'legendary', 2, rng);
  }
  if (tier >= 5) {
    deck = replaceCards(deck, pathway, 'legendary', 2, rng);
  }

  return deck;
}

export function getBossPathwayForAct(act: number): Pathway {
  return STORY_BOSS_ORDER[Math.min(act - 1, STORY_BOSS_ORDER.length - 1)] ?? 'red-priest';
}

export function buildOpponent(
  floor: number,
  nodeType: 'combat' | 'elite' | 'boss',
  act: number,
  ascension: number,
  seed: number
): OpponentInfo {
  const rng = mulberry32(seed + floor * 997 + act * 131);
  const isBoss = nodeType === 'boss';
  const isElite = nodeType === 'elite';

  let pathway: Pathway;
  let tier: number;
  let name: string;

  if (isBoss) {
    pathway = getBossPathwayForAct(act);
    tier = 5;
    name = `Boss — ${pathway}`;
  } else {
    tier = getTierForFloor(floor, ascension) + (isElite ? 1 : 0);
    tier = Math.min(5, tier);
    const profiles = NPC_PROFILES.filter((p) => p.tier === tier);
    const profile = profiles.length > 0 ? pickRandom(profiles, rng) : NPC_PROFILES[0]!;
    pathway = profile.pathway;
    name = isElite ? `Elite ${profile.name}` : profile.name;
  }

  const deck = buildScaledDeck(pathway, floor, isElite, isBoss, ascension, rng);

  return { name, pathway, tier, deck, isElite, isBoss };
}
