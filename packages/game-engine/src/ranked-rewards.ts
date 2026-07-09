export const RANKED_WIN_MAX_ESSENCE = 120;
export const RANKED_LOSS_MIN_ESSENCE = 3;
export const RANKED_LOSS_MAX_ESSENCE = 10;

export interface RankedEssenceReward {
  total: number;
  won: boolean;
}

/** Winner: up to 120 Essence from speed and remaining HP. */
export function calculateRankedWinEssence(
  turns: number,
  remainingHealth: number,
  maxHealth: number
): RankedEssenceReward {
  if (maxHealth <= 0) {
    return { total: 0, won: true };
  }

  const healthRatio = Math.max(0, Math.min(1, remainingHealth / maxHealth));
  const turnRatio = Math.max(0, Math.min(1, 1 - (turns - 8) / 22));
  const blended = healthRatio * 0.55 + turnRatio * 0.45;
  const total = Math.round(blended * RANKED_WIN_MAX_ESSENCE);

  return { total: Math.max(1, total), won: true };
}

/** Loser: 3–10 Essence; longer matches grant a little more. */
export function calculateRankedLossEssence(turns: number): RankedEssenceReward {
  const bonus = Math.min(
    RANKED_LOSS_MAX_ESSENCE - RANKED_LOSS_MIN_ESSENCE,
    Math.max(0, Math.floor((turns - 4) / 2))
  );
  const total = RANKED_LOSS_MIN_ESSENCE + bonus;

  return {
    total: Math.min(RANKED_LOSS_MAX_ESSENCE, total),
    won: false,
  };
}

export function calculateRankedEssence(
  won: boolean,
  turns: number,
  remainingHealth: number,
  maxHealth: number
): RankedEssenceReward {
  if (won) {
    return calculateRankedWinEssence(turns, remainingHealth, maxHealth);
  }
  return calculateRankedLossEssence(turns);
}
