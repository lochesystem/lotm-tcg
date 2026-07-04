import type { Pathway } from './types.js';

/** Pathways selectable from the start */
export const STARTER_PATHWAYS: Pathway[] = ['fool', 'red-priest', 'tyrant'];

/** Story bosses in order — beat each to advance and unlock the next locked pathway */
export const STORY_BOSS_ORDER: Pathway[] = ['red-priest', 'tyrant', 'sun', 'door', 'demoness'];

export const ALL_PATHWAYS: Pathway[] = ['fool', 'red-priest', 'tyrant', 'sun', 'door', 'demoness'];

export function getCurrentStoryBoss(storyProgress: number): Pathway | null {
  return STORY_BOSS_ORDER[storyProgress] ?? null;
}

export function isStoryComplete(storyProgress: number): boolean {
  return storyProgress >= STORY_BOSS_ORDER.length;
}

export function isPathwayUnlocked(pathway: Pathway, storyProgress: number): boolean {
  if (pathway === 'fool') return true;
  if (STARTER_PATHWAYS.includes(pathway)) return true;

  const bossIndex = STORY_BOSS_ORDER.indexOf(pathway);
  if (bossIndex === -1) return false;
  return storyProgress > bossIndex;
}

export function getUnlockedPathways(storyProgress: number): Pathway[] {
  return ALL_PATHWAYS.filter((p) => isPathwayUnlocked(p, storyProgress));
}

/** Pathway unlocked by beating the boss at the current story step (null if starter boss) */
export function getStoryWinUnlock(storyProgressBeforeWin: number): Pathway | null {
  const boss = STORY_BOSS_ORDER[storyProgressBeforeWin];
  if (!boss || STARTER_PATHWAYS.includes(boss)) return null;
  return boss;
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
