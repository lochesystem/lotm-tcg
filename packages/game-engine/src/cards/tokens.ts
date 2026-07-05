import { BeyonderCard } from '../types.js';

/** Token minions — registered for summon effects, not collectible */
export const TOKEN_CARDS: BeyonderCard[] = [
  {
    id: 'token-marionette',
    name: 'Marionette',
    cost: 0,
    type: 'beyonder',
    rarity: 'common',
    pathway: 'fool',
    description: 'Stealth',
    attack: 1,
    health: 1,
    keywords: ['stealth'],
  },
  {
    id: 'token-marionette-elite',
    name: 'Marionette',
    cost: 0,
    type: 'beyonder',
    rarity: 'common',
    pathway: 'fool',
    description: 'Stealth',
    attack: 3,
    health: 3,
    keywords: ['stealth'],
  },
];
