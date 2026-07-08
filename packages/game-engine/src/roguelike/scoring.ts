import type { EssenceBreakdown, RunResult } from './types.js';

const FLOOR_BASE = 20;
const PER_FLOOR = 8;
const PER_ELITE = 15;
const BOSS_BONUS = 50;
const VICTORY_BONUS = 40;
const PER_ASCENSION = 10;

export function calculateEssence(result: RunResult): EssenceBreakdown {
  const floorBonus = result.floorsCleared * PER_FLOOR;
  const eliteBonus = result.elitesKilled * PER_ELITE;
  const bossBonus = result.bossKilled ? BOSS_BONUS : 0;
  const victoryBonus = result.victory ? VICTORY_BONUS : 0;
  const ascensionBonus = result.ascension * PER_ASCENSION;

  const total = FLOOR_BASE + floorBonus + eliteBonus + bossBonus + victoryBonus + ascensionBonus;

  return {
    total,
    floorBonus: FLOOR_BASE + floorBonus,
    eliteBonus,
    bossBonus,
    victoryBonus: victoryBonus + ascensionBonus,
  };
}

export function healAtCamp(currentHealth: number, maxHealth: number): number {
  const heal = Math.ceil(maxHealth * 0.3);
  return Math.min(maxHealth, currentHealth + heal);
}
