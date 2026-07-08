import {
  GameState,
  GameAction,
  PlayerState,
  Card,
  BeyonderCard,
  MinionInstance,
  WeaponInstance,
  Pathway,
  Deck,
  GameEvent,
  Keyword,
  SecretContext,
  SpellEffect,
} from './types.js';
import { getCardById, getAllCards as getAllCardsFn } from './cards/index.js';
import { PATHWAYS } from './pathways.js';

let instanceCounter = 0;
function nextInstanceId(): string {
  return `inst_${++instanceCounter}`;
}

// ─── PRNG (mulberry32) for deterministic battles ─────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Game Creation ───────────────────────────────────────────────────────────

export function createGame(
  gameId: string,
  player1: { id: string; deck: Deck },
  player2: { id: string; deck: Deck },
  seed?: number
): GameState {
  instanceCounter = 0;
  const rng = mulberry32(seed ?? Date.now());

  const buildPlayer = (p: { id: string; deck: Deck }, goesFirst: boolean): PlayerState => {
    const cards = p.deck.cards.map((id) => getCardById(id)).filter(Boolean) as Card[];
    const shuffled = shuffleArray(cards, rng);
    const handSize = goesFirst ? 3 : 4;
    const hand = shuffled.splice(0, handSize);

    return {
      id: p.id,
      pathway: p.deck.pathway,
      health: 30,
      maxHealth: 30,
      spirituality: 0,
      maxSpirituality: 0,
      spiritualityThisTurn: 0,
      deck: shuffled,
      hand,
      board: [],
      graveyard: [],
      secrets: [],
      weapon: null,
      fatigueDamage: 0,
      heroPowerUsed: false,
      hasFateCoin: !goesFirst,
    };
  };

  const firstPlayerIdx = rng() < 0.5 ? 0 : 1;
  const p1GoesFirst = firstPlayerIdx === 0;

  return {
    id: gameId,
    players: [
      buildPlayer(player1, p1GoesFirst),
      buildPlayer(player2, !p1GoesFirst),
    ],
    currentPlayerIndex: 0,
    turn: 1,
    phase: 'mulligan',
    winner: null,
    log: [],
  };
}

// ─── Turn Management ─────────────────────────────────────────────────────────

export function startTurn(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];

  // Increase max spirituality (cap 10)
  if (player.maxSpirituality < 10) {
    player.maxSpirituality++;
  }
  player.spirituality = player.maxSpirituality;
  player.heroPowerUsed = false;

  // Draw a card
  drawCard(state, state.currentPlayerIndex);

  // Refresh minion attacks
  for (const minion of player.board) {
    minion.canAttack = true;
    minion.attacksThisTurn = 0;
    minion.exhausted = false;
    minion.summonedThisTurn = false;
  }

  // Remove temporary buffs
  for (const minion of player.board) {
    minion.buffs = minion.buffs.filter((b) => !b.temporary);
    recalculateStats(minion);
  }

  addEvent(state, player.id, 'turn-start', { turn: state.turn });
  return state;
}

export function endTurn(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];

  // Madness damage
  for (const minion of player.board) {
    if (minion.keywords.has('madness') && minion.card.madnessValue) {
      player.health -= minion.card.madnessValue;
      addEvent(state, player.id, 'madness-damage', {
        minionId: minion.instanceId,
        damage: minion.card.madnessValue,
      });
    }
  }

  checkGameOver(state);
  if (state.phase === 'ended') return state;

  // Switch player
  state.currentPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;
  state.turn++;
  startTurn(state);

  return state;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export function applyAction(state: GameState, playerId: string, action: GameAction): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) throw new Error('Player not found');
  if (state.phase === 'ended') throw new Error('Game is over');

  if (action.type === 'mulligan') {
    return applyMulligan(state, playerIndex, action.indices);
  }

  if (action.type === 'concede') {
    return applyConcede(state, playerIndex);
  }

  if (state.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  switch (action.type) {
    case 'play-card':
      return playCard(state, playerIndex, action.handIndex, action.target, action.boardPosition, action.skipSecrets);
    case 'resolve-secrets':
      return resolveDeferredSecrets(state, playerIndex, action.trigger, action.context);
    case 'attack':
      return attackMinion(state, playerIndex, action.attackerInstanceId, action.targetInstanceId);
    case 'attack-hero':
      return attackHero(state, playerIndex, action.attackerInstanceId);
    case 'hero-power':
      return useHeroPower(state, playerIndex, action.target);
    case 'hero-attack':
      return heroAttack(state, playerIndex, action.targetInstanceId);
    case 'end-turn':
      return endTurn(state);
    case 'use-fate-coin':
      return useFateCoin(state, playerIndex);
    default:
      throw new Error('Unknown action');
  }
}

