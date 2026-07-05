import { Card, Pathway } from '../types.js';
import { NEUTRAL_CARDS } from './neutral.js';
import { FOOL_CARDS } from './fool.js';
import { RED_PRIEST_CARDS } from './red-priest.js';
import { TYRANT_CARDS } from './tyrant.js';
import { SUN_CARDS } from './sun.js';
import { DOOR_CARDS } from './door.js';
import { DEMONESS_CARDS } from './demoness.js';
import { TOKEN_CARDS } from './tokens.js';

const ALL_CARDS: Card[] = [
  ...NEUTRAL_CARDS,
  ...FOOL_CARDS,
  ...RED_PRIEST_CARDS,
  ...TYRANT_CARDS,
  ...SUN_CARDS,
  ...DOOR_CARDS,
  ...DEMONESS_CARDS,
];

const CARD_MAP = new Map<string, Card>();
for (const card of [...ALL_CARDS, ...TOKEN_CARDS]) {
  CARD_MAP.set(card.id, card);
}

export function getCardById(id: string): Card | undefined {
  return CARD_MAP.get(id);
}

export function getAllCards(): Card[] {
  return ALL_CARDS;
}

export function getCardsForPathway(pathway: Pathway | 'neutral'): Card[] {
  return ALL_CARDS.filter((c) => c.pathway === pathway);
}

export function getStarterCards(pathway: Pathway): Card[] {
  const pathwayCards = getCardsForPathway(pathway).filter((c) => c.rarity === 'common' || c.rarity === 'rare');
  const neutralCards = getCardsForPathway('neutral').filter((c) => c.rarity === 'common');

  const deck: Card[] = [];

  // Fill with pathway cards (2 copies each, common/rare)
  for (const card of pathwayCards) {
    if (deck.length >= 20) break;
    deck.push(card, card);
  }

  // Fill remaining with neutrals
  for (const card of neutralCards) {
    if (deck.length >= 30) break;
    deck.push(card, card);
  }

  // If still not 30, pad with more neutrals
  while (deck.length < 30) {
    const padding = neutralCards[deck.length % neutralCards.length];
    if (padding) deck.push(padding);
    else break;
  }

  return deck.slice(0, 30);
}

export { NEUTRAL_CARDS, FOOL_CARDS, RED_PRIEST_CARDS, TYRANT_CARDS, SUN_CARDS, DOOR_CARDS, DEMONESS_CARDS };
