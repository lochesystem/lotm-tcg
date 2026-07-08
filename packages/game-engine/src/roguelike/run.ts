import type { Pathway } from '../types.js';
import { createStarterDeck } from '../deck.js';
import { generateMap } from './map.js';
import { getMaxHealthBonus } from './relics.js';
import type { RunState, RunDeckState } from './types.js';

const BASE_MAX_HEALTH = 30;

export function createRunDeck(pathway: Pathway): RunDeckState {
  const starter = createStarterDeck(pathway);
  return {
    pathway,
    cards: [...starter.cards],
    upgrades: [],
  };
}

export function createRun(pathway: Pathway, seed = Date.now(), act = 1, ascension = 0): RunState {
  const map = generateMap(seed, act);
  const relics: RunState['relics'] = [];

  return {
    id: `run-${seed}`,
    seed,
    act,
    ascension,
    pathway,
    map,
    currentNodeId: null,
    heroHealth: BASE_MAX_HEALTH,
    heroMaxHealth: BASE_MAX_HEALTH + getMaxHealthBonus(relics),
    deck: createRunDeck(pathway),
    relics,
    floorsCleared: 0,
    elitesKilled: 0,
    combatsWon: 0,
    bossKilled: false,
    victory: false,
    pendingCardOffer: null,
    pendingRelicOffer: null,
    pendingEventId: null,
    startedAt: Date.now(),
  };
}

export function recalculateMaxHealth(run: RunState): RunState {
  const bonus = getMaxHealthBonus(run.relics);
  const heroMaxHealth = BASE_MAX_HEALTH + bonus;
  return {
    ...run,
    heroMaxHealth,
    heroHealth: Math.min(run.heroHealth, heroMaxHealth),
  };
}

export function startAct(act: number, run: RunState): RunState {
  const seed = run.seed + act * 10000;
  const map = generateMap(seed, act);
  const heal = Math.ceil(run.heroMaxHealth * 0.25);

  return {
    ...run,
    act,
    map,
    currentNodeId: null,
    heroHealth: Math.min(run.heroMaxHealth, run.heroHealth + heal),
    pendingCardOffer: null,
    pendingRelicOffer: null,
    pendingEventId: null,
  };
}

export const ACT_COUNT = 3;

export function isRunComplete(run: RunState): boolean {
  return run.victory && run.act >= ACT_COUNT;
}

export function shouldAdvanceAct(run: RunState): boolean {
  return run.bossKilled && run.act < ACT_COUNT && !run.victory;
}