// ─── Mulligan ────────────────────────────────────────────────────────────────

function applyMulligan(state: GameState, playerIndex: number, indices: number[]): GameState {
  const player = state.players[playerIndex];
  const toReplace = indices.filter((i) => i >= 0 && i < player.hand.length);

  for (const idx of toReplace.sort((a, b) => b - a)) {
    const card = player.hand.splice(idx, 1)[0];
    player.deck.push(card);
  }

  // Shuffle deck and draw replacements
  player.deck = shuffleArray(player.deck, Math.random);
  for (let i = 0; i < toReplace.length; i++) {
    if (player.deck.length > 0) {
      player.hand.push(player.deck.shift()!);
    }
  }

  addEvent(state, player.id, 'mulligan', { replaced: toReplace.length });

  // Check if both players have mulliganed (simplified: auto-start after first mulligan in single-player)
  const bothReady = state.log.filter((e) => e.type === 'mulligan').length >= 2;
  if (bothReady || state.players.every((_, i) => state.log.some((e) => e.playerId === state.players[i].id && e.type === 'mulligan'))) {
    state.phase = 'playing';
    startTurn(state);
  }

  return state;
}

function applyConcede(state: GameState, playerIndex: number): GameState {
  if (state.phase !== 'playing') {
    throw new Error('Cannot concede now');
  }

  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];

  state.phase = 'ended';
  state.winner = opponent.id;
  addEvent(state, player.id, 'concede', {});

  return state;
}

// ─── Play Card ───────────────────────────────────────────────────────────────

function playCard(
  state: GameState,
  playerIndex: number,
  handIndex: number,
  target?: string,
  boardPosition?: number,
  skipSecrets = false,
): GameState {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];

  if (handIndex < 0 || handIndex >= player.hand.length) {
    throw new Error('Invalid hand index');
  }

  const card = player.hand[handIndex];
  if (card.cost > player.spirituality) {
    throw new Error('Not enough Spirituality');
  }

  player.spirituality -= card.cost;
  player.hand.splice(handIndex, 1);

  if (card.type !== 'mystical-item') {
    addEvent(state, player.id, 'play-card', { cardId: card.id, cardName: card.name, cardType: card.type });
  }

  switch (card.type) {
    case 'beyonder': {
      const minionId = playBeyonder(state, playerIndex, card as BeyonderCard, boardPosition);
      if (!skipSecrets) {
        checkTriggerSecrets(state, 1 - playerIndex, 'on-minion-played', {
          playedMinionInstanceId: minionId,
          playedMinionPlayerIndex: playerIndex,
        });
      }
      break;
    }
    case 'sealed-artifact':
      playSealedArtifact(state, playerIndex, card);
      break;
    case 'ritual':
      playRitual(state, playerIndex, card, target);
      if (!skipSecrets) {
        checkTriggerSecrets(state, 1 - playerIndex, 'on-spell-cast', {
          playedMinionPlayerIndex: playerIndex,
        });
      }
      break;
    case 'mystical-item':
      playMysticalItem(state, playerIndex, card);
      break;
  }
  checkGameOver(state);
  return state;
}

function playBeyonder(state: GameState, playerIndex: number, card: BeyonderCard, position?: number): string {
  const player = state.players[playerIndex];
  if (player.board.length >= 7) throw new Error('Board is full');

  const instance: MinionInstance = {
    instanceId: nextInstanceId(),
    card,
    currentAttack: card.attack,
    currentHealth: card.health,
    maxHealth: card.health,
    canAttack: false,
    attacksThisTurn: 0,
    keywords: new Set(card.keywords || []),
    buffs: [],
    exhausted: true,
    summonedThisTurn: true,
  };

  if (instance.keywords.has('haste')) {
    instance.canAttack = true;
    instance.exhausted = false;
  } else if (instance.keywords.has('frenzy')) {
    instance.canAttack = true;
    instance.exhausted = false;
  }

  const pos = position ?? player.board.length;
  player.board.splice(pos, 0, instance);

  if (card.battlecry) {
    const effects = Array.isArray(card.battlecry) ? card.battlecry : [card.battlecry];
    for (const effect of effects) {
      resolveBattlecry(state, playerIndex, effect);
    }
    addEvent(state, player.id, 'battlecry', { cardId: card.id, cardName: card.name });
  }

  return instance.instanceId;
}

