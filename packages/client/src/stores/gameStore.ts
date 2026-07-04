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
import { waitForTurnBannerOrTimeout } from '../constants/turnBanner';

export type CombatPhase = 'preview' | 'strike' | 'impact';

export interface PendingAttack {
  attackerId: string;
  targetId: string | null;
  targetHero: 'player' | 'opponent' | null;
  isNpc: boolean;
  phase: CombatPhase;
}

export interface NpcPlayReveal {
  cardName: string;
}

const NPC_TIMING = {
  playCardIntent: 900,
  playCard: 1600,
  attackPreview: 2000,
  attackStrike: 1000,
  attackImpact: 800,
  attackPost: 600,
  deathAnim: 1000,
  heroPower: 1200,
  betweenActions: 700,
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
  npcPlayReveal: NpcPlayReveal | null;

  setPathway: (pathway: Pathway) => void;
  startLocalGame: () => void;
  performAction: (action: GameAction) => void;
  reset: () => void;
}

/** Pick the next NPC action from the *live* board — never pre-simulate the whole turn */
function getNextNpcAction(state: GameState, npcId: string): GameAction {
  const npcIndex = state.players.findIndex((p) => p.id === npcId);
  if (npcIndex === -1 || state.currentPlayerIndex !== npcIndex) {
    return { type: 'end-turn' };
  }

  const npc = state.players[npcIndex];
  const opponent = state.players[1 - npcIndex];

  const playableCards = npc.hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => card.cost <= npc.spirituality)
    .sort((a, b) => b.card.cost - a.card.cost);

  for (const { card, idx } of playableCards) {
    if (card.cost > npc.spirituality) continue;
    if (card.type === 'beyonder' && npc.board.length >= 7) continue;
    return { type: 'play-card', handIndex: idx };
  }

  for (const minion of npc.board) {
    if (!minion.canAttack || minion.exhausted) continue;

    const provokeTarget = opponent.board.find((m: MinionInstance) => m.keywords.has('provoke'));
    const weakTarget = [...opponent.board]
      .filter((m: MinionInstance) => !m.keywords.has('stealth'))
      .sort((a: MinionInstance, b: MinionInstance) => a.currentHealth - b.currentHealth)[0];

    if (provokeTarget) {
      return {
        type: 'attack',
        attackerInstanceId: minion.instanceId,
        targetInstanceId: provokeTarget.instanceId,
      };
    }
    if (weakTarget && minion.currentAttack >= weakTarget.currentHealth) {
      return {
        type: 'attack',
        attackerInstanceId: minion.instanceId,
        targetInstanceId: weakTarget.instanceId,
      };
    }
    return { type: 'attack-hero', attackerInstanceId: minion.instanceId };
  }

  if (!npc.heroPowerUsed && npc.spirituality >= 2) {
    const target = opponent.board.length > 0 ? opponent.board[0].instanceId : undefined;
    return { type: 'hero-power', target };
  }

  return { type: 'end-turn' };
}

async function runNpcAttackSequence(
  action: GameAction & ({ type: 'attack' } | { type: 'attack-hero' }),
  opponentId: string,
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  wait: (ms: number) => Promise<void>
): Promise<void> {
  const attackState: PendingAttack = {
    attackerId: action.attackerInstanceId,
    targetId: action.type === 'attack' ? action.targetInstanceId : null,
    targetHero: action.type === 'attack-hero' ? 'player' : null,
    isNpc: true,
    phase: 'preview',
  };

  set({ pendingAttack: attackState });
  await wait(NPC_TIMING.attackPreview);

  set({ pendingAttack: { ...attackState, phase: 'strike' } });
  await wait(NPC_TIMING.attackStrike);

  set({ pendingAttack: { ...attackState, phase: 'impact' } });
  await wait(NPC_TIMING.attackImpact);

  try {
    const { gameState: strikeState } = get();
    if (strikeState && strikeState.phase !== 'ended') {
      const logBefore = strikeState.log.length;
      const next = applyAction(strikeState, opponentId, action);
      const hadDeaths = next.log.slice(logBefore).some((e) => e.type === 'minion-death');
      set({ gameState: { ...next }, pendingAttack: null });
      if (hadDeaths) await wait(NPC_TIMING.deathAnim);
    } else {
      set({ pendingAttack: null });
    }
  } catch {
    set({ pendingAttack: null });
  }

  await wait(NPC_TIMING.attackPost);
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
  npcPlayReveal: null,

  setPathway: (pathway) => {
    const deck = createStarterDeck(pathway);
    set({ selectedPathway: pathway, deck });
  },

  startLocalGame: () => {
    const { playerId, opponentId, selectedPathway } = get();
    const playerDeck = createStarterDeck(selectedPathway);
    const npcDeck = createStarterDeck('red-priest');

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

      if (action.type === 'end-turn' && newState.phase !== 'ended') {
        set({ npcThinking: true, npcPlayReveal: null, pendingAttack: null });

        const executeNpcActions = async () => {
          const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

          await waitForTurnBannerOrTimeout();

          const npcIdx = newState.players.findIndex((p) => p.id === opponentId);

          for (let step = 0; step < 40; step++) {
            const { gameState: latest } = get();
            if (!latest || latest.phase === 'ended') break;

            const nextAction = getNextNpcAction(latest, opponentId);
            if (nextAction.type === 'end-turn') {
              try {
                const ended = applyAction(latest, opponentId, { type: 'end-turn' });
                set({ gameState: { ...ended } });
              } catch { /* already ended */ }
              break;
            }

            if (nextAction.type === 'play-card') {
              const card = latest.players[npcIdx]?.hand[nextAction.handIndex];
              const cardName = card?.name ?? 'Carta';

              set({ npcPlayReveal: { cardName } });
              await wait(NPC_TIMING.playCardIntent);

              try {
                const { gameState: beforePlay } = get();
                if (beforePlay && beforePlay.phase !== 'ended') {
                  const played = applyAction(beforePlay, opponentId, nextAction);
                  set({ gameState: { ...played } });
                }
              } catch {
                set({ npcPlayReveal: null });
                break;
              }

              await wait(NPC_TIMING.playCard);
              set({ npcPlayReveal: null });
              await wait(NPC_TIMING.betweenActions);
              continue;
            }

            if (nextAction.type === 'attack' || nextAction.type === 'attack-hero') {
              await runNpcAttackSequence(nextAction, opponentId, get, set, wait);
              await wait(NPC_TIMING.betweenActions);
              continue;
            }

            if (nextAction.type === 'hero-power') {
              try {
                const { gameState: beforePower } = get();
                if (beforePower && beforePower.phase !== 'ended') {
                  const logBefore = beforePower.log.length;
                  const powered = applyAction(beforePower, opponentId, nextAction);
                  const hadDeaths = powered.log.slice(logBefore).some((e) => e.type === 'minion-death');
                  set({ gameState: { ...powered } });
                  await wait(NPC_TIMING.heroPower);
                  if (hadDeaths) await wait(NPC_TIMING.deathAnim);
                }
              } catch { /* skip */ }
              await wait(NPC_TIMING.betweenActions);
              continue;
            }
          }

          set({ npcThinking: false, pendingAttack: null, npcPlayReveal: null });
        };

        executeNpcActions();
      }
    } catch (e) {
      console.warn('Invalid action:', (e as Error).message);
    }
  },

  reset: () => set({
    gameState: null,
    npcThinking: false,
    pendingAttack: null,
    npcPlayReveal: null,
  }),
}));
