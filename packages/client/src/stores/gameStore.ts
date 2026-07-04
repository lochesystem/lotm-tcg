import { create } from 'zustand';
import {
  GameState,
  GameAction,
  Pathway,
  Deck,
  Card,
  RitualCard,
  SpellEffect,
  createGame,
  applyAction,
  createStarterDeck,
  MinionInstance,
  PATHWAYS,
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

export interface PendingHeroPower {
  pathway: Pathway;
  powerName: string;
  targetId: string | null;
  targetHero: 'player' | 'opponent' | null;
  isNpc: boolean;
  phase: CombatPhase;
}

export interface PendingRitual {
  cardName: string;
  pathway: Pathway;
  targetIds: string[];
  targetHero: 'player' | 'opponent' | null;
  isAoE: boolean;
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
  heroPowerPreview: 1500,
  heroPowerCharge: 900,
  heroPowerImpact: 800,
  heroPowerPost: 500,
  heroPower: 1200,
  ritualPreview: 1300,
  ritualCharge: 950,
  ritualImpact: 850,
  ritualPost: 500,
  betweenActions: 700,
} as const;

function ritualPathway(card: RitualCard): Pathway {
  return card.pathway === 'neutral' ? 'fool' : card.pathway;
}

function isDamagingRitual(card: Card): card is RitualCard {
  return card.type === 'ritual' && card.effect.type === 'damage';
}

function isAoERitual(effect: SpellEffect): boolean {
  return effect.target === 'all-enemies' || effect.target === 'all';
}

function resolveRitualTargets(
  state: GameState,
  casterId: string,
  effect: SpellEffect,
  explicitTarget?: string
): { targetIds: string[]; targetHero: 'player' | 'opponent' | null } {
  const casterIdx = state.players.findIndex((p) => p.id === casterId);
  const opponentIdx = 1 - casterIdx;
  const caster = state.players[casterIdx];
  const opponent = state.players[opponentIdx];
  const enemyHero: 'player' | 'opponent' = casterIdx === 0 ? 'opponent' : 'player';

  if (effect.target === 'all-enemies') {
    return { targetIds: opponent.board.map((m) => m.instanceId), targetHero: null };
  }

  if (effect.target === 'all') {
    return {
      targetIds: [...caster.board, ...opponent.board].map((m) => m.instanceId),
      targetHero: null,
    };
  }

  if (effect.target === 'enemy-hero') {
    return { targetIds: [], targetHero: enemyHero };
  }

  if (effect.target === 'random-enemy') {
    if (opponent.board.length > 0) {
      const pick = opponent.board[Math.floor(Math.random() * opponent.board.length)];
      return { targetIds: [pick.instanceId], targetHero: null };
    }
    return { targetIds: [], targetHero: enemyHero };
  }

  if (explicitTarget) {
    const onOpponent = opponent.board.some((m) => m.instanceId === explicitTarget);
    const onCaster = caster.board.some((m) => m.instanceId === explicitTarget);
    if (onOpponent || onCaster) {
      return { targetIds: [explicitTarget], targetHero: null };
    }
  }

  if (effect.target === 'enemy' || effect.target === 'any') {
    const pool = effect.target === 'enemy' ? opponent.board : [...opponent.board, ...caster.board];
    const pick = [...pool].sort((a, b) => a.currentHealth - b.currentHealth)[0];
    if (pick) return { targetIds: [pick.instanceId], targetHero: null };
    return { targetIds: [], targetHero: enemyHero };
  }

  if (effect.target === 'friendly' || effect.target === 'friendly-hero') {
    const pick = [...caster.board].sort((a, b) => a.currentHealth - b.currentHealth)[0];
    if (pick) return { targetIds: [pick.instanceId], targetHero: null };
    return { targetIds: [], targetHero: casterIdx === 0 ? 'player' : 'opponent' };
  }

  return { targetIds: [], targetHero: null };
}

/** Hero powers that deal damage to an enemy target and warrant attack-style VFX */
function isDamagingHeroPower(pathway: Pathway): boolean {
  return pathway === 'red-priest';
}

interface GameStore {
  gameState: GameState | null;
  playerId: string;
  opponentId: string;
  selectedPathway: Pathway;
  deck: Deck | null;
  isOnline: boolean;
  roomCode: string | null;
  npcTier: number;
  npcThinking: boolean;
  pendingAttack: PendingAttack | null;
  pendingHeroPower: PendingHeroPower | null;
  pendingRitual: PendingRitual | null;
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
    if (isDamagingRitual(card)) {
      const { targetIds } = resolveRitualTargets(state, npcId, card.effect);
      return { type: 'play-card', handIndex: idx, target: targetIds[0] };
    }
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

function resolveHeroPowerTarget(
  state: GameState,
  casterId: string,
  targetInstanceId?: string
): { targetId: string | null; targetHero: 'player' | 'opponent' | null } {
  const casterIdx = state.players.findIndex((p) => p.id === casterId);
  const opponentIdx = 1 - casterIdx;
  const opponent = state.players[opponentIdx];

  if (targetInstanceId) {
    const onBoard = opponent.board.find((m) => m.instanceId === targetInstanceId);
    if (onBoard) return { targetId: targetInstanceId, targetHero: null };
  }

  return { targetId: null, targetHero: casterIdx === 0 ? 'opponent' : 'player' };
}

async function runNpcHeroPowerSequence(
  action: GameAction & { type: 'hero-power' },
  opponentId: string,
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  wait: (ms: number) => Promise<void>
): Promise<void> {
  const { gameState } = get();
  if (!gameState || gameState.phase === 'ended') return;

  const npcIdx = gameState.players.findIndex((p) => p.id === opponentId);
  const npc = gameState.players[npcIdx];
  const pathway = npc.pathway;
  const powerName = PATHWAYS[pathway]?.powerName ?? 'Poder';

  if (!isDamagingHeroPower(pathway)) {
    try {
      const logBefore = gameState.log.length;
      const powered = applyAction(gameState, opponentId, action);
      const hadDeaths = powered.log.slice(logBefore).some((e) => e.type === 'minion-death');
      set({ gameState: { ...powered } });
      await wait(NPC_TIMING.heroPower);
      if (hadDeaths) await wait(NPC_TIMING.deathAnim);
    } catch { /* skip */ }
    return;
  }

  const { targetId, targetHero } = resolveHeroPowerTarget(gameState, opponentId, action.target);
  const powerState: PendingHeroPower = {
    pathway,
    powerName,
    targetId,
    targetHero,
    isNpc: true,
    phase: 'preview',
  };

  set({ pendingHeroPower: powerState });
  await wait(NPC_TIMING.heroPowerPreview);

  set({ pendingHeroPower: { ...powerState, phase: 'strike' } });
  await wait(NPC_TIMING.heroPowerCharge);

  set({ pendingHeroPower: { ...powerState, phase: 'impact' } });
  await wait(NPC_TIMING.heroPowerImpact);

  try {
    const { gameState: chargeState } = get();
    if (chargeState && chargeState.phase !== 'ended') {
      const logBefore = chargeState.log.length;
      const powered = applyAction(chargeState, opponentId, action);
      const hadDeaths = powered.log.slice(logBefore).some((e) => e.type === 'minion-death');
      set({ gameState: { ...powered }, pendingHeroPower: null });
      if (hadDeaths) await wait(NPC_TIMING.deathAnim);
    } else {
      set({ pendingHeroPower: null });
    }
  } catch {
    set({ pendingHeroPower: null });
  }

  await wait(NPC_TIMING.heroPowerPost);
}

async function runNpcRitualSequence(
  action: GameAction & { type: 'play-card' },
  card: RitualCard,
  opponentId: string,
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  wait: (ms: number) => Promise<void>
): Promise<void> {
  const { gameState } = get();
  if (!gameState || gameState.phase === 'ended') return;

  const { targetIds, targetHero } = resolveRitualTargets(
    gameState,
    opponentId,
    card.effect,
    action.target
  );

  const ritualState: PendingRitual = {
    cardName: card.name,
    pathway: ritualPathway(card),
    targetIds,
    targetHero,
    isAoE: isAoERitual(card.effect),
    isNpc: true,
    phase: 'preview',
  };

  set({ npcPlayReveal: { cardName: card.name } });
  await wait(NPC_TIMING.playCardIntent);

  set({ pendingRitual: ritualState, npcPlayReveal: null });
  await wait(NPC_TIMING.ritualPreview);

  set({ pendingRitual: { ...ritualState, phase: 'strike' } });
  await wait(NPC_TIMING.ritualCharge);

  set({ pendingRitual: { ...ritualState, phase: 'impact' } });
  await wait(NPC_TIMING.ritualImpact);

  try {
    const { gameState: chargeState } = get();
    if (chargeState && chargeState.phase !== 'ended') {
      const logBefore = chargeState.log.length;
      const played = applyAction(chargeState, opponentId, action);
      const hadDeaths = played.log.slice(logBefore).some((e) => e.type === 'minion-death');
      set({ gameState: { ...played }, pendingRitual: null });
      if (hadDeaths) await wait(NPC_TIMING.deathAnim);
    } else {
      set({ pendingRitual: null });
    }
  } catch {
    set({ pendingRitual: null });
  }

  await wait(NPC_TIMING.ritualPost);
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  playerId: 'player-1',
  opponentId: 'npc-1',
  selectedPathway: 'fool',
  deck: null,
  isOnline: false,
  roomCode: null,
  npcTier: 1,
  npcThinking: false,
  pendingAttack: null,
  pendingHeroPower: null,
  pendingRitual: null,
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
        set({ npcThinking: true, npcPlayReveal: null, pendingAttack: null, pendingHeroPower: null, pendingRitual: null });

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

              if (card && isDamagingRitual(card)) {
                await runNpcRitualSequence(nextAction, card, opponentId, get, set, wait);
                await wait(NPC_TIMING.betweenActions);
                continue;
              }

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
              await runNpcHeroPowerSequence(nextAction, opponentId, get, set, wait);
              await wait(NPC_TIMING.betweenActions);
              continue;
            }
          }

          set({ npcThinking: false, pendingAttack: null, pendingHeroPower: null, pendingRitual: null, npcPlayReveal: null });
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
    pendingHeroPower: null,
    pendingRitual: null,
    npcPlayReveal: null,
  }),
}));
