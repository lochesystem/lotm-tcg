import type { RelicId, RunRelic } from './types.js';

export const RUN_RELICS: Record<RelicId, RunRelic> = {
  'night-jar': {
    id: 'night-jar',
    name: 'Pote da Noite',
    description: 'Compra +1 carta no primeiro turno.',
  },
  'fool-card': {
    id: 'fool-card',
    name: 'Carta do Louco',
    description: '10% de chance de curar 2 HP ao vencer um combate.',
  },
  'crimson-flame': {
    id: 'crimson-flame',
    name: 'Chama Carmesim',
    description: 'O primeiro feitiço de cada turno custa 1 a menos.',
  },
  'tyrant-seal': {
    id: 'tyrant-seal',
    name: 'Sinete do Tirano',
    description: 'O primeiro lacaio jogado a cada turno ganha +1 Ataque.',
  },
  'sealed-hourglass': {
    id: 'sealed-hourglass',
    name: 'Ampulheta Selada',
    description: '+5 HP máximo.',
  },
  'torn-page': {
    id: 'torn-page',
    name: 'Página Rasgada',
    description: 'Uma vez por combate: evita o primeiro 5+ de dano no herói.',
  },
};

export const ALL_RELIC_IDS: RelicId[] = Object.keys(RUN_RELICS) as RelicId[];

export function getRelic(id: RelicId): RunRelic {
  return RUN_RELICS[id];
}

export function getMaxHealthBonus(relics: RelicId[]): number {
  return relics.includes('sealed-hourglass') ? 5 : 0;
}
