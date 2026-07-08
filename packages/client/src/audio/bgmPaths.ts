import type { Pathway } from 'game-engine';
import type { Screen } from '../App';

const BATTLE_PATHWAYS = new Set<Pathway>([
  'fool',
  'red-priest',
  'tyrant',
  'sun',
  'door',
  'demoness',
]);

const HUB_TRACK = 'audio/bgm/home.mp3';
const PVP_TRACK = 'audio/bgm/pvp-match.mp3';

function assetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}${relativePath}`;
}

export function getHubBgmUrl(): string {
  return assetUrl(HUB_TRACK);
}

export function getPvpBgmUrl(): string {
  return assetUrl(PVP_TRACK);
}

export function getBattleBgmUrl(pathway: Pathway): string {
  const id = BATTLE_PATHWAYS.has(pathway) ? pathway : 'fool';
  return assetUrl(`audio/bgm/battle/${id}.mp3`);
}

export function getRoguelikeMapBgmUrl(): string {
  return assetUrl('audio/bgm/future/roguelike-map.mp3');
}

/** Hub screens without a dedicated track yet reuse the menu theme. */
export function getScreenBgmUrl(screen: Screen): string {
  switch (screen) {
    case 'roguelike':
      return getRoguelikeMapBgmUrl();
    case 'shop':
    case 'home':
    case 'lobby':
    case 'collection':
    case 'deck-builder':
      return getHubBgmUrl();
    default:
      return getHubBgmUrl();
  }
}

export function resolveBattleBgmUrl(opts: {
  isOnline: boolean;
  isStoryMode: boolean;
  storyOpponentPathway: Pathway | null;
  opponentPathway: Pathway | null | undefined;
}): string {
  if (opts.isOnline) return getPvpBgmUrl();

  const pathway =
    (opts.isStoryMode && opts.storyOpponentPathway) ||
    opts.opponentPathway ||
    'fool';

  return getBattleBgmUrl(pathway);
}
