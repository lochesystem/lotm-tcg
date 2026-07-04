import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Card, getAllCards, createStarterDeck, getCardById, Pathway } from 'game-engine';

interface CollectionStore {
  ownedCardIds: Record<string, number>; // cardId → quantity
  winStreak: number;
  totalOwned: () => number;
  ownsCard: (cardId: string) => boolean;
  getQuantity: (cardId: string) => number;
  addCards: (cardIds: string[]) => void;
  recordNpcWin: () => number;
  recordNpcLoss: () => void;
  initStarterCollection: (pathway: Pathway) => void;
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      ownedCardIds: {},
      winStreak: 0,

      totalOwned: () => Object.values(get().ownedCardIds).reduce((sum, qty) => sum + qty, 0),

      ownsCard: (cardId: string) => (get().ownedCardIds[cardId] ?? 0) > 0,

      getQuantity: (cardId: string) => get().ownedCardIds[cardId] ?? 0,

      addCards: (cardIds: string[]) => {
        const current = { ...get().ownedCardIds };
        for (const id of cardIds) {
          current[id] = (current[id] ?? 0) + 1;
        }
        set({ ownedCardIds: current });
      },

      recordNpcWin: () => {
        const winStreak = get().winStreak + 1;
        set({ winStreak });
        return winStreak;
      },

      recordNpcLoss: () => set({ winStreak: 0 }),

      initStarterCollection: (pathway: Pathway) => {
        const { ownedCardIds } = get();
        if (Object.keys(ownedCardIds).length > 0) return; // já inicializado

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
    }
  )
);
