import type { Pathway } from './types.js';

/** Only pathway available before any story progress */
export const INITIAL_PATHWAY: Pathway = 'fool';

/** Story bosses in order — beating each chapter unlocks that pathway's starter deck */
export const STORY_BOSS_ORDER: Pathway[] = ['red-priest', 'tyrant', 'sun', 'door', 'demoness'];

export const ALL_PATHWAYS: Pathway[] = ['fool', ...STORY_BOSS_ORDER];

export function getCurrentStoryBoss(storyProgress: number): Pathway | null {
  return STORY_BOSS_ORDER[storyProgress] ?? null;
}

/** Bosses the player may fight — current chapter plus any already reached (all five after story complete). */
export function getSelectableStoryBosses(storyProgress: number): Pathway[] {
  if (isStoryComplete(storyProgress)) {
    return [...STORY_BOSS_ORDER];
  }
  const count = Math.min(storyProgress + 1, STORY_BOSS_ORDER.length);
  return STORY_BOSS_ORDER.slice(0, count);
}

export function isStoryProgressionBoss(storyProgress: number, boss: Pathway): boolean {
  return getCurrentStoryBoss(storyProgress) === boss;
}

export function getStoryBossTier(boss: Pathway): number {
  const index = STORY_BOSS_ORDER.indexOf(boss);
  return index === -1 ? 1 : index + 1;
}

export function isStoryComplete(storyProgress: number): boolean {
  return storyProgress >= STORY_BOSS_ORDER.length;
}

/**
 * - Fool: always unlocked (only free starter)
 * - Each story pathway: unlocks after beating its chapter boss once
 */
export function isPathwayUnlocked(pathway: Pathway, storyProgress: number): boolean {
  if (pathway === 'fool') return true;

  const bossIndex = STORY_BOSS_ORDER.indexOf(pathway);
  if (bossIndex === -1) return false;

  return storyProgress > bossIndex;
}

export function getUnlockedPathways(storyProgress: number): Pathway[] {
  return ALL_PATHWAYS.filter((p) => isPathwayUnlocked(p, storyProgress));
}

/** Pathway starter unlocked by clearing the chapter at storyProgressBeforeWin */
export function getStoryWinUnlock(storyProgressBeforeWin: number): Pathway | null {
  return STORY_BOSS_ORDER[storyProgressBeforeWin] ?? null;
}

export function getDefaultPathway(_storyProgress: number): Pathway {
  return INITIAL_PATHWAY;
}

export function getStoryChapterLabel(pathway: Pathway): string {
  const labels: Record<Pathway, string> = {
    fool: 'O Louco',
    'red-priest': 'Capítulo I — Red Priest',
    tyrant: 'Capítulo II — Tyrant',
    sun: 'Capítulo III — Sun',
    door: 'Capítulo IV — Door',
    demoness: 'Capítulo Final — Demoness',
  };
  return labels[pathway];
}