function playSealedArtifact(state: GameState, playerIndex: number, card: Card): void {
  const player = state.players[playerIndex];
  const artifact = card as import('./types.js').SealedArtifactCard;
  player.weapon = {
    card: artifact,
    currentAttack: artifact.attack,
    durability: artifact.durability,
  };
}

function playRitual(state: GameState, playerIndex: number, card: Card, target?: string): void {
  const ritual = card as import('./types.js').RitualCard;
  applyEffect(state, playerIndex, ritual.effect, target);
  state.players[playerIndex].graveyard.push(card);
}

function playMysticalItem(state: GameState, playerIndex: number, card: Card): void {
  const player = state.players[playerIndex];
  if (player.secrets.length >= 3) throw new Error('Max 3 secrets');
  const mystical = card as import('./types.js').MysticalItemCard;
  player.secrets.push({
    instanceId: nextInstanceId(),
    card: mystical,
  });
  addEvent(state, player.id, 'secret-set', { cardId: mystical.id, cardName: mystical.name });
}

// ─── Attack ──────────────────────────────────────────────────────────────────

/** Frenzy = rush minions only; Haste = charge (any target) on the turn they are played. */
export function canMinionAttackHero(minion: MinionInstance): boolean {
  if (minion.keywords.has('haste')) return true;
  if (minion.keywords.has('frenzy') && minion.summonedThisTurn) return false;
  return true;
}

function attackMinion(
  state: GameState,
  playerIndex: number,
  attackerInstanceId: string,
  targetInstanceId: string
): GameState {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];

  const attacker = player.board.find((m) => m.instanceId === attackerInstanceId);
  if (!attacker) throw new Error('Attacker not found');
  if (!attacker.canAttack || attacker.exhausted) throw new Error('Cannot attack');

  // Frenzy can only attack minions, not hero
  const target = opponent.board.find((m) => m.instanceId === targetInstanceId);
  if (!target) throw new Error('Target not found');

  // Provoke check
  if (!target.keywords.has('provoke')) {
    const hasProvoke = opponent.board.some((m) => m.keywords.has('provoke'));
    if (hasProvoke) throw new Error('Must attack a minion with Provoke');
  }

  // Stealth check
  if (target.keywords.has('stealth')) throw new Error('Cannot target stealthed minion');

  // Combat
  dealDamageToMinion(target, attacker.currentAttack, state);
  dealDamageToMinion(attacker, target.currentAttack, state);

  // Remove stealth on attack
  attacker.keywords.delete('stealth');
  attacker.attacksThisTurn++;
  attacker.canAttack = false;

  addEvent(state, player.id, 'attack', {
    attacker: attackerInstanceId,
    target: targetInstanceId,
    attackerDamage: target.currentAttack,
    targetDamage: attacker.currentAttack,
  });

  // Remove dead minions
  removeDead(state, playerIndex);
  removeDead(state, 1 - playerIndex);
  checkGameOver(state);

  return state;
}

function attackHero(state: GameState, playerIndex: number, attackerInstanceId: string): GameState {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];

  const attacker = player.board.find((m) => m.instanceId === attackerInstanceId);
  if (!attacker) throw new Error('Attacker not found');
  if (!attacker.canAttack || attacker.exhausted) throw new Error('Cannot attack');

  // Provoke check
  const hasProvoke = opponent.board.some((m) => m.keywords.has('provoke'));
  if (hasProvoke) throw new Error('Must attack a minion with Provoke');

  if (!canMinionAttackHero(attacker)) {
    throw new Error('Frenzy cannot attack hero on its first turn');
  }

  const damage = attacker.currentAttack;
  const defenderIndex = 1 - playerIndex;
  const { negateDamage } = resolveOnHeroAttackedSecrets(state, defenderIndex, {
    attackerInstanceId,
    attackerPlayerIndex: playerIndex,
  });

  if (!negateDamage) {
    opponent.health -= damage;
  }

  attacker.keywords.delete('stealth');
  attacker.attacksThisTurn++;
  attacker.canAttack = false;

  addEvent(state, player.id, 'attack-hero', {
    attacker: attackerInstanceId,
    damage: negateDamage ? 0 : damage,
  });

  checkGameOver(state);
  return state;
}

