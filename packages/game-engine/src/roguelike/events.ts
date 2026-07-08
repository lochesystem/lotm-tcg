import type { Pathway } from '../types.js';
import { createStarterDeck } from '../deck.js';
import { getCardsForPathway, getCardById } from '../cards/index.js';
import { mulberry32, pickRandom } from './rng.js';
import { generateRelicOffers } from './rewards.js';
import type { RoguelikeEvent, RunState } from './types.js';

export const ROGUELIKE_EVENTS: RoguelikeEvent[] = [
  {
    id: 'mysterious-vendor',
    title: 'Vendedor Misterioso',
    description: 'Um homem encapuzado oferece um frasco brilhante em troca de um pedaço de sua vitalidade.',
    choices: [
      { id: 'buy', label: 'Beber o frasco', description: 'Perde 4 HP, ganha uma carta rara aleatória.' },
      { id: 'refuse', label: 'Recusar', description: 'Nada acontece.' },
    ],
  },
  {
    id: 'ancient-shrine',
    title: 'Santuário Antigo',
    description: 'Velas apagadas cercam um altar coberto de poeira mística.',
    choices: [
      { id: 'pray', label: 'Orar', description: 'Cura 6 HP.' },
      { id: 'steal', label: 'Pegar o artefato', description: 'Ganha uma relíquia aleatória, perde 3 HP.' },
    ],
  },
  {
    id: 'cursed-tome',
    title: 'Tomo Amaldiçoado',
    description: 'Páginas sussurram segredos proibidos.',
    choices: [
      { id: 'read', label: 'Ler', description: 'Substitui uma carta por uma neutra comum fraca.' },
      { id: 'burn', label: 'Queimar', description: 'Cura 5 HP.' },
    ],
  },
  {
    id: 'foggy-crossroads',
    title: 'Encruzilhada na Névoa',
    description: 'Dois caminhos se perdem na bruma espiritual.',
    choices: [
      { id: 'left', label: 'Caminho da coragem', description: 'Cura 3 HP.' },
      { id: 'right', label: 'Caminho da ganância', description: 'Ganha uma carta comum aleatória (swap).' },
    ],
  },
  {
    id: 'sequence-vision',
    title: 'Visão de Sequência',
    description: 'Você vislumbra um ritual de ascensão incompleto.',
    choices: [
      { id: 'complete', label: 'Completar ritual', description: 'Melhora uma carta aleatória do deck (+1/+1).' },
      { id: 'reject', label: 'Rejeitar', description: 'Cura 4 HP.' },
    ],
  },
  {
    id: 'nightmare-whisper',
    title: 'Sussurro do Pesadelo',
    description: 'Uma voz promete poder em troca de sanidade.',
    choices: [
      { id: 'accept', label: 'Aceitar', description: 'Perde 6 HP, ganha +2/+2 em um lacaio aleatório.' },
      { id: 'resist', label: 'Resistir', description: 'Nada acontece.' },
    ],
  },
  {
    id: 'beyonder-merchant',
    title: 'Mercador Beyonder',
    description: 'Um comerciante oferece suprimentos espirituais.',
    choices: [
      { id: 'supplies', label: 'Comprar suprimentos', description: 'Cura 8 HP.' },
      { id: 'map', label: 'Descansar um pouco', description: 'Cura 4 HP.' },
    ],
  },
  {
    id: 'blood-moon',
    title: 'Lua de Sangue',
    description: 'O céu escarlate intensifica os desejos de batalha.',
    choices: [
      { id: 'embrace', label: 'Abraçar a fúria', description: 'Perde 3 HP, melhora uma carta (+1 custo reduzido).' },
      { id: 'hide', label: 'Esconder-se', description: 'Cura 6 HP.' },
    ],
  },
];

export function pickEvent(seed: number): RoguelikeEvent {
  const rng = mulberry32(seed);
  return pickRandom(ROGUELIKE_EVENTS, rng);
}

function pickBeyonderCardId(cards: string[], pathway: Pathway, rng: () => number): string | null {
  const beyonder = cards.filter((id) => {
    const c = getCardById(id);
    return c?.type === 'beyonder';
  });
  if (beyonder.length === 0) return null;
  return pickRandom(beyonder, rng);
}

