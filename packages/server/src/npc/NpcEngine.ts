import {
  GameState,
  GameAction,
  Deck,
  Pathway,
  applyAction,
  createStarterDeck,
  MinionInstance,
} from 'game-engine';
import { NPC_PROFILES } from 'game-engine';

export class NpcEngine {
  static getDeckForTier(tier: number): Deck {
    const profiles = NPC_PROFILES.filter((p) => p.tier === tier);
    const profile = profiles[Math.floor(Math.random() * profiles.length)] ?? NPC_PROFILES[0];
    return createStarterDeck(profile.pathway);
  }

  static playTurn(state: GameState, npcId: string): GameState {
    const npcIndex = state.players.findIndex((p) => p.id === npcId);
    if (npcIndex === -1 || state.currentPlayerIndex !== npcIndex) return state;

    const npc = state.players[npcIndex];
    let currentState = state;

    // Simple AI: play cards from hand (cheapest to most expensive that fit)
    const playableCards = npc.hand
      .map((card, idx) => ({ card, idx }))
      .filter(({ card }) => card.cost <= npc.spirituality)
      .sort((a, b) => b.card.cost - a.card.cost); // Play expensive first

    for (const { idx } of playableCards) {
      const player = currentState.players[npcIndex];
      const card = player.hand[idx];
      if (!card || card.cost > player.spirituality) continue;
      if (card.type === 'beyonder' && player.board.length >= 7) continue;

      try {
        const adjustedIdx = player.hand.findIndex((c) => c.id === card.id);
        if (adjustedIdx === -1) continue;
        currentState = applyAction(currentState, npcId, { type: 'play-card', handIndex: adjustedIdx });
      } catch {
        // Skip if invalid
      }

      if (currentState.phase === 'ended') return currentState;
    }

    // Attack phase: all minions attack
    const npcBoard = currentState.players[npcIndex].board;
    const opponentIndex = 1 - npcIndex;
    const opponent = currentState.players[opponentIndex];

    for (const minion of [...npcBoard]) {
      if (!minion.canAttack || minion.exhausted) continue;
      if (currentState.phase === 'ended') break;

      // Priority: attack provoke > attack low-hp minion > attack hero
      const provokTarget = opponent.board.find((m) => m.keywords.has('provoke'));
      const weakTarget = [...opponent.board]
        .filter((m) => !m.keywords.has('stealth'))
        .sort((a, b) => a.currentHealth - b.currentHealth)[0];

      try {
        if (provokTarget) {
          currentState = applyAction(currentState, npcId, {
            type: 'attack',
            attackerInstanceId: minion.instanceId,
            targetInstanceId: provokTarget.instanceId,
          });
        } else if (weakTarget && minion.currentAttack >= weakTarget.currentHealth) {
          currentState = applyAction(currentState, npcId, {
            type: 'attack',
            attackerInstanceId: minion.instanceId,
            targetInstanceId: weakTarget.instanceId,
          });
        } else if (!minion.keywords.has('frenzy') || minion.keywords.has('haste')) {
          currentState = applyAction(currentState, npcId, {
            type: 'attack-hero',
            attackerInstanceId: minion.instanceId,
          });
        } else if (weakTarget) {
          currentState = applyAction(currentState, npcId, {
            type: 'attack',
            attackerInstanceId: minion.instanceId,
            targetInstanceId: weakTarget.instanceId,
          });
        }
      } catch {
        // Skip invalid attacks
      }
    }

    // Use hero power if available
    const npcState = currentState.players[npcIndex];
    if (!npcState.heroPowerUsed && npcState.spirituality >= 2) {
      try {
        const opponentBoard = currentState.players[opponentIndex].board;
        const target = opponentBoard.length > 0 ? opponentBoard[0].instanceId : undefined;
        currentState = applyAction(currentState, npcId, { type: 'hero-power', target });
      } catch {
        // Some hero powers don't need target or fail
      }
    }

    // End turn
    if (currentState.phase !== 'ended') {
      try {
        currentState = applyAction(currentState, npcId, { type: 'end-turn' });
      } catch {
        // Already ended
      }
    }

    return currentState;
  }
}
