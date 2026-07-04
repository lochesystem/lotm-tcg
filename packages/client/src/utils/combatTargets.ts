import { MinionInstance, PlayerState } from 'game-engine';

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

export function formatAttackError(error: string, targets?: AttackTargetInfo): string {
  if (error.includes('Provoke') && targets?.hasProvoke) {
    const names = targets.provokeNames.join(', ');
    return `Provoke: ataque ${names} primeiro (🛡️)`;
  }
  if (error.includes('stealth')) return 'Não pode atacar minion com Stealth';
  if (error === 'Cannot attack') return 'Este minion não pode atacar agora';
  return error;
}
