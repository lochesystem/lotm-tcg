import type { Card, Deck, Pathway } from '../types.js';

export type NodeType = 'combat' | 'elite' | 'camp' | 'treasure' | 'event' | 'boss';

export interface MapNode {
  id: string;
  floor: number;
  column: number;
  type: NodeType;
  connections: string[];
  visited: boolean;
  cleared: boolean;
}

export interface RunMap {
  seed: number;
  act: number;
  floors: number;
  nodes: MapNode[];
  startNodeIds: string[];
  bossNodeId: string;
}

export type RunCardUpgradeType = 'plus-stats' | 'minus-cost' | 'add-keyword';

export interface RunCardUpgrade {
  cardId: string;
  type: RunCardUpgradeType;
  attackBonus?: number;
  healthBonus?: number;
  costReduction?: number;
  keyword?: string;
}

export type RelicId =
  | 'night-jar'
  | 'fool-card'
  | 'crimson-flame'
  | 'tyrant-seal'
  | 'sealed-hourglass'
  | 'torn-page';

export interface RunRelic {
  id: RelicId;
  name: string;
  description: string;
}

export interface RunDeckState {
  pathway: Pathway;
  cards: string[];
  upgrades: RunCardUpgrade[];
}

export interface RunState {
  id: string;
  seed: number;
  act: number;
  ascension: number;
  pathway: Pathway;
  map: RunMap;
  currentNodeId: string | null;
  heroHealth: number;
  heroMaxHealth: number;
  deck: RunDeckState;
  relics: RelicId[];
  floorsCleared: number;
  elitesKilled: number;
  combatsWon: number;
  bossKilled: boolean;
  victory: boolean;
  /** Card offers pending swap after combat */
  pendingCardOffer: Card[] | null;
  /** Relic offers after elite/treasure */
  pendingRelicOffer: RelicId[] | null;
  /** Event id when on event node */
  pendingEventId: string | null;
  startedAt: number;
}

export interface RunResult {
  victory: boolean;
  floorsCleared: number;
  elitesKilled: number;
  bossKilled: boolean;
  combatsWon: number;
  ascension: number;
}

export interface EssenceBreakdown {
  total: number;
  floorBonus: number;
  eliteBonus: number;
  bossBonus: number;
  victoryBonus: number;
}

export type CampChoice = 'rest' | 'upgrade' | 'remove';

export interface RoguelikeEventChoice {
  id: string;
  label: string;
  description: string;
}

export interface RoguelikeEvent {
  id: string;
  title: string;
  description: string;
  choices: RoguelikeEventChoice[];
}

export interface OpponentInfo {
  name: string;
  pathway: Pathway;
  tier: number;
  deck: Deck;
  isElite: boolean;
  isBoss: boolean;
}

export function runDeckToDeck(state: RunDeckState): Deck {
  return { pathway: state.pathway, cards: [...state.cards] };
}
