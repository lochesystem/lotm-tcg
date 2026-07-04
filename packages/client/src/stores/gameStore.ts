import { create } from 'zustand';
import {
  GameState,
  GameAction,
  Pathway,
  Deck,
  createGame,
  applyAction,
  createStarterDeck,
  MinionInstance,
} from 'game-engine';
import { useCollectionStore } from './collectionStore';

export type CombatPhase = 'preview' | 'strike' | 'impact';

export interface PendingAttack {
  attackerId: string;
  targetId: string | null;
  /** When targetId is null, which hero is being targeted */
  targetHero: 'player' | 'opponent' | null;
  isNpc: boolean;
  phase: CombatPhase;
}

const NPC_TIMING = {
  turnStart: 1200,
  playCard: 1400,
  attackPreview: 2000,
  attackStrike: 1000,
  attackImpact: 600,
  attackPost: 800,
  heroPower: 1100,
  default: 700,
} as const;

interface GameStore {
  gameState: GameState | null;
  playerId: string;
  opponentId: string;
  selectedPathway: Pathway;
  deck: Deck | null;
  isOnline: boolean;
  roomCode: string | null;
  npcThinking: boolean;
  pendingAttack: PendingAttack | null;

  setPathway: (pathway: Pathway) => void;
  startLocalGame: () => void;
  performAction: (action: GameAction) => void;
  reset: () => void;
}

