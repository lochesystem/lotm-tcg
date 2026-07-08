import type { Card, BeyonderCard } from '../types.js';
import type { RunCardUpgrade } from './types.js';

export function applyUpgradeToCard(card: Card, upgrade: RunCardUpgrade): Card {
  const copy = { ...card } as Card;

  if (upgrade.type === 'minus-cost' && upgrade.costReduction) {
    copy.cost = Math.max(0, copy.cost - upgrade.costReduction);
  }

  if (upgrade.type === 'plus-stats' && copy.type === 'beyonder') {
    const b = copy as BeyonderCard;
    return {
      ...b,
      attack: b.attack + (upgrade.attackBonus ?? 0),
      health: b.health + (upgrade.healthBonus ?? 0),
    };
  }

  return copy;
}

export function applyUpgradesToDeckCards(cards: Card[], upgrades: RunCardUpgrade[]): Card[] {
  return cards.map((card) => {
    const upgrade = upgrades.find((u) => u.cardId === card.id);
    return upgrade ? applyUpgradeToCard(card, upgrade) : card;
  });
}

export function getUpgradeForCard(cardId: string, upgrades: RunCardUpgrade[]): RunCardUpgrade | undefined {
  return upgrades.find((u) => u.cardId === cardId);
}
