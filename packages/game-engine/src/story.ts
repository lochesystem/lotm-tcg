import type { Pathway } from './types.js';

/** Only pathway selectable when storyProgress is 0 */
export const INITIAL_PATHWAY: Pathway = 'red-priest';

/** Story bosses in order — beat each chapter to unlock the next pathway starter */
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
 * Pathway starter availability:
 * - Fool + Red Priest: from the start (Fool is the exception — never gated by story)
 * - Tyrant → Demoness: each unlocks after beating the previous story chapter
 */
export function isPathwayUnlocked(pathway: Pathway, storyProgress: number): boolean {
  if (pathway === 'fool') return true;

  const bossIndex = STORY_BOSS_ORDER.indexOf(pathway);
  if (bossIndex === -1) return false;

  return storyProgress >= bossIndex;
}

export function getUnlockedPathways(storyProgress: number): Pathway[] {
  return ALL_PATHWAYS.filter((p) => isPathwayUnlocked(p, storyProgress));
}

/** Pathway whose starter unlocks when the current story chapter is cleared (Fool is always free). */
export function getStoryWinUnlock(storyProgressBeforeWin: number): Pathway | null {
  const nextIndex = storyProgressBeforeWin + 1;
  if (nextIndex < STORY_BOSS_ORDER.length) {
    return STORY_BOSS_ORDER[nextIndex];
  }
  return null;
}

export function getDefaultPathway(storyProgress: number): Pathway {
  const unlocked = getUnlockedPathways(storyProgress).filter(
    (p) => p !== 'fool' && STORY_BOSS_ORDER.includes(p),
  );
  return unlocked[unlocked.length - 1] ?? INITIAL_PATHWAY;
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
