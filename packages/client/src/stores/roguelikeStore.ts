import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type RunState,
  type MapNode,
  type NodeType,
  type Pathway,
  type Card,
  type RelicId,
  type RunResult,
  type EssenceBreakdown,
  type CampChoice,
  type RunCardUpgrade,
  createRun,
  recalculateMaxHealth,
  startAct,
  ACT_COUNT,
  getAvailableNodes,
  getNodeById,
  markNodeCleared,
  advanceToNode,
  buildOpponent,
  generateCardOffers,
  generateRelicOffers,
  swapCardInDeck,
  removeCardFromDeck,
  healAtCamp,
  calculateEssence,
  pickEvent,
  applyEventChoice,
  shouldAdvanceAct,
  isRunComplete,
  runDeckToDeck,
  getCardsForPathway,
} from 'game-engine';

export type RoguelikePhase =
  | 'map'
  | 'battle'
  | 'reward-cards'
  | 'reward-relic'
  | 'camp'
  | 'event'
  | 'run-end';

interface RoguelikeStore {
  run: RunState | null;
  phase: RoguelikePhase;
  currentOpponentName: string | null;
  currentNodeType: NodeType | null;
  lastEssence: EssenceBreakdown | null;
  ascension: number;
  roguelikeWins: number;
  roguelikeLosses: number;
  bestFloor: number;

  hasActiveRun: () => boolean;
  startNewRun: (pathway: Pathway, ascension?: number) => void;
  abandonRun: () => void;
  selectNode: (nodeId: string) => void;
  completeBattle: (won: boolean, remainingHealth: number) => void;
  pickCardReward: (card: Card, removeCardId: string) => void;
  skipCardReward: () => void;
  pickRelicReward: (relicId: RelicId) => void;
  applyCampChoice: (choice: CampChoice, cardId?: string, upgrade?: RunCardUpgrade) => void;
  resolveEventChoice: (choiceId: string) => void;
  finishRunEnd: () => RunResult | null;
  getPendingNode: () => MapNode | null;
}

function updateRun(set: (p: Partial<RoguelikeStore>) => void, get: () => RoguelikeStore, patch: Partial<RunState>) {
  const run = get().run;
  if (!run) return;
  let next = { ...run, ...patch };
  next = recalculateMaxHealth(next);
  set({ run: next });
}