function npcPlayTurn(state: GameState, npcId: string): GameAction[] {
  const npcIndex = state.players.findIndex((p) => p.id === npcId);
  if (npcIndex === -1 || state.currentPlayerIndex !== npcIndex) return [{ type: 'end-turn' }];

  const actions: GameAction[] = [];
  let currentState = state;

  const npc = () => currentState.players[npcIndex];
  const opponentIndex = 1 - npcIndex;
  const opponent = () => currentState.players[opponentIndex];

  // Play cards (expensive first)
  const playableCards = npc().hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => card.cost <= npc().spirituality)
    .sort((a, b) => b.card.cost - a.card.cost);

  for (const { card } of playableCards) {
    const player = npc();
    if (card.cost > player.spirituality) continue;
    if (card.type === 'beyonder' && player.board.length >= 7) continue;

    const adjustedIdx = player.hand.findIndex((c) => c.id === card.id);
    if (adjustedIdx === -1) continue;

    const action: GameAction = { type: 'play-card', handIndex: adjustedIdx };
    try {
      currentState = applyAction(currentState, npcId, action);
      actions.push(action);
      if (currentState.phase === 'ended') return actions;
    } catch { /* skip */ }
  }

  // Attack phase
  const npcBoard = [...npc().board];
  for (const minion of npcBoard) {
    if (!minion.canAttack || minion.exhausted) continue;
    if (currentState.phase === 'ended') break;

    const opp = opponent();
    const provokeTarget = opp.board.find((m: MinionInstance) => m.keywords.has('provoke'));
    const weakTarget = [...opp.board]
      .filter((m: MinionInstance) => !m.keywords.has('stealth'))
      .sort((a: MinionInstance, b: MinionInstance) => a.currentHealth - b.currentHealth)[0];

    let action: GameAction | null = null;

    if (provokeTarget) {
      action = { type: 'attack', attackerInstanceId: minion.instanceId, targetInstanceId: provokeTarget.instanceId };
    } else if (weakTarget && minion.currentAttack >= weakTarget.currentHealth) {
      action = { type: 'attack', attackerInstanceId: minion.instanceId, targetInstanceId: weakTarget.instanceId };
    } else {
      action = { type: 'attack-hero', attackerInstanceId: minion.instanceId };
    }

    if (action) {
      try {
        currentState = applyAction(currentState, npcId, action);
        actions.push(action);
        if (currentState.phase === 'ended') return actions;
      } catch { /* skip */ }
    }
  }

  // Hero power
  const npcState = npc();
  if (!npcState.heroPowerUsed && npcState.spirituality >= 2) {
    const opp = opponent();
    const target = opp.board.length > 0 ? opp.board[0].instanceId : undefined;
    const action: GameAction = { type: 'hero-power', target };
    try {
      currentState = applyAction(currentState, npcId, action);
      actions.push(action);
    } catch { /* skip */ }
  }

  actions.push({ type: 'end-turn' });
  return actions;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  playerId: 'player-1',
  opponentId: 'npc-1',
  selectedPathway: 'fool',
  deck: null,
  isOnline: false,
  roomCode: null,
  npcThinking: false,
  pendingAttack: null,

  setPathway: (pathway) => {
    const deck = createStarterDeck(pathway);
    set({ selectedPathway: pathway, deck });
  },

  startLocalGame: () => {
    const { playerId, opponentId, selectedPathway } = get();
    const playerDeck = createStarterDeck(selectedPathway);
    const npcDeck = createStarterDeck('red-priest');

    // Garante que jogador tem coleção inicial
    useCollectionStore.getState().initStarterCollection(selectedPathway);

    const state = createGame(
      `game-${Date.now()}`,
      { id: playerId, deck: playerDeck },
      { id: opponentId, deck: npcDeck },
      Date.now()
    );

    const stateAfterMulligan = applyAction(state, playerId, { type: 'mulligan', indices: [] });
    const finalState = applyAction(stateAfterMulligan, opponentId, { type: 'mulligan', indices: [] });

    set({ gameState: finalState, deck: playerDeck });
  },

  performAction: (action) => {
    const { gameState, playerId, opponentId } = get();
    if (!gameState) return;

    try {
      const newState = applyAction(gameState, playerId, action);
      set({ gameState: { ...newState } });

      // NPC turn with step-by-step execution
      if (action.type === 'end-turn' && newState.phase !== 'ended') {
        set({ npcThinking: true });
        const npcActions = npcPlayTurn(newState, opponentId);

        const executeNpcActions = async () => {
          const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
          await wait(NPC_TIMING.turnStart);

          for (const a of npcActions) {
            const { gameState: latest } = get();
            if (!latest || latest.phase === 'ended') break;

            if (a.type === 'attack' || a.type === 'attack-hero') {
              const attackState = {
                attackerId: a.attackerInstanceId,
                targetId: a.type === 'attack' ? a.targetInstanceId : null,
                targetHero: a.type === 'attack-hero' ? ('player' as const) : null,
                isNpc: true,
                phase: 'preview' as const,
              };

              // Phase 1: arrow preview — who is attacking whom
              set({ pendingAttack: attackState });
              await wait(NPC_TIMING.attackPreview);

              // Phase 2: lunge toward target (arrow stays visible)
              set({ pendingAttack: { ...attackState, phase: 'strike' } });
              await wait(NPC_TIMING.attackStrike);

              // Phase 3: apply damage + impact flash
              try {
                const { gameState: strikeState } = get();
                if (strikeState && strikeState.phase !== 'ended') {
                  const next = applyAction(strikeState, opponentId, a);
                  set({
                    gameState: { ...next },
                    pendingAttack: { ...attackState, phase: 'impact' },
                  });
                }
              } catch {
                set({ pendingAttack: null });
              }
              await wait(NPC_TIMING.attackImpact);
              set({ pendingAttack: null });
              await wait(NPC_TIMING.attackPost);
              continue;
            }

            try {
              const next = applyAction(latest, opponentId, a);
              set({ gameState: { ...next } });
            } catch {
              if (a.type === 'end-turn') {
                try {
                  const { gameState: retry } = get();
                  if (retry && retry.phase !== 'ended') {
                    const forced = applyAction(retry, opponentId, { type: 'end-turn' });
                    set({ gameState: { ...forced } });
                  }
                } catch { /* give up */ }
              }
            }

            if (a.type === 'end-turn') break;
            await wait(
              a.type === 'play-card' ? NPC_TIMING.playCard
              : a.type === 'hero-power' ? NPC_TIMING.heroPower
              : NPC_TIMING.default
            );
          }

          // Garantir que o turno termina
          const { gameState: final } = get();
          if (final && final.phase !== 'ended' && final.currentPlayerIndex !== 0) {
            try {
              const ended = applyAction(final, opponentId, { type: 'end-turn' });
              set({ gameState: { ...ended } });
            } catch { /* already ended */ }
          }
          set({ npcThinking: false, pendingAttack: null });
        };

        executeNpcActions();
      }
    } catch (e) {
      console.warn('Invalid action:', (e as Error).message);
    }
  },

  reset: () => set({ gameState: null, npcThinking: false, pendingAttack: null }),
}));
