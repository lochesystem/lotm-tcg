import type { GameState, Card, RitualCard, SpellEffect, Pathway } from 'game-engine';

export function ritualPathway(card: RitualCard): Pathway {
  return card.pathway === 'neutral' ? 'fool' : card.pathway;
}

export function isDamagingRitual(card: Card): card is RitualCard {
  return card.type === 'ritual' && card.effect.type === 'damage';
}

export function isAoERitual(effect: SpellEffect): boolean {
  return effect.target === 'all-enemies' || effect.target === 'all' || effect.target === 'all-characters';
}

export function isFullBoardRitual(effect: SpellEffect): boolean {
  return effect.target === 'all-characters';
}

export function resolveRitualTargets(
  state: GameState,
  casterId: string,
  effect: SpellEffect,
  explicitTarget?: string
): { targetIds: string[]; targetHero: 'player' | 'opponent' | null } {
  const casterIdx = state.players.findIndex((p) => p.id === casterId);
  const opponentIdx = 1 - casterIdx;
  const caster = state.players[casterIdx];
  const opponent = state.players[opponentIdx];
  const enemyHero: 'player' | 'opponent' = casterIdx === 0 ? 'opponent' : 'player';
  const friendlyHero: 'player' | 'opponent' = casterIdx === 0 ? 'player' : 'opponent';

  if (explicitTarget) {
    if (explicitTarget === caster.id) {
      return { targetIds: [], targetHero: friendlyHero };
    }
    if (explicitTarget === opponent.id) {
      return { targetIds: [], targetHero: enemyHero };
    }
    const onOpponent = opponent.board.some((m) => m.instanceId === explicitTarget);
    const onCaster = caster.board.some((m) => m.instanceId === explicitTarget);
    if (onOpponent || onCaster) {
      return { targetIds: [explicitTarget], targetHero: null };
    }
  }

  if (effect.target === 'all-enemies') {
    return { targetIds: opponent.board.map((m) => m.instanceId), targetHero: null };
  }

  if (effect.target === 'all') {
    return {
      targetIds: [...caster.board, ...opponent.board].map((m) => m.instanceId),
      targetHero: null,
    };
  }

  if (effect.target === 'all-characters') {
    return {
      targetIds: [...caster.board, ...opponent.board].map((m) => m.instanceId),
      targetHero: null,
    };
  }

  if (effect.target === 'enemy-hero') {
    return { targetIds: [], targetHero: enemyHero };
  }

  if (effect.target === 'random-enemy') {
    if (opponent.board.length > 0) {
      const pick = opponent.board[Math.floor(Math.random() * opponent.board.length)];
      return { targetIds: [pick.instanceId], targetHero: null };
    }
    return { targetIds: [], targetHero: enemyHero };
  }

  if (effect.target === 'enemy' || effect.target === 'any') {
    const pool = effect.target === 'enemy' ? opponent.board : [...opponent.board, ...caster.board];
    const pick = [...pool].sort((a, b) => a.currentHealth - b.currentHealth)[0];
    if (pick) return { targetIds: [pick.instanceId], targetHero: null };
    return { targetIds: [], targetHero: enemyHero };
  }

  if (effect.target === 'friendly' || effect.target === 'friendly-hero') {
    const pick = [...caster.board].sort((a, b) => a.currentHealth - b.currentHealth)[0];
    if (pick) return { targetIds: [pick.instanceId], targetHero: null };
    return { targetIds: [], targetHero: friendlyHero };
  }

  return { targetIds: [], targetHero: null };
}
