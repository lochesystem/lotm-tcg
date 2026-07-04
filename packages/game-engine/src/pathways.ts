import { PathwayDefinition } from './types.js';

export const PATHWAYS: Record<string, PathwayDefinition> = {
  fool: {
    id: 'fool',
    name: 'Fool',
    identity: 'Control / Trickery',
    powerName: 'Faceless',
    powerDescription: 'Summon a 1/1 Marionette with Stealth.',
    powerCost: 2,
  },
  'red-priest': {
    id: 'red-priest',
    name: 'Red Priest',
    identity: 'Aggro / Burn',
    powerName: 'Purify',
    powerDescription: 'Deal 1 damage to any target.',
    powerCost: 2,
  },
  tyrant: {
    id: 'tyrant',
    name: 'Tyrant',
    identity: 'Midrange / Tempo',
    powerName: 'Tempest',
    powerDescription: 'Give a friendly minion +1 Attack this turn.',
    powerCost: 2,
  },
  sun: {
    id: 'sun',
    name: 'Sun',
    identity: 'Healing / Board',
    powerName: 'Illuminate',
    powerDescription: 'Restore 2 Health to your hero or a friendly minion.',
    powerCost: 2,
  },
  door: {
    id: 'door',
    name: 'Door',
    identity: 'Combo / Steal',
    powerName: 'Trespass',
    powerDescription: "Discover a card from the opponent's Pathway.",
    powerCost: 2,
  },
  demoness: {
    id: 'demoness',
    name: 'Demoness',
    identity: 'Tempo / Removal',
    powerName: 'Bewitch',
    powerDescription: "Give an enemy minion -1 Attack until your next turn.",
    powerCost: 2,
  },
};