function heroAttack(state: GameState, playerIndex: number, targetInstanceId?: string): GameState {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];

  if (!player.weapon) throw new Error('No weapon equipped');

  if (targetInstanceId) {
    const target = opponent.board.find((m) => m.instanceId === targetInstanceId);
    if (!target) throw new Error('Target not found');
    if (target.keywords.has('stealth')) throw new Error('Cannot target stealthed minion');

    const hasProvoke = opponent.board.some((m) => m.keywords.has('provoke'));
    if (hasProvoke && !target.keywords.has('provoke')) throw new Error('Must attack Provoke');

    dealDamageToMinion(target, player.weapon.currentAttack, state);
    player.health -= target.currentAttack;
  } else {
    const hasProvoke = opponent.board.some((m) => m.keywords.has('provoke'));
    if (hasProvoke) throw new Error('Must attack Provoke minion');
    const defenderIndex = 1 - playerIndex;
    const weaponDamage = player.weapon.currentAttack;
    const { negateDamage } = resolveOnHeroAttackedSecrets(state, defenderIndex, {
      attackerPlayerIndex: playerIndex,
    });
    if (!negateDamage) {
      opponent.health -= weaponDamage;
    }
  }

  player.weapon.durability--;
  if (player.weapon.durability <= 0) {
    player.weapon = null;
  }

  removeDead(state, 1 - playerIndex);
  checkGameOver(state);
  return state;
}

// ─── Hero Power ──────────────────────────────────────────────────────────────

function useHeroPower(state: GameState, playerIndex: number, target?: string): GameState {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];
  const pathwayDef = PATHWAYS[player.pathway];

  if (player.heroPowerUsed) throw new Error('Hero power already used');
  if (player.spirituality < pathwayDef.powerCost) throw new Error('Not enough Spirituality');

  player.spirituality -= pathwayDef.powerCost;
  player.heroPowerUsed = true;

  addEvent(state, player.id, 'hero-power', { pathway: player.pathway, target });

  switch (player.pathway) {
    case 'fool': {
      applyEffect(state, playerIndex, {
        type: 'summon',
        target: 'none',
        summonId: 'token-marionette',
        summonCount: 1,
      });
      break;
    }
    case 'red-priest': {
      if (!target) throw new Error('Target required');
      const resolved = resolveTarget(state, playerIndex, target);
      if (resolved.type === 'minion') {
        dealDamageToMinion(resolved.minion, 1, state);
        removeDead(state, resolved.ownerIndex);
      } else {
        resolved.player.health -= 1;
      }
      break;
    }
    case 'tyrant': {
      if (!target) throw new Error('Target required');
      const minion = player.board.find((m) => m.instanceId === target);
      if (!minion) throw new Error('Friendly minion not found');
      minion.buffs.push({ source: 'hero-power', attackMod: 1, healthMod: 0, temporary: true });
      recalculateStats(minion);
      break;
    }
    case 'sun': {
      if (!target) {
        player.health = Math.min(player.maxHealth, player.health + 2);
      } else {
        const minion = player.board.find((m) => m.instanceId === target);
        if (minion) {
          minion.currentHealth = Math.min(minion.maxHealth, minion.currentHealth + 2);
        } else {
          player.health = Math.min(player.maxHealth, player.health + 2);
        }
      }
      break;
    }
    case 'door': {
      // Discover: add a random card from opponent's pathway to hand
      const opponentPathway = opponent.pathway;
      const allCards = getAllCardsForPathway(opponentPathway);
      if (allCards.length > 0) {
        const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
        if (player.hand.length < 10) {
          player.hand.push(randomCard);
        }
      }
      break;
    }
    case 'demoness': {
      if (!target) throw new Error('Target required');
      const enemyMinion = opponent.board.find((m) => m.instanceId === target);
      if (!enemyMinion) throw new Error('Enemy minion not found');
      enemyMinion.buffs.push({ source: 'hero-power', attackMod: -1, healthMod: 0, temporary: true });
      recalculateStats(enemyMinion);
      break;
    }
  }

  checkGameOver(state);
  return state;
}

// ─── Fate Coin ───────────────────────────────────────────────────────────────

function useFateCoin(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  if (!player.hasFateCoin) throw new Error('No Fate Coin available');
  player.hasFateCoin = false;
  player.spirituality += 1;
  addEvent(state, player.id, 'fate-coin', {});
  return state;
}

