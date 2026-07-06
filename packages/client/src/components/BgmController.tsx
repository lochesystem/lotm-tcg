import { useEffect, useCallback } from 'react';
import type { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { bgmPlayer } from '../audio/bgmPlayer';
import { getHubBgmUrl, getScreenBgmUrl, resolveBattleBgmUrl } from '../audio/bgmPaths';

interface Props {
  screen: Screen;
  enabled: boolean;
}

/** Browsers may block autoplay even when unlock was restored from a prior session. */
function useGestureBgmPlay(play: () => void) {
  useEffect(() => {
    play();

    const onGesture = () => play();
    const opts = { once: true, capture: true } as const;

    window.addEventListener('pointerdown', onGesture, opts);
    window.addEventListener('touchstart', onGesture, { ...opts, passive: true });
    window.addEventListener('keydown', onGesture, opts);

    return () => {
      window.removeEventListener('pointerdown', onGesture, opts);
      window.removeEventListener('touchstart', onGesture);
      window.removeEventListener('keydown', onGesture, opts);
    };
  }, [play]);
}

export function BgmController({ screen, enabled }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const isOnline = useGameStore((s) => s.isOnline);
  const isStoryMode = useGameStore((s) => s.isStoryMode);
  const storyOpponentPathway = useGameStore((s) => s.storyOpponentPathway);
  const opponentId = useGameStore((s) => s.opponentId);

  useEffect(() => {
    bgmPlayer.restoreUnlock();
  }, []);

  const url =
    screen === 'battle' && gameState
      ? resolveBattleBgmUrl({
          isOnline,
          isStoryMode,
          storyOpponentPathway,
          opponentPathway: gameState.players.find((p) => p.id === opponentId)?.pathway,
        })
      : getScreenBgmUrl(screen);

  const play = useCallback(() => {
    if (!enabled) return;
    bgmPlayer.unlock();
    bgmPlayer.play(url);
  }, [enabled, url]);

  useGestureBgmPlay(play);

  return null;
}

/** Auth screen — hub theme after first tap. */
export function BgmAuthWarmup() {
  useEffect(() => {
    bgmPlayer.restoreUnlock();
  }, []);

  const play = useCallback(() => {
    bgmPlayer.unlock();
    bgmPlayer.play(getHubBgmUrl());
  }, []);

  useGestureBgmPlay(play);

  return null;
}
