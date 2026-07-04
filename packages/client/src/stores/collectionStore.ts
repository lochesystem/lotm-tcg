import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStarterDeck, type Pathway } from 'game-engine';
import type { PlayerProgress } from '../sync/player-sync';
import {
  addCardsToCloud,
  recordNpcWinCloud,
  recordNpcLossCloud,
  saveProgress,
} from '../sync/player-sync';
import { getCurrentUserId } from '../lib/sessionContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface CollectionStore {
  ownedCardIds: Record<string, number>;
  winStreak: number;
  wins: number;
  losses: number;
  totalOwned: () => number;
  ownsCard: (cardId: string) => boolean;
  getQuantity: (cardId: string) => number;
  hydrateFromCloud: (progress: PlayerProgress) => void;
  addCards: (cardIds: string[]) => Promise<void>;
  recordNpcWin: () => Promise<number>;
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
  });
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      ownedCardIds: {},
      winStreak: 0,
      wins: 0,
      losses: 0,

      totalOwned: () => Object.values(get().ownedCardIds).reduce((sum, qty) => sum + qty, 0),

      ownsCard: (cardId: string) => (get().ownedCardIds[cardId] ?? 0) > 0,

      getQuantity: (cardId: string) => get().ownedCardIds[cardId] ?? 0,

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
        });
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
      }),
    }
  )
);
