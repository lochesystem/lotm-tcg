import type { PackType } from '../packs.js';
import type { Pathway } from '../types.js';
import { STORY_BOSS_ORDER } from '../story.js';

export type ShopPackId =
  | 'ordinary'
  | 'beyonder'
  | 'sealed'
  | 'pathway-red-priest'
  | 'pathway-tyrant'
  | 'pathway-sun'
  | 'pathway-door'
  | 'pathway-demoness';

export interface ShopPackDefinition {
  id: ShopPackId;
  name: string;
  packType: PackType;
  pathway?: Pathway;
  cost: number;
  /** Minimum storyProgress to unlock (0 = always) */
  storyRequired: number;
}

export const SHOP_PACKS: ShopPackDefinition[] = [
  { id: 'ordinary', name: 'Pacote Comum', packType: 'ordinary', cost: 100, storyRequired: 0 },
  { id: 'beyonder', name: 'Pacote Beyonder', packType: 'beyonder', cost: 250, storyRequired: 0 },
  { id: 'sealed', name: 'Pacote Selado', packType: 'sealed', cost: 500, storyRequired: 3 },
  { id: 'pathway-red-priest', name: 'Pacote Red Priest', packType: 'beyonder', pathway: 'red-priest', cost: 300, storyRequired: 1 },
  { id: 'pathway-tyrant', name: 'Pacote Tyrant', packType: 'beyonder', pathway: 'tyrant', cost: 300, storyRequired: 2 },
  { id: 'pathway-sun', name: 'Pacote Sun', packType: 'beyonder', pathway: 'sun', cost: 350, storyRequired: 3 },
  { id: 'pathway-door', name: 'Pacote Door', packType: 'beyonder', pathway: 'door', cost: 350, storyRequired: 4 },
  { id: 'pathway-demoness', name: 'Pacote Demoness', packType: 'sealed', pathway: 'demoness', cost: 400, storyRequired: 5 },
];

export function getUnlockedShopPacks(storyProgress: number): ShopPackDefinition[] {
  return SHOP_PACKS.filter((p) => storyProgress >= p.storyRequired);
}

export function isShopPackUnlocked(packId: ShopPackId, storyProgress: number): boolean {
  const pack = SHOP_PACKS.find((p) => p.id === packId);
  if (!pack) return false;
  return storyProgress >= pack.storyRequired;
}

export function getPathwayForStoryChapter(chapter: number): Pathway | null {
  return STORY_BOSS_ORDER[chapter] ?? null;
}
