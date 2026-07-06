import { create } from 'zustand';
import {
  GameState,
  GameAction,
  Pathway,
  Deck,
  Card,
  RitualCard,
  createGame,
  applyAction,
  createStarterDeck,
  MinionInstance,
  PATHWAYS,
  getCurrentStoryBoss,
  isPathwayUnlocked,
  isStoryComplete,
  getSelectableStoryBosses,
  isStoryProgressionBoss,
  getStoryBossTier,
  getCardById,
} from 'game-engine';
import { useCollectionStore } from './collectionStore';
import { waitForTurnBannerOrTimeout } from '../constants/turnBanner';
import { getCurrentUserId } from '../lib/sessionContext';
import { updatePreferredPathway } from '../sync/player-sync';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  isDamagingRitual,
  isAoERitual,
  ritualPathway,
  isFullBoardRitual,
  resolveRitualTargets,
  inferRitualTargetsFromDiff,
} from '../utils/ritualTargets';

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
  fullBoard?: boolean;
  isNpc: boolean;
  phase: CombatPhase;
}

export interface NpcPlayReveal {
  cardName: string;
}

export type RemoteOpponentAnim =
  | {
      kind: 'attack';
      attackerId: string;
      targetId: string | null;
      targetHero: 'player' | null;
    }
  | {
      kind: 'play-card';
      cardId: string;
      cardName: string;
      cardType: string;
    };

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
  activeDeckId: string | null;
  isOnline: boolean;
  roomCode: string | null;
  opponentDisplayName: string | null;
  npcTier: number;
  isStoryMode: boolean;
  storyOpponentPathway: Pathway | null;
  storyAdvancesOnWin: boolean;
  npcThinking: boolean;
  pendingAttack: PendingAttack | null;
  pendingHeroPower: PendingHeroPower | null;
  pendingRitual: PendingRitual | null;
  npcPlayReveal: NpcPlayReveal | null;
  onlineSendAction: ((action: GameAction) => Promise<boolean>) | null;
  deferredOnlineStates: GameState[];
  remoteOpponentAnimQueue: RemoteOpponentAnim[];
  remoteOpponentAnimProcessing: boolean;
  pendingOnlineSyncQueue: GameState[];

  setPathway: (pathway: Pathway) => void;
  setActiveDeckFromCloud: (cardIds: string[], pathway: Pathway, deckId: string) => void;
  startLocalGame: () => void;
  startStoryBattle: (bossPathway?: Pathway, playerDeckOverride?: Deck) => void;
  enterOnlineBattle: (state: GameState, role: 'host' | 'guest', roomCode: string | null, opponentDisplayName: string) => void;
  syncOnlineState: (state: GameState) => void;
  applyDeferredOnlineState: () => boolean;
  shiftRemoteOpponentAnim: () => void;
  setOnlineSendAction: (send: (action: GameAction) => Promise<boolean>) => void;
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

async function runOpponentAttackAnimation(
  attackState: PendingAttack,
  set: (partial: Partial<GameStore>) => void,
  wait: (ms: number) => Promise<void>
): Promise<void> {
  set({ pendingAttack: { ...attackState, phase: 'preview' } });
  await wait(NPC_TIMING.attackPreview);

  set({ pendingAttack: { ...attackState, phase: 'strike' } });
  await wait(NPC_TIMING.attackStrike);

  set({ pendingAttack: { ...attackState, phase: 'impact' } });
  await wait(NPC_TIMING.attackImpact);
}

function flushPendingOnlineSync(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void
): void {
  const queue = get().pendingOnlineSyncQueue;
  if (queue.length === 0) return;
  const latest = queue[queue.length - 1]!;
  set({ gameState: latest, pendingOnlineSyncQueue: [] });
}

