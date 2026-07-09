import { STORY_BOSS_ORDER, isStoryComplete } from './story.js';

/** Essence for clearing a story chapter for the first time */
export const STORY_FIRST_CLEAR_ESSENCE = 150;

/** Bonus essence when completing the full story for the first time */
export const STORY_COMPLETION_BONUS_ESSENCE = 500;

/** Maximum essence from a story replay victory */
export const STORY_REPLAY_MAX_ESSENCE = 50;

export interface StoryEssenceReward {
  chapterEssence: number;
  completionBonus: number;
  total: number;
  isFirstClear: boolean;
  isReplay: boolean;
}

/** True when beating the final boss advances story to complete (progress was 4). */
export function isStoryCompletionMoment(storyProgressBeforeWin: number): boolean {
  return storyProgressBeforeWin === STORY_BOSS_ORDER.length - 1;
}

export function calculateStoryFirstClearEssence(storyProgressBeforeWin: number): StoryEssenceReward {
  const completionBonus = isStoryCompletionMoment(storyProgressBeforeWin)
    ? STORY_COMPLETION_BONUS_ESSENCE
    : 0;

  return {
    chapterEssence: STORY_FIRST_CLEAR_ESSENCE,
    completionBonus,
    total: STORY_FIRST_CLEAR_ESSENCE + completionBonus,
    isFirstClear: true,
    isReplay: false,
  };
}

/**
 * Replay reward scales with remaining HP and turn efficiency (max 50).
 * Faster, healthier wins earn more Essence.
 */
export function calculateStoryReplayEssence(
  turns: number,
  remainingHealth: number,
  maxHealth: number
): StoryEssenceReward {
  if (maxHealth <= 0) {
    return { chapterEssence: 0, completionBonus: 0, total: 0, isFirstClear: false, isReplay: true };
  }

  const healthRatio = Math.max(0, Math.min(1, remainingHealth / maxHealth));
  // 8 turns ≈ excellent; 25+ turns ≈ no turn bonus
  const turnRatio = Math.max(0, Math.min(1, 1 - (turns - 8) / 17));
  const blended = healthRatio * 0.55 + turnRatio * 0.45;
  const total = Math.round(blended * STORY_REPLAY_MAX_ESSENCE);

  return {
    chapterEssence: total,
    completionBonus: 0,
    total,
    isFirstClear: false,
    isReplay: true,
  };
}

export function calculateStoryWinEssence(
  storyProgressBeforeWin: number,
  isFirstClear: boolean,
  turns: number,
  remainingHealth: number,
  maxHealth: number
): StoryEssenceReward {
  if (isFirstClear) {
    return calculateStoryFirstClearEssence(storyProgressBeforeWin);
  }
  return calculateStoryReplayEssence(turns, remainingHealth, maxHealth);
}

export function isStoryFullyComplete(storyProgress: number): boolean {
  return isStoryComplete(storyProgress);
}