// ─── Effect Resolution ───────────────────────────────────────────────────────

function resolveBattlecry(state: GameState, playerIndex: number, effect: SpellEffect): void {
  applyEffect(state, playerIndex, effect);
}

function findMinionById(
  state: GameState,
  instanceId: string,
): { minion: MinionInstance; ownerIndex: number } | null {
  for (let i = 0; i < 2; i++) {
    const minion = state.players[i].board.find((m) => m.instanceId === instanceId);
    if (minion) return { minion, ownerIndex: i };
  }
  return null;
}

function resolveEffectMinionTarget(
  state: GameState,
  playerIndex: number,
  effect: SpellEffect,
  target?: string,
  secretContext?: SecretContext,
): { minion: MinionInstance; ownerIndex: number } | null {
  const opponent = state.players[1 - playerIndex];

  if (target) {
    return findMinionById(state, target);
  }

  if (secretContext?.attackerInstanceId && effect.target === 'random-enemy') {
    return findMinionById(state, secretContext.attackerInstanceId);
  }

  if (secretContext?.playedMinionInstanceId && (effect.target === 'enemy' || effect.target === 'random-enemy')) {
    return findMinionById(state, secretContext.playedMinionInstanceId);
  }

  if (effect.target === 'random-enemy' && opponent.board.length > 0) {
    const idx = Math.floor(Math.random() * opponent.board.length);
    return { minion: opponent.board[idx], ownerIndex: 1 - playerIndex };
  }

  if (effect.target === 'enemy' && opponent.board.length > 0) {
    return { minion: opponent.board[opponent.board.length - 1], ownerIndex: 1 - playerIndex };
  }

  return null;
}