function parseRemoteOpponentAnims(
  newEvents: GameState['log'],
  opponentId: string
): RemoteOpponentAnim[] {
  const anims: RemoteOpponentAnim[] = [];

  for (const event of newEvents) {
    if (event.playerId !== opponentId) continue;

    if (event.type === 'play-card') {
      anims.push({
        kind: 'play-card',
        cardId: event.data.cardId as string,
        cardName: event.data.cardName as string,
        cardType: event.data.cardType as string,
      });
    } else if (event.type === 'attack') {
      anims.push({
        kind: 'attack',
        attackerId: event.data.attacker as string,
        targetId: event.data.target as string,
        targetHero: null,
      });
    } else if (event.type === 'attack-hero') {
      anims.push({
        kind: 'attack',
        attackerId: event.data.attacker as string,
        targetId: null,
        targetHero: 'player',
      });
    }
  }

  return anims;
}

async function runOpponentRitualAnimation(
  ritualState: PendingRitual,
  cardName: string,
  set: (partial: Partial<GameStore>) => void,
  wait: (ms: number) => Promise<void>
): Promise<void> {
  set({ npcPlayReveal: { cardName } });
  await wait(NPC_TIMING.playCardIntent);

  set({ pendingRitual: { ...ritualState, phase: 'preview' }, npcPlayReveal: null });
  await wait(NPC_TIMING.ritualPreview);

  set({ pendingRitual: { ...ritualState, phase: 'strike' } });
  await wait(NPC_TIMING.ritualCharge);

  set({ pendingRitual: { ...ritualState, phase: 'impact' } });
  await wait(NPC_TIMING.ritualImpact);
}

async function runRemotePlayAnim(
  anim: Extract<RemoteOpponentAnim, { kind: 'play-card' }>,
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  wait: (ms: number) => Promise<void>
): Promise<void> {
  const card = getCardById(anim.cardId);

  if (card && isDamagingRitual(card)) {
    const before = get().gameState;
    const after = get().deferredOnlineStates[0];
    if (before && after) {
      const { targetIds, targetHero } = inferRitualTargetsFromDiff(before, after, get().opponentId);
      const ritualState: PendingRitual = {
        cardName: card.name,
        pathway: ritualPathway(card),
        targetIds,
        targetHero,
        isAoE: isAoERitual(card.effect),
        fullBoard: isFullBoardRitual(card.effect),
        isNpc: true,
        phase: 'preview',
      };

      await runOpponentRitualAnimation(ritualState, card.name, set, wait);

      const hadDeaths = get().applyDeferredOnlineState();
      get().shiftRemoteOpponentAnim();
      set({ pendingRitual: null });
      if (hadDeaths) await wait(NPC_TIMING.deathAnim);
      await wait(NPC_TIMING.ritualPost);
      return;
    }
  }

  set({ npcPlayReveal: { cardName: anim.cardName } });
  await wait(NPC_TIMING.playCardIntent);

  const hadDeaths = get().applyDeferredOnlineState();
  get().shiftRemoteOpponentAnim();
  await wait(NPC_TIMING.playCard);
  set({ npcPlayReveal: null });

  if (hadDeaths) await wait(NPC_TIMING.deathAnim);
  await wait(NPC_TIMING.betweenActions);
}