export function applyEventChoice(
  run: RunState,
  eventId: string,
  choiceId: string,
  seed: number
): Partial<RunState> {
  const rng = mulberry32(seed + eventId.length + choiceId.length);
  const updates: Partial<RunState> = {};

  switch (eventId) {
    case 'mysterious-vendor':
      if (choiceId === 'buy') {
        updates.heroHealth = Math.max(1, run.heroHealth - 4);
        const rares = getCardsForPathway(run.pathway).filter((c) => c.rarity === 'rare');
        if (rares.length > 0) {
          updates.pendingCardOffer = [pickRandom(rares, rng)];
        }
      }
      break;
    case 'ancient-shrine':
      if (choiceId === 'pray') {
        updates.heroHealth = Math.min(run.heroMaxHealth, run.heroHealth + 6);
      } else if (choiceId === 'steal') {
        updates.heroHealth = Math.max(1, run.heroHealth - 3);
        updates.pendingRelicOffer = generateRelicOffers(run.relics, seed, 1);
      }
      break;
    case 'cursed-tome':
      if (choiceId === 'read') {
        const neutrals = getCardsForPathway('neutral').filter((c) => c.rarity === 'common');
        if (neutrals.length > 0) {
          const card = pickRandom(neutrals, rng);
          const removeIdx = Math.floor(rng() * run.deck.cards.length);
          const nextCards = [...run.deck.cards];
          nextCards[removeIdx] = card.id;
          updates.deck = { ...run.deck, cards: nextCards };
        }
      } else if (choiceId === 'burn') {
        updates.heroHealth = Math.min(run.heroMaxHealth, run.heroHealth + 5);
      }
      break;
    case 'foggy-crossroads':
      if (choiceId === 'left') {
        updates.heroHealth = Math.min(run.heroMaxHealth, run.heroHealth + 3);
      } else if (choiceId === 'right') {
        const commons = getCardsForPathway(run.pathway).filter((c) => c.rarity === 'common');
        if (commons.length > 0) {
          updates.pendingCardOffer = [pickRandom(commons, rng)];
        }
      }
      break;
    case 'sequence-vision':
      if (choiceId === 'complete') {
        const cardId = pickBeyonderCardId(run.deck.cards, run.pathway, rng);
        if (cardId) {
          updates.deck = {
            ...run.deck,
            upgrades: [
              ...run.deck.upgrades.filter((u) => u.cardId !== cardId),
              { cardId, type: 'plus-stats', attackBonus: 1, healthBonus: 1 },
            ],
          };
        }
      } else if (choiceId === 'reject') {
        updates.heroHealth = Math.min(run.heroMaxHealth, run.heroHealth + 4);
      }
      break;
    case 'nightmare-whisper':
      if (choiceId === 'accept') {
        updates.heroHealth = Math.max(1, run.heroHealth - 6);
        const cardId = pickBeyonderCardId(run.deck.cards, run.pathway, rng);
        if (cardId) {
          updates.deck = {
            ...run.deck,
            upgrades: [
              ...run.deck.upgrades.filter((u) => u.cardId !== cardId),
              { cardId, type: 'plus-stats', attackBonus: 2, healthBonus: 2 },
            ],
          };
        }
      }
      break;
    case 'beyonder-merchant':
      if (choiceId === 'supplies') {
        updates.heroHealth = Math.min(run.heroMaxHealth, run.heroHealth + 8);
      } else if (choiceId === 'map') {
        updates.heroHealth = Math.min(run.heroMaxHealth, run.heroHealth + 4);
      }
      break;
    case 'blood-moon':
      if (choiceId === 'embrace') {
        updates.heroHealth = Math.max(1, run.heroHealth - 3);
        const cardId = pickBeyonderCardId(run.deck.cards, run.pathway, rng);
        if (cardId) {
          updates.deck = {
            ...run.deck,
            upgrades: [
              ...run.deck.upgrades.filter((u) => u.cardId !== cardId),
              { cardId, type: 'minus-cost', costReduction: 1 },
            ],
          };
        }
      } else if (choiceId === 'hide') {
        updates.heroHealth = Math.min(run.heroMaxHealth, run.heroHealth + 6);
      }
      break;
    default:
      break;
  }

  updates.pendingEventId = null;
  return updates;
}
