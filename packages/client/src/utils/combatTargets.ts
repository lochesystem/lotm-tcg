import { MinionInstance, PlayerState } from 'game-engine';
import type { Locale } from '../i18n/types';
import { translate } from '../i18n/useTranslation';

export interface AttackTargetInfo {
  heroValid: boolean;
  validMinionIds: Set<string>;
  hasProvoke: boolean;
  provokeNames: string[];
}

export function getAttackTargets(opponent: PlayerState): AttackTargetInfo {
  const provokeMinions = opponent.board.filter((m) => m.keywords.has('provoke'));
  const hasProvoke = provokeMinions.length > 0;

  const validMinions = opponent.board.filter((m) => {
    if (m.keywords.has('stealth')) return false;
    if (hasProvoke) return m.keywords.has('provoke');
    return true;
  });

  return {
    heroValid: !hasProvoke,
    validMinionIds: new Set(validMinions.map((m) => m.instanceId)),
    hasProvoke,
    provokeNames: provokeMinions.map((m) => m.card.name),
  };
}

export function isValidMinionTarget(minion: MinionInstance, targets: AttackTargetInfo): boolean {
  return targets.validMinionIds.has(minion.instanceId);
}

export function formatAttackError(
  error: string,
  targets: AttackTargetInfo | undefined,
  locale: Locale,
): string {
  if (error.includes('Provoke') && targets?.hasProvoke) {
    const names = targets.provokeNames.join(', ');
    return translate(locale, 'battle.combat.provoke', { names });
  }
  if (error.includes('stealth')) return translate(locale, 'battle.combat.stealth');
  if (error === 'Cannot attack') return translate(locale, 'battle.combat.cannotAttack');
  return error;
}
