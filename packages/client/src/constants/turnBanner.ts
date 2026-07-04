/** How long the turn banner stays fully visible before fading out */
export const TURN_BANNER_VISIBLE_MS = 1400;

/** Exit fade duration — must match TurnBanner exit transition */
export const TURN_BANNER_EXIT_MS = 400;

export const TURN_BANNER_TOTAL_MS = TURN_BANNER_VISIBLE_MS + TURN_BANNER_EXIT_MS;

let pendingResolve: (() => void) | null = null;

/** Called when the enemy turn begins — NPC actions wait on this promise */
export function beginTurnBannerWait(): Promise<void> {
  pendingResolve = null;
  return new Promise((resolve) => {
    pendingResolve = resolve;
  });
}

/** Called by TurnBanner when the dismiss animation finishes */
export function completeTurnBannerWait(): void {
  pendingResolve?.();
  pendingResolve = null;
}

export function waitForTurnBannerOrTimeout(timeoutMs = TURN_BANNER_TOTAL_MS + 400): Promise<void> {
  const bannerWait = beginTurnBannerWait();
  return Promise.race([
    bannerWait,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
