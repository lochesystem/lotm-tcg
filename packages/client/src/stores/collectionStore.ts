import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStarterDeck, getStoryWinUnlock, isPathwayUnlocked as checkPathwayUnlocked, type Pathway } from 'game-engine';
import type { PlayerProgress } from '../sync/player-sync';
import {
  addCardsToCloud,
  recordNpcWinCloud,
  recordNpcLossCloud,
  recordStoryWinCloud,
  saveProgress,
  addEssenceToCloud,
  spendEssenceCloud,
} from '../sync/player-sync';
import { getCurrentUserId } from '../lib/sessionContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface CollectionStore {
  ownedCardIds: Record<string, number>;
  winStreak: number;
  wins: number;
  losses: number;
  storyProgress: number;
  essenceBalance: number;
  totalOwned: () => number;
  ownsCard: (cardId: string) => boolean;
  getQuantity: (cardId: string) => number;
  isPathwayUnlocked: (pathway: Pathway) => boolean;
  hydrateFromCloud: (progress: PlayerProgress) => void;
  addCards: (cardIds: string[]) => Promise<void>;
  addEssence: (amount: number) => Promise<void>;
  spendEssence: (amount: number) => Promise<boolean>;
  recordNpcWin: () => Promise<number>;
  recordStoryWin: () => Promise<{ streak: number; unlockedPathway: Pathway | null }>;
  recordNpcLoss: () => Promise<void>;
  initStarterCollection: (pathway: Pathway) => void;
  syncToCloud: () => Promise<void>;
}

function applyProgress(set: (p: Partial<CollectionStore>) => void, progress: PlayerProgress) {
  set({
    ownedCardIds: progress.ownedCards,
    winStreak: progress.winStreak,
    wins: progress.wins,
    losses: progress.losses,
    storyProgress: progress.storyProgress,
    essenceBalance: progress.essenceBalance,
  });
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      ownedCardIds: {},
      winStreak: 0,
      wins: 0,
      losses: 0,
      storyProgress: 0,
      essenceBalance: 0,

      totalOwned: () => Object.values(get().ownedCardIds).reduce((sum, qty) => sum + qty, 0),

      ownsCard: (cardId: string) => (get().ownedCardIds[cardId] ?? 0) > 0,

      getQuantity: (cardId: string) => get().ownedCardIds[cardId] ?? 0,

      isPathwayUnlocked: (pathway: Pathway) => checkPathwayUnlocked(pathway, get().storyProgress),

      hydrateFromCloud: (progress) => {
        applyProgress(set, progress);
      },

      syncToCloud: async () => {
        const userId = getCurrentUserId();
        if (!userId || !isSupabaseConfigured) return;
        const state = get();
        await saveProgress(userId, {
          ownedCards: state.ownedCardIds,
          winStreak: state.winStreak,
          wins: state.wins,
          losses: state.losses,
          storyProgress: state.storyProgress,
          essenceBalance: state.essenceBalance,
        });
      },

      addEssence: async (amount) => {
        const userId = getCurrentUserId();
        if (userId && isSupabaseConfigured) {
          const progress = await addEssenceToCloud(userId, amount);
          applyProgress(set, progress);
          return;
        }
        set({ essenceBalance: get().essenceBalance + amount });
      },

      spendEssence: async (amount) => {
        const userId = getCurrentUserId();
        if (userId && isSupabaseConfigured) {
          const progress = await spendEssenceCloud(userId, amount);
          if (!progress) return false;
          applyProgress(set, progress);
          return true;
        }
        const current = get().essenceBalance;
        if (current < amount) return false;
        set({ essenceBalance: current - amount });
        return true;
      },

      addCards: async (cardIds) => {
        const userId = getCurrentUserId();
        if (userId && isSupabaseConfigured) {
          const progress = await addCardsToCloud(userId, cardIds);
          applyProgress(set, progress);
          return;
        }
        const current = { ...get().ownedCardIds };
        for (const id of cardIds) {
          current[id] = (current[id] ?? 0) + 1;
        }
        set({ ownedCardIds: current });
      },

      recordNpcWin: async () => {
        const userId = getCurrentUserId();
        if (userId && isSupabaseConfigured) {
          const progress = await recordNpcWinCloud(userId);
          applyProgress(set, progress);
          return progress.winStreak;
        }
        const winStreak = get().winStreak + 1;
        set({ winStreak, wins: get().wins + 1 });
        return winStreak;
      },

      recordStoryWin: async () => {
        const userId = getCurrentUserId();
        if (userId && isSupabaseConfigured) {
          const { progress, unlockedPathway } = await recordStoryWinCloud(userId);
          applyProgress(set, progress);
          return { streak: progress.winStreak, unlockedPathway };
        }
        const storyProgress = get().storyProgress;
        const unlockedPathway = getStoryWinUnlock(storyProgress);
        const winStreak = get().winStreak + 1;
        set({
          storyProgress: storyProgress + 1,
          winStreak,
          wins: get().wins + 1,
        });
        return { streak: winStreak, unlockedPathway };
      },

      recordNpcLoss: async () => {
        const userId = getCurrentUserId();
        if (userId && isSupabaseConfigured) {
          const progress = await recordNpcLossCloud(userId);
          applyProgress(set, progress);
          return;
        }
        set({ winStreak: 0, losses: get().losses + 1 });
      },

      initStarterCollection: (pathway: Pathway) => {
        const { ownedCardIds } = get();
        if (Object.keys(ownedCardIds).length > 0) return;

        const deck = createStarterDeck(pathway);
        const initial: Record<string, number> = {};
        for (const cardId of deck.cards) {
          initial[cardId] = (initial[cardId] ?? 0) + 1;
        }
        set({ ownedCardIds: initial });
      },
    }),
    {
      name: 'lotm-tcg-collection',
      partialize: (state) => ({
        ownedCardIds: state.ownedCardIds,
        winStreak: state.winStreak,
        wins: state.wins,
        losses: state.losses,
        storyProgress: state.storyProgress,
        essenceBalance: state.essenceBalance,
      }),
    }
  )
);
