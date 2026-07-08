import { useEffect, useCallback } from 'react';
import type { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { bgmPlayer } from '../audio/bgmPlayer';
import { getScreenBgmUrl, resolveBattleBgmUrl } from '../audio/bgmPaths';

interface Props {
  screen: Screen;
  enabled: boolean;
}

const GESTURE_OPTS = { capture: true } as const;

/**
 * Mobile browsers block autoplay on cold start even with a stored unlock flag.
 * Keep listening for real user input until playback actually starts.
 */
function useGestureBgmPlay(play: () => Promise<void>) {
  useEffect(() => {
    let disposed = false;

    const removeListeners = () => {
      window.removeEventListener('pointerdown', onGesture, GESTURE_OPTS);
      window.removeEventListener('touchstart', onGesture);
      window.removeEventListener('click', onGesture, GESTURE_OPTS);
      window.removeEventListener('keydown', onGesture);
      document.removeEventListener('visibilitychange', onVisible);
    };

    const attempt = async () => {
      if (disposed) return;
      await play();
      if (!disposed && bgmPlayer.isPlaying()) {
        removeListeners();
      }
    };

    const onGesture = () => {
      void attempt();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void attempt();
      }
    };

    window.addEventListener('pointerdown', onGesture, GESTURE_OPTS);
    window.addEventListener('touchstart', onGesture, { ...GESTURE_OPTS, passive: true });
    window.addEventListener('click', onGesture, GESTURE_OPTS);
    window.addEventListener('keydown', onGesture);
    document.addEventListener('visibilitychange', onVisible);

    void attempt();

    return () => {
      disposed = true;
      removeListeners();
    };
  }, [play]);
}

export function BgmController({ screen, enabled }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const isOnline = useGameStore((s) => s.isOnline);
  const isStoryMode = useGameStore((s) => s.isStoryMode);
  const isRoguelikeMode = useGameStore((s) => s.isRoguelikeMode);
  const storyOpponentPathway = useGameStore((s) => s.storyOpponentPathway);
  const opponentId = useGameStore((s) => s.opponentId);

  useEffect(() => {
    bgmPlayer.restoreUnlock();
  }, []);

  const url =
    screen === 'battle' && gameState
      ? resolveBattleBgmUrl({
          isOnline,
          isStoryMode: isStoryMode || isRoguelikeMode,
          storyOpponentPathway,
          opponentPathway: gameState.players.find((p) => p.id === opponentId)?.pathway,
        })
      : getScreenBgmUrl(screen);

  const play = useCallback(async () => {
    if (!enabled) return;
    bgmPlayer.unlock();
    await bgmPlayer.play(url);
  }, [enabled, url]);

  useGestureBgmPlay(play);

  return null;
}
