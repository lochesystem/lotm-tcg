import type { Card, PlayerState, SpellEffect, TargetType } from 'game-engine';

export interface CardPlayTargets {
  friendlyMinionIds: Set<string>;
  enemyMinionIds: Set<string>;
  allowFriendlyHero: boolean;
  allowEnemyHero: boolean;
  hasAny: boolean;
}

const AUTO_TARGET_TYPES: TargetType[] = [
  'none',
  'all-enemies',
  'all-friendlies',
  'all',
  'all-characters',
  'random-enemy',
  'friendly-hero',
];

function ritualEffect(card: Card): SpellEffect | null {
  return card.type === 'ritual' ? card.effect : null;
}

export function cardNeedsTarget(card: Card): boolean {
  const effect = ritualEffect(card);
  if (!effect) return false;
  if (AUTO_TARGET_TYPES.includes(effect.target)) return false;

  if (effect.target === 'enemy-hero' || effect.target === 'friendly' || effect.target === 'enemy') {
    return true;
  }

  if (effect.target === 'any') {
    return ['damage', 'heal', 'buff', 'debuff', 'destroy', 'return'].includes(effect.type);
  }

  return false;
}

export function getCardPlayTargets(
  card: Card,
  player: PlayerState,
  opponent: PlayerState,
): CardPlayTargets {
  const friendlyMinionIds = new Set<string>();
  const enemyMinionIds = new Set<string>();
  let allowFriendlyHero = false;
  let allowEnemyHero = false;

  const effect = ritualEffect(card);
  if (!effect) {
    return {
      friendlyMinionIds,
      enemyMinionIds,
      allowFriendlyHero,
      allowEnemyHero,
      hasAny: true,
    };
  }

  const addFriendlyMinions = () => {
    for (const minion of player.board) {
      friendlyMinionIds.add(minion.instanceId);
    }
  };

  const addEnemyMinions = () => {
    for (const minion of opponent.board) {
      if (!minion.keywords.has('stealth')) {
        enemyMinionIds.add(minion.instanceId);
      }
    }
  };

  switch (effect.target) {
    case 'friendly':
      addFriendlyMinions();
      break;
    case 'enemy':
      addEnemyMinions();
      break;
    case 'enemy-hero':
      allowEnemyHero = true;
      break;
    case 'any':
      if (effect.type === 'damage' || effect.type === 'destroy' || effect.type === 'return') {
        addEnemyMinions();
        allowEnemyHero = effect.type === 'damage';
      } else if (effect.type === 'heal' || effect.type === 'buff' || effect.type === 'debuff') {
        addFriendlyMinions();
        if (effect.type === 'heal') allowFriendlyHero = true;
      } else {
        addFriendlyMinions();
        addEnemyMinions();
        allowFriendlyHero = true;
        allowEnemyHero = true;
      }
      break;
    default:
      break;
  }

  return {
    friendlyMinionIds,
    enemyMinionIds,
    allowFriendlyHero,
    allowEnemyHero,
    hasAny:
      friendlyMinionIds.size > 0 ||
      enemyMinionIds.size > 0 ||
      allowFriendlyHero ||
      allowEnemyHero,
  };
}

export function isValidCardTarget(
  targets: CardPlayTargets,
  instanceId: string,
  isEnemy: boolean,
): boolean {
  return isEnemy
    ? targets.enemyMinionIds.has(instanceId)
    : targets.friendlyMinionIds.has(instanceId);
}
