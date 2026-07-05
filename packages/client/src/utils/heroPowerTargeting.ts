import type { Pathway, PlayerState } from 'game-engine';
import { getAttackTargets } from './combatTargets';

export type HeroPowerTargetMode =
  | 'none'
  | 'any-enemy'
  | 'enemy-minion'
  | 'friendly-minion'
  | 'friendly-minion-or-hero';

export function getHeroPowerTargetMode(pathway: Pathway): HeroPowerTargetMode {
  switch (pathway) {
    case 'red-priest':
      return 'any-enemy';
    case 'tyrant':
      return 'friendly-minion';
    case 'sun':
      return 'friendly-minion-or-hero';
    case 'demoness':
      return 'enemy-minion';
    default:
      return 'none';
  }
}

export function getHeroPowerEnemyMinionTargets(
  mode: HeroPowerTargetMode,
  opponent: PlayerState
): Set<string> | null {
  if (mode === 'enemy-minion') {
    return new Set(
      opponent.board.filter((m) => !m.keywords.has('stealth')).map((m) => m.instanceId)
    );
  }
  if (mode === 'any-enemy') {
    return getAttackTargets(opponent).validMinionIds;
  }
  return null;
}

export function getHeroPowerFriendlyMinionTargets(
  mode: HeroPowerTargetMode,
  player: PlayerState
): Set<string> | null {
  if (mode === 'friendly-minion' || mode === 'friendly-minion-or-hero') {
    return new Set(player.board.map((m) => m.instanceId));
  }
  return null;
}

export function heroPowerAllowsEnemyHero(mode: HeroPowerTargetMode, opponent: PlayerState): boolean {
  return mode === 'any-enemy' && getAttackTargets(opponent).heroValid;
}

export function heroPowerAllowsFriendlyHero(mode: HeroPowerTargetMode): boolean {
  return mode === 'friendly-minion-or-hero';
}

export function isValidHeroPowerTarget(
  mode: HeroPowerTargetMode,
  isEnemy: boolean,
  instanceId: string | null,
  player: PlayerState,
  opponent: PlayerState
): boolean {
  if (mode === 'friendly-minion' && !isEnemy && instanceId) {
    return player.board.some((m) => m.instanceId === instanceId);
  }
  if (mode === 'friendly-minion-or-hero' && !isEnemy) {
    if (!instanceId) return true;
    return player.board.some((m) => m.instanceId === instanceId);
  }
  if (mode === 'enemy-minion' && isEnemy && instanceId) {
    return opponent.board.some((m) => m.instanceId === instanceId && !m.keywords.has('stealth'));
  }
  if (mode === 'any-enemy' && isEnemy) {
    if (!instanceId) return getAttackTargets(opponent).heroValid;
    const minion = opponent.board.find((m) => m.instanceId === instanceId);
    if (!minion) return false;
    return getAttackTargets(opponent).validMinionIds.has(instanceId);
  }
  return false;
}

export function resolveHeroPowerTargetId(
  mode: HeroPowerTargetMode,
  isEnemy: boolean,
  instanceId: string | null,
  playerId: string,
  opponentId: string
): string | undefined {
  if (mode === 'friendly-minion-or-hero' && !isEnemy) {
    return instanceId ?? playerId;
  }
  if (mode === 'friendly-minion' && !isEnemy && instanceId) {
    return instanceId;
  }
  if (mode === 'any-enemy' && isEnemy) {
    return instanceId ?? opponentId;
  }
  if (mode === 'enemy-minion' && isEnemy && instanceId) {
    return instanceId;
  }
  return undefined;
}