export const useRoguelikeStore = create<RoguelikeStore>()(
  persist(
    (set, get) => ({
      run: null,
      phase: 'map',
      currentOpponentName: null,
      currentNodeType: null,
      lastEssence: null,
      ascension: 0,
      roguelikeWins: 0,
      roguelikeLosses: 0,
      bestFloor: 0,

      hasActiveRun: () => get().run !== null && get().phase !== 'run-end',

      startNewRun: (pathway, ascension = 0) => {
        const seed = Date.now();
        const run = createRun(pathway, seed, 1, ascension);
        set({
          run,
          phase: 'map',
          currentOpponentName: null,
          currentNodeType: null,
          lastEssence: null,
          ascension,
        });
      },

      abandonRun: () => {
        set({ run: null, phase: 'map', currentOpponentName: null, currentNodeType: null });
      },

      selectNode: (nodeId) => {
        const { run } = get();
        if (!run) return;
        const node = getNodeById(run.map, nodeId);
        if (!node) return;

        const available = getAvailableNodes(run.map, run.currentNodeId);
        if (!available.some((n) => n.id === nodeId)) return;

        const map = advanceToNode(run.map, nodeId);
        let next: RunState = { ...run, map, currentNodeId: nodeId };

        switch (node.type) {
          case 'combat':
          case 'elite':
          case 'boss':
            set({
              run: next,
              phase: 'battle',
              currentOpponentName: null,
              currentNodeType: node.type,
            });
            break;
          case 'camp':
            set({ run: next, phase: 'camp', currentNodeType: 'camp' });
            break;
          case 'treasure': {
            const offers = generateRelicOffers(next.relics, next.seed + node.floor, 3);
            next = { ...next, pendingRelicOffer: offers };
            set({ run: next, phase: 'reward-relic', currentNodeType: 'treasure' });
            break;
          }
          case 'event': {
            const event = pickEvent(next.seed + node.floor * 77);
            next = { ...next, pendingEventId: event.id };
            set({ run: next, phase: 'event', currentNodeType: 'event' });
            break;
          }
          default:
            set({ run: next, phase: 'map' });
        }
      },

      completeBattle: (won, remainingHealth) => {
        const { run, currentNodeType } = get();
        if (!run || !run.currentNodeId) return;

        if (!won) {
          const result: RunResult = {
            victory: false,
            floorsCleared: run.floorsCleared,
            elitesKilled: run.elitesKilled,
            bossKilled: run.bossKilled,
            combatsWon: run.combatsWon,
            ascension: run.ascension,
          };
          const essence = calculateEssence(result);
          set({
            lastEssence: essence,
            phase: 'run-end',
            roguelikeLosses: get().roguelikeLosses + 1,
            bestFloor: Math.max(get().bestFloor, run.floorsCleared),
          });
          return;
        }

        let next: RunState = {
          ...run,
          heroHealth: remainingHealth,
          combatsWon: run.combatsWon + 1,
          floorsCleared: Math.max(run.floorsCleared, getNodeById(run.map, run.currentNodeId!)?.floor ?? run.floorsCleared),
        };

        if (currentNodeType === 'elite') {
          next.elitesKilled += 1;
        }

        const node = getNodeById(run.map, run.currentNodeId)!;
        next.map = markNodeCleared(next.map, run.currentNodeId);

        // Fool card relic: 10% heal on win
        if (next.relics.includes('fool-card') && Math.random() < 0.1) {
          next.heroHealth = Math.min(next.heroMaxHealth, next.heroHealth + 2);
        }

        if (currentNodeType === 'boss') {
          next.bossKilled = true;
          if (shouldAdvanceAct(next)) {
            next = startAct(next.act + 1, next);
            next.bossKilled = false;
            set({
              run: next,
              phase: 'map',
              currentOpponentName: null,
              currentNodeType: null,
            });
            return;
          }
          next.victory = true;
          const result: RunResult = {
            victory: true,
            floorsCleared: next.floorsCleared,
            elitesKilled: next.elitesKilled,
            bossKilled: true,
            combatsWon: next.combatsWon,
            ascension: next.ascension,
          };
          const essence = calculateEssence(result);
          set({
            run: next,
            lastEssence: essence,
            phase: 'run-end',
            roguelikeWins: get().roguelikeWins + 1,
            bestFloor: Math.max(get().bestFloor, next.floorsCleared),
          });
          return;
        }

        if (currentNodeType === 'elite') {
          const offers = generateRelicOffers(next.relics, next.seed + node.floor * 31, 3);
          next.pendingRelicOffer = offers;
          set({ run: next, phase: 'reward-relic', currentNodeType });
          return;
        }

        const offers = generateCardOffers(
          next.pathway,
          node.floor,
          next.deck.cards,
          next.seed + node.floor * 13
        );
        next.pendingCardOffer = offers;
        set({ run: next, phase: 'reward-cards', currentNodeType });
      },

      pickCardReward: (card, removeCardId) => {
        const { run } = get();
        if (!run) return;
        const cards = swapCardInDeck(run.deck.cards, card.id, removeCardId);
        updateRun(set, get, {
          deck: { ...run.deck, cards },
          pendingCardOffer: null,
        });
        set({ phase: 'map' });
      },

      skipCardReward: () => {
        updateRun(set, get, { pendingCardOffer: null });
        set({ phase: 'map' });
      },

      pickRelicReward: (relicId) => {
        const { run } = get();
        if (!run) return;
        const relics = run.relics.includes(relicId) ? run.relics : [...run.relics, relicId];
        updateRun(set, get, { relics, pendingRelicOffer: null });
        set({ phase: 'map' });
      },

      applyCampChoice: (choice, cardId, upgrade) => {
        const { run } = get();
        if (!run) return;

        let next: RunState = { ...run };

        if (choice === 'rest') {
          next.heroHealth = healAtCamp(next.heroHealth, next.heroMaxHealth);
        } else if (choice === 'remove' && cardId) {
          let cards = removeCardFromDeck(next.deck.cards, cardId);
          if (cards.length < 30) {
            const neutrals = getCardsForPathway('neutral').filter((c) => c.rarity === 'common');
            if (neutrals.length > 0) {
              cards = [...cards, neutrals[0]!.id];
            }
          }
          next.deck = { ...next.deck, cards };
        } else if (choice === 'upgrade' && cardId && upgrade) {
          next.deck = {
            ...next.deck,
            upgrades: [
              ...next.deck.upgrades.filter((u) => u.cardId !== cardId),
              upgrade,
            ],
          };
        }

        next.map = markNodeCleared(next.map, run.currentNodeId!);
        next = recalculateMaxHealth(next);
        set({ run: next, phase: 'map' });
      },

      resolveEventChoice: (choiceId) => {
        const { run } = get();
        if (!run || !run.pendingEventId) return;

        const patch = applyEventChoice(run, run.pendingEventId, choiceId, run.seed);
        let next: RunState = { ...run, ...patch };
        next.map = markNodeCleared(next.map, run.currentNodeId!);
        next = recalculateMaxHealth(next);

        if (next.pendingCardOffer && next.pendingCardOffer.length === 1) {
          set({ run: next, phase: 'reward-cards' });
          return;
        }
        if (next.pendingRelicOffer && next.pendingRelicOffer.length > 0) {
          set({ run: next, phase: 'reward-relic' });
          return;
        }

        set({ run: next, phase: 'map' });
      },

      finishRunEnd: () => {
        const { run, lastEssence } = get();
        if (!run) return null;
        const result: RunResult = {
          victory: run.victory,
          floorsCleared: run.floorsCleared,
          elitesKilled: run.elitesKilled,
          bossKilled: run.bossKilled,
          combatsWon: run.combatsWon,
          ascension: run.ascension,
        };
        set({ run: null, phase: 'map', currentOpponentName: null, currentNodeType: null });
        return result;
      },

      getPendingNode: () => {
        const { run } = get();
        if (!run?.currentNodeId) return null;
        return getNodeById(run.map, run.currentNodeId) ?? null;
      },
    }),
    {
      name: 'lotm-tcg-run',
      partialize: (state) => ({
        run: state.run,
        phase: state.phase,
        currentOpponentName: state.currentOpponentName,
        currentNodeType: state.currentNodeType,
        ascension: state.ascension,
        roguelikeWins: state.roguelikeWins,
        roguelikeLosses: state.roguelikeLosses,
        bestFloor: state.bestFloor,
      }),
    }
  )
);

export { runDeckToDeck };