async function runRemoteOpponentAnimQueue(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void
): Promise<void> {
  if (get().remoteOpponentAnimProcessing) return;
  set({ remoteOpponentAnimProcessing: true });

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  try {
    while (get().remoteOpponentAnimQueue.length > 0) {
      const next = get().remoteOpponentAnimQueue[0];
      if (!next) break;

      if (next.kind === 'play-card') {
        await runRemotePlayAnim(next, get, set, wait);
        continue;
      }

      const attackState: PendingAttack = {
        attackerId: next.attackerId,
        targetId: next.targetId,
        targetHero: next.targetHero,
        isNpc: true,
        phase: 'preview',
      };

      await runOpponentAttackAnimation(attackState, set, wait);

      const hadDeaths = get().applyDeferredOnlineState();
      get().shiftRemoteOpponentAnim();
      set({ pendingAttack: null });
      if (hadDeaths) await wait(NPC_TIMING.deathAnim);
      await wait(NPC_TIMING.attackPost);
    }
  } finally {
    set({ remoteOpponentAnimProcessing: false });
    flushPendingOnlineSync(get, set);
  }
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

  await runOpponentAttackAnimation(attackState, set, wait);

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
    fullBoard: isFullBoardRitual(card.effect),
    isNpc: true,
    phase: 'preview',
  };

  await runOpponentRitualAnimation(ritualState, card.name, set, wait);

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
  activeDeckId: null,
  isOnline: false,
  roomCode: null,
  opponentDisplayName: null,
  npcTier: 1,
  isStoryMode: false,
  storyOpponentPathway: null,
  storyAdvancesOnWin: false,
  npcThinking: false,
  pendingAttack: null,
  pendingHeroPower: null,
  pendingRitual: null,
  npcPlayReveal: null,
  onlineSendAction: null,
  deferredOnlineStates: [],
  remoteOpponentAnimQueue: [],
  remoteOpponentAnimProcessing: false,
  pendingOnlineSyncQueue: [],

  setPathway: (pathway) => {
    const storyProgress = useCollectionStore.getState().storyProgress;
    if (!isPathwayUnlocked(pathway, storyProgress)) return;

    const { deck } = get();
    const nextDeck =
      deck && deck.pathway === pathway && deck.cards.length === 30
        ? deck
        : createStarterDeck(pathway);

    set({ selectedPathway: pathway, deck: nextDeck });

    const userId = getCurrentUserId();
    if (userId && isSupabaseConfigured) {
      void updatePreferredPathway(userId, pathway);
    }
  },

  setActiveDeckFromCloud: (cardIds, pathway, deckId) => {
    const deck: Deck = { pathway, cards: cardIds };
    set({ deck, activeDeckId: deckId });
  },

  startLocalGame: () => {
    const { playerId, opponentId, selectedPathway, deck } = get();
    const playerDeck =
      deck && deck.cards.length === 30 && deck.pathway === selectedPathway
        ? deck
        : createStarterDeck(selectedPathway);
    const npcDeck = createStarterDeck('red-priest');

    if (!isSupabaseConfigured || !getCurrentUserId()) {
      useCollectionStore.getState().initStarterCollection(selectedPathway);
    }

    const state = createGame(
      `game-${Date.now()}`,
      { id: playerId, deck: playerDeck },
      { id: opponentId, deck: npcDeck },
      Date.now()
    );

    const stateAfterMulligan = applyAction(state, playerId, { type: 'mulligan', indices: [] });
    const finalState = applyAction(stateAfterMulligan, opponentId, { type: 'mulligan', indices: [] });

    set({ gameState: finalState, deck: playerDeck, isStoryMode: false, storyOpponentPathway: null, storyAdvancesOnWin: false });
  },

  startStoryBattle: (bossPathway, playerDeckOverride) => {
    const { playerId, opponentId, selectedPathway, deck } = get();
    const storyProgress = useCollectionStore.getState().storyProgress;
    const selectable = getSelectableStoryBosses(storyProgress);
    const resolvedBoss =
      bossPathway && selectable.includes(bossPathway)
        ? bossPathway
        : getCurrentStoryBoss(storyProgress) ?? selectable[selectable.length - 1] ?? 'red-priest';
    const tier = getStoryBossTier(resolvedBoss);
    const advances = isStoryProgressionBoss(storyProgress, resolvedBoss);

    const playerDeck =
      playerDeckOverride ??
      (deck && deck.cards.length === 30 ? deck : createStarterDeck(selectedPathway));
    const npcDeck = createStarterDeck(resolvedBoss);

    if (!isSupabaseConfigured || !getCurrentUserId()) {
      useCollectionStore.getState().initStarterCollection(selectedPathway);
    }

    const state = createGame(
      `game-${Date.now()}`,
      { id: playerId, deck: playerDeck },
      { id: opponentId, deck: npcDeck },
      Date.now()
    );

    const stateAfterMulligan = applyAction(state, playerId, { type: 'mulligan', indices: [] });
    const finalState = applyAction(stateAfterMulligan, opponentId, { type: 'mulligan', indices: [] });

    set({
      gameState: finalState,
      deck: playerDeck,
      isStoryMode: true,
      storyOpponentPathway: resolvedBoss,
      storyAdvancesOnWin: advances,
      npcTier: tier,
    });
  },

  enterOnlineBattle: (state, role, roomCode, opponentDisplayName) => {
    set({
      gameState: state,
      playerId: role,
      opponentId: role === 'host' ? 'guest' : 'host',
      isOnline: true,
      roomCode,
      opponentDisplayName,
      isStoryMode: false,
      storyOpponentPathway: null,
      storyAdvancesOnWin: false,
      npcThinking: false,
      pendingAttack: null,
      pendingHeroPower: null,
      pendingRitual: null,
      npcPlayReveal: null,
      deferredOnlineStates: [],
      remoteOpponentAnimQueue: [],
      remoteOpponentAnimProcessing: false,
      pendingOnlineSyncQueue: [],
    });
  },

  syncOnlineState: (state) => {
    const { gameState, opponentId } = get();

    if (state.phase === 'ended') {
      set({
        gameState: state,
        deferredOnlineStates: [],
        remoteOpponentAnimQueue: [],
        remoteOpponentAnimProcessing: false,
        pendingOnlineSyncQueue: [],
        npcThinking: false,
        pendingAttack: null,
        pendingHeroPower: null,
        pendingRitual: null,
        npcPlayReveal: null,
      });
      return;
    }

    if (!gameState) {
      set({ gameState: state });
      return;
    }

    const newEvents = state.log.slice(gameState.log.length);
    const opponentAnims = parseRemoteOpponentAnims(newEvents, opponentId);

    if (opponentAnims.length > 0) {
      set({
        deferredOnlineStates: [...get().deferredOnlineStates, state],
        remoteOpponentAnimQueue: [...get().remoteOpponentAnimQueue, ...opponentAnims],
      });
      void runRemoteOpponentAnimQueue(get, set);
      return;
    }

    const animPending =
      get().remoteOpponentAnimProcessing ||
      get().remoteOpponentAnimQueue.length > 0 ||
      get().deferredOnlineStates.length > 0;

    if (animPending) {
      set({ pendingOnlineSyncQueue: [...get().pendingOnlineSyncQueue, state] });
      return;
    }

    set({ gameState: state });
  },

  applyDeferredOnlineState: () => {
    const { gameState, deferredOnlineStates } = get();
    if (deferredOnlineStates.length === 0) return false;

    const [next, ...rest] = deferredOnlineStates;
    const prevLen = gameState?.log.length ?? 0;
    const hadDeath = next.log.slice(prevLen).some((e) => e.type === 'minion-death');

    set({ gameState: next, deferredOnlineStates: rest });
    return hadDeath;
  },

  shiftRemoteOpponentAnim: () => {
    const [, ...rest] = get().remoteOpponentAnimQueue;
    set({ remoteOpponentAnimQueue: rest });
  },

  setOnlineSendAction: (send) => set({ onlineSendAction: send }),

  performAction: (action) => {
    const { gameState, playerId, opponentId, isOnline, onlineSendAction } = get();
    if (!gameState) return;

    if (isOnline && onlineSendAction) {
      void onlineSendAction(action);
      return;
    }

    try {
      const newState = applyAction(gameState, playerId, action);
      const ended = newState.phase === 'ended';
      set({
        gameState: { ...newState },
        ...(ended
          ? {
              npcThinking: false,
              pendingAttack: null,
              pendingHeroPower: null,
              pendingRitual: null,
              npcPlayReveal: null,
            }
          : {}),
      });

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

  reset: () => {
    set({
      gameState: null,
      playerId: 'player-1',
      opponentId: 'npc-1',
      isOnline: false,
      roomCode: null,
      opponentDisplayName: null,
      isStoryMode: false,
      storyOpponentPathway: null,
      storyAdvancesOnWin: false,
      npcThinking: false,
      pendingAttack: null,
      pendingHeroPower: null,
      pendingRitual: null,
      npcPlayReveal: null,
      deferredOnlineStates: [],
      remoteOpponentAnimQueue: [],
      remoteOpponentAnimProcessing: false,
      pendingOnlineSyncQueue: [],
    });
  },
}));
