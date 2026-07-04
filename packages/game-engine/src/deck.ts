import { Deck, DeckValidation, Pathway } from './types.js';
import { getCardById, getStarterCards as getStarterCardsFn } from './cards/index.js';

const DECK_SIZE = 30;
const MAX_COPIES = 2;
const MAX_LEGENDARY_COPIES = 1;

export function validateDeck(deck: Deck): DeckValidation {
  const errors: string[] = [];

  if (deck.cards.length !== DECK_SIZE) {
    errors.push(`Deck must contain exactly ${DECK_SIZE} cards (has ${deck.cards.length})`);
  }

  const counts = new Map<string, number>();
  for (const cardId of deck.cards) {
    counts.set(cardId, (counts.get(cardId) || 0) + 1);
  }

  for (const [cardId, count] of counts) {
    const card = getCardById(cardId);
    if (!card) {
      errors.push(`Card not found: ${cardId}`);
      continue;
    }

    if (card.pathway !== 'neutral' && card.pathway !== deck.pathway) {
      errors.push(`Card "${card.name}" belongs to ${card.pathway}, not ${deck.pathway}`);
    }

    const maxCopies = card.rarity === 'legendary' ? MAX_LEGENDARY_COPIES : MAX_COPIES;
    if (count > maxCopies) {
      errors.push(`Card "${card.name}" has ${count} copies (max ${maxCopies})`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createStarterDeck(pathway: Pathway): Deck {
  const cards = getStarterCardsFn(pathway);
  return { pathway, cards: cards.map((c) => c.id) };
}