function applyEffect(
  state: GameState,
  playerIndex: number,
  effect: SpellEffect,
  target?: string,
  secretContext?: SecretContext,
): void {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];

  switch (effect.type) {
    case 'damage': {
      const value = effect.value ?? 0;
      if (effect.target === 'all-enemies') {
        opponent.health -= value;
        for (const m of [...opponent.board]) {
          dealDamageToMinion(m, value, state);
        }
        removeDead(state, 1 - playerIndex);
      } else if (effect.target === 'all-enemy-minions') {
        for (const m of [...opponent.board]) {
          dealDamageToMinion(m, value, state);
        }
        removeDead(state, 1 - playerIndex);
      } else if (effect.target === 'enemy-hero') {
        opponent.health -= value;
      } else if (effect.target === 'all') {
        for (const m of [...player.board, ...opponent.board]) {
          dealDamageToMinion(m, value, state);
        }
        removeDead(state, 0);
        removeDead(state, 1);
      } else if (effect.target === 'all-characters') {
        player.health -= value;
        opponent.health -= value;
        for (const m of [...player.board, ...opponent.board]) {
          dealDamageToMinion(m, value, state);
        }
        removeDead(state, 0);
        removeDead(state, 1);
      } else if (effect.target === 'random-enemy') {
        const resolved = resolveEffectMinionTarget(state, playerIndex, effect, target, secretContext);
        if (resolved) {
          dealDamageToMinion(resolved.minion, value, state);
          removeDead(state, resolved.ownerIndex);
        }
      } else if (target) {
        const resolved = resolveTarget(state, playerIndex, target);
        if (resolved.type === 'minion') {
          dealDamageToMinion(resolved.minion, value, state);
          removeDead(state, resolved.ownerIndex);
        } else {
          resolved.player.health -= value;
        }
      } else if (effect.target === 'enemy') {
        const resolved = resolveEffectMinionTarget(state, playerIndex, effect, target, secretContext);
        if (resolved) {
          dealDamageToMinion(resolved.minion, value, state);
          removeDead(state, resolved.ownerIndex);
        }
      }
      break;
    }
    case 'heal': {
      const value = effect.value ?? 0;
      if (effect.target === 'friendly-hero' || (!target && effect.target === 'any')) {
        player.health = Math.min(player.maxHealth, player.health + value);
      } else if (target) {
        const minion = player.board.find((m) => m.instanceId === target);
        if (minion) {
          minion.currentHealth = Math.min(minion.maxHealth, minion.currentHealth + value);
        }
      }
      break;
    }
    case 'draw': {
      const count = effect.value ?? 1;
      for (let i = 0; i < count; i++) {
        drawCard(state, playerIndex);
      }
      break;
    }
    case 'buff': {
      if (effect.target === 'all-friendlies') {
        for (const m of player.board) {
          if (effect.buffAttack) {
            m.buffs.push({
              source: 'secret',
              attackMod: effect.buffAttack,
              healthMod: effect.buffHealth ?? 0,
              temporary: false,
            });
            recalculateStats(m);
          }
          if (effect.buffHealth && effect.buffHealth > 0) {
            m.currentHealth += effect.buffHealth;
          }
        }
      } else if (target) {
        const minion = player.board.find((m) => m.instanceId === target) ??
                       opponent.board.find((m) => m.instanceId === target);
        if (minion) {
          minion.buffs.push({
            source: 'spell',
            attackMod: effect.buffAttack ?? 0,
            healthMod: effect.buffHealth ?? 0,
            temporary: false,
          });
          recalculateStats(minion);
          if (effect.buffHealth && effect.buffHealth > 0) {
            minion.currentHealth += effect.buffHealth;
          }
        }
      }
      break;
    }
    case 'debuff': {
      const resolved = resolveEffectMinionTarget(state, playerIndex, effect, target, secretContext);
      if (resolved) {
        resolved.minion.buffs.push({
          source: 'secret',
          attackMod: effect.buffAttack ?? 0,
          healthMod: effect.buffHealth ?? 0,
          temporary: false,
        });
        recalculateStats(resolved.minion);
      }
      break;
    }
    case 'return': {
      const resolved = resolveEffectMinionTarget(state, playerIndex, effect, target, secretContext);
      if (resolved) {
        const owner = state.players[resolved.ownerIndex];
        owner.hand.push(resolved.minion.card);
        owner.board = owner.board.filter((m) => m.instanceId !== resolved.minion.instanceId);
        addEvent(state, owner.id, 'minion-returned', {
          instanceId: resolved.minion.instanceId,
          cardName: resolved.minion.card.name,
        });
      }
      break;
    }
    case 'destroy': {
      if (effect.target === 'random-enemy') {
        if (opponent.board.length > 0) {
          const idx = Math.floor(Math.random() * opponent.board.length);
          opponent.board.splice(idx, 1);
        }
      } else if (effect.target === 'all-enemy-minions') {
        opponent.board = [];
      } else if (target) {
        const idx = opponent.board.findIndex((m) => m.instanceId === target);
        if (idx !== -1) opponent.board.splice(idx, 1);
      }
      break;
    }
    case 'summon': {
      if (effect.summonId) {
        const count = effect.summonCount ?? 1;
        for (let i = 0; i < count; i++) {
          if (player.board.length >= 7) break;
          const card = getCardById(effect.summonId);
          if (card && card.type === 'beyonder') {
            playBeyonder(state, playerIndex, card as BeyonderCard);
          }
        }
      }
      break;
    }
    default:
      break;
  }
}

// ─── Secrets ─────────────────────────────────────────────────────────────────

function resolveDeferredSecrets(
  state: GameState,
  triggeringPlayerIndex: number,
  trigger: import('./types.js').SecretTrigger,
  context: SecretContext,
): GameState {
  checkTriggerSecrets(state, 1 - triggeringPlayerIndex, trigger, context);
  checkGameOver(state);
  return state;
}

function shouldTriggerDeathSecret(
  secretCardId: string,
  secretOwnerIndex: number,
  context: SecretContext,
): boolean {
  if (secretCardId === 's-sanctuary-ward') {
    return context.deadMinionPlayerIndex === secretOwnerIndex;
  }
  return true;
}

function resolveOnHeroAttackedSecrets(
  state: GameState,
  defenderIndex: number,
  context: SecretContext,
): { negateDamage: boolean } {
  const defender = state.players[defenderIndex];
  const toRemove: number[] = [];
  let negateDamage = false;

  for (let i = 0; i < defender.secrets.length; i++) {
    const secret = defender.secrets[i];
    if (secret.card.trigger !== 'on-hero-attacked') continue;

    if (secret.card.id === 'f-gray-fog-barrier') {
      negateDamage = true;
      for (const m of defender.board) {
        m.keywords.add('stealth');
      }
    } else {
      applyEffect(state, defenderIndex, secret.card.effect, undefined, context);
    }

    toRemove.push(i);
    addEvent(state, defender.id, 'secret-triggered', {
      secretName: secret.card.name,
      secretId: secret.card.id,
    });
  }

  for (const idx of toRemove.reverse()) {
    defender.graveyard.push(defender.secrets[idx].card);
    defender.secrets.splice(idx, 1);
  }

  if (context.attackerInstanceId != null && context.attackerPlayerIndex != null) {
    removeDead(state, context.attackerPlayerIndex);
  }

  return { negateDamage };
}

