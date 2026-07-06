import { useEffect } from 'react';
import type { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { bgmPlayer } from '../audio/bgmPlayer';
import { getHubBgmUrl, getScreenBgmUrl, resolveBattleBgmUrl } from '../audio/bgmPaths';

interface Props {
  screen: Screen;
  enabled: boolean;
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

  useEffect(() => {
    if (!enabled) return;

    const url =
      screen === 'battle' && gameState
        ? resolveBattleBgmUrl({
            isOnline,
            isStoryMode,
            storyOpponentPathway,
            opponentPathway: gameState.players.find((p) => p.id === opponentId)?.pathway,
          })
        : getScreenBgmUrl(screen);

    const play = () => {
      bgmPlayer.unlock();
      bgmPlayer.play(url);
    };

    if (bgmPlayer.isUnlocked()) {
      play();
      return;
    }

    window.addEventListener('pointerdown', play, { once: true });
    window.addEventListener('keydown', play, { once: true });
    return () => {
      window.removeEventListener('pointerdown', play);
      window.removeEventListener('keydown', play);
    };
  }, [enabled, screen, gameState, isOnline, isStoryMode, storyOpponentPathway, opponentId]);

  return null;
}

/** Auth screen — hub theme after first tap. */
export function BgmAuthWarmup() {
  useEffect(() => {
    bgmPlayer.restoreUnlock();
    const play = () => {
      bgmPlayer.unlock();
      bgmPlayer.play(getHubBgmUrl());
    };
    if (bgmPlayer.isUnlocked()) {
      play();
      return;
    }
    window.addEventListener('pointerdown', play, { once: true });
    return () => window.removeEventListener('pointerdown', play);
  }, []);
  return null;
}