function checkTriggerSecrets(
  state: GameState,
  defenderIndex: number,
  trigger: import('./types.js').SecretTrigger,
  context: SecretContext = {},
): void {
  const defender = state.players[defenderIndex];
  const toRemove: number[] = [];

  for (let i = 0; i < defender.secrets.length; i++) {
    const secret = defender.secrets[i];
    if (secret.card.trigger !== trigger) continue;
    if (trigger === 'on-minion-death' && !shouldTriggerDeathSecret(secret.card.id, defenderIndex, context)) {
      continue;
    }

    applyEffect(state, defenderIndex, secret.card.effect, undefined, context);
    toRemove.push(i);
    addEvent(state, defender.id, 'secret-triggered', {
      secretName: secret.card.name,
      secretId: secret.card.id,
    });
  }

  for (const idx of toRemove.reverse()) {
    defender.graveyard.push(defender.secrets[idx].card);
    defender.secrets.splice(idx, 1);
  }

  if (trigger === 'on-minion-played' && context.playedMinionPlayerIndex != null) {
    removeDead(state, context.playedMinionPlayerIndex);
  }
  if (trigger === 'on-minion-death' && context.deadMinionPlayerIndex != null) {
    removeDead(state, context.deadMinionPlayerIndex);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawCard(state: GameState, playerIndex: number): void {
  const player = state.players[playerIndex];
  if (player.deck.length === 0) {
    player.fatigueDamage++;
    player.health -= player.fatigueDamage;
    addEvent(state, player.id, 'fatigue', { damage: player.fatigueDamage });
    return;
  }
  if (player.hand.length >= 10) {
    const burned = player.deck.shift()!;
    player.graveyard.push(burned);
    addEvent(state, player.id, 'card-burned', { cardId: burned.id });
    return;
  }
  player.hand.push(player.deck.shift()!);
}

function dealDamageToMinion(minion: MinionInstance, damage: number, state: GameState): void {
  if (minion.keywords.has('divination')) {
    minion.keywords.delete('divination');
    return;
  }
  minion.currentHealth -= damage;
  if (damage > 0 && minion.keywords.has('corruption')) {
    // Corruption is applied TO the attacker, not from damage received
    // Handled at combat level - here we just track that it was hit
  }
}

function removeDead(state: GameState, playerIndex: number): void {
  const player = state.players[playerIndex];
  const dead = player.board.filter((m) => m.currentHealth <= 0);
  player.board = player.board.filter((m) => m.currentHealth > 0);

  for (const m of dead) {
    player.graveyard.push(m.card);
    addEvent(state, player.id, 'minion-death', { instanceId: m.instanceId, cardName: m.card.name });
    const deathContext: SecretContext = {
      deadMinionInstanceId: m.instanceId,
      deadMinionPlayerIndex: playerIndex,
    };
    checkTriggerSecrets(state, 0, 'on-minion-death', deathContext);
    checkTriggerSecrets(state, 1, 'on-minion-death', deathContext);
  }
}

function recalculateStats(minion: MinionInstance): void {
  let atkBonus = 0;
  for (const buff of minion.buffs) {
    atkBonus += buff.attackMod;
  }
  minion.currentAttack = Math.max(0, minion.card.attack + atkBonus);
}

function checkGameOver(state: GameState): void {
  const [p1, p2] = state.players;
  if (p1.health <= 0 && p2.health <= 0) {
    state.phase = 'ended';
    state.winner = null; // draw
  } else if (p1.health <= 0) {
    state.phase = 'ended';
    state.winner = p2.id;
  } else if (p2.health <= 0) {
    state.phase = 'ended';
    state.winner = p1.id;
  }
}

function resolveTarget(
  state: GameState,
  playerIndex: number,
  targetId: string
): { type: 'minion'; minion: MinionInstance; ownerIndex: number } | { type: 'hero'; player: PlayerState } {
  for (let i = 0; i < 2; i++) {
    const minion = state.players[i].board.find((m) => m.instanceId === targetId);
    if (minion) return { type: 'minion', minion, ownerIndex: i };
  }
  if (targetId === state.players[playerIndex].id) {
    return { type: 'hero', player: state.players[playerIndex] };
  }
  return { type: 'hero', player: state.players[1 - playerIndex] };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function addEvent(state: GameState, playerId: string, type: string, data: Record<string, unknown>): void {
  state.log.push({ type, playerId, data, timestamp: Date.now() });
}

function getAllCardsForPathway(pathway: Pathway): Card[] {
  return getAllCardsFn().filter((c) => c.pathway === pathway);
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateAction(state: GameState, playerId: string, action: GameAction): string | null {
  try {
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return 'Player not found';
    if (state.phase === 'ended') return 'Game is over';

    if (action.type === 'mulligan') {
      if (state.phase !== 'mulligan') return 'Not in mulligan phase';
      return null;
    }

    if (action.type === 'concede') {
      if (state.phase !== 'playing') return 'Cannot concede now';
      return null;
    }

    if (state.currentPlayerIndex !== playerIndex) return 'Not your turn';
    const player = state.players[playerIndex];

    switch (action.type) {
      case 'play-card': {
        if (action.handIndex < 0 || action.handIndex >= player.hand.length) return 'Invalid card';
        const card = player.hand[action.handIndex];
        if (card.cost > player.spirituality) return 'Not enough Spirituality';
        if (card.type === 'beyonder' && player.board.length >= 7) return 'Board full';
        if (card.type === 'mystical-item' && player.secrets.length >= 3) return 'Max secrets';
        return null;
      }
      case 'attack': {
        const opponent = state.players[1 - playerIndex];
        const attacker = player.board.find((m) => m.instanceId === action.attackerInstanceId);
        if (!attacker) return 'Attacker not found';
        if (!attacker.canAttack || attacker.exhausted) return 'Cannot attack';
        const target = opponent.board.find((m) => m.instanceId === action.targetInstanceId);
        if (!target) return 'Target not found';
        if (target.keywords.has('stealth')) return 'Cannot target stealthed minion';
        const hasProvoke = opponent.board.some((m) => m.keywords.has('provoke'));
        if (hasProvoke && !target.keywords.has('provoke')) return 'Must attack a minion with Provoke';
        return null;
      }
      case 'attack-hero': {
        const opponent = state.players[1 - playerIndex];
        const attacker = player.board.find((m) => m.instanceId === action.attackerInstanceId);
        if (!attacker) return 'Attacker not found';
        if (!attacker.canAttack || attacker.exhausted) return 'Cannot attack';
        const hasProvoke = opponent.board.some((m) => m.keywords.has('provoke'));
        if (hasProvoke) return 'Must attack a minion with Provoke';
        if (!canMinionAttackHero(attacker)) return 'Frenzy cannot attack hero on its first turn';
        return null;
      }
      case 'hero-power': {
        if (player.heroPowerUsed) return 'Already used';
        if (player.spirituality < 2) return 'Not enough Spirituality';
        const opponent = state.players[1 - playerIndex];
        switch (player.pathway) {
          case 'red-priest':
            if (!action.target) return 'Target required';
            break;
          case 'tyrant':
            if (!action.target) return 'Target required';
            if (!player.board.some((m) => m.instanceId === action.target)) {
              return 'Friendly minion not found';
            }
            break;
          case 'demoness':
            if (!action.target) return 'Target required';
            if (!opponent.board.some((m) => m.instanceId === action.target)) {
              return 'Enemy minion not found';
            }
            break;
          default:
            break;
        }
        return null;
      }
      case 'hero-attack': {
        if (!player.weapon) return 'No weapon';
        return null;
      }
      case 'end-turn':
        return null;
      case 'use-fate-coin': {
        if (!player.hasFateCoin) return 'No Fate Coin';
        return null;
      }
      case 'resolve-secrets':
        return null;
      default:
        return 'Unknown action';
    }
  } catch (e) {
    return (e as Error).message;
  }
}

// ─── Serialization (strip Sets for JSON transport) ───────────────────────────

export function serializeState(state: GameState): unknown {
  return JSON.parse(JSON.stringify(state, (_key, value) => {
    if (value instanceof Set) return [...value];
    return value;
  }));
}

export function deserializeState(raw: unknown): GameState {
  const state = raw as GameState;
  for (const player of state.players) {
    player.secrets ??= [];
    for (const minion of player.board) {
      minion.summonedThisTurn ??= false;
      minion.keywords = new Set(minion.keywords as unknown as Keyword[]);
    }
  }
  return state;
}
