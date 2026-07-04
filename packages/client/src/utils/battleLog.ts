import type { GameEvent, GameState } from 'game-engine';
import { PATHWAYS } from 'game-engine';

export type BattleLogType = 'action' | 'damage' | 'system' | 'reward' | 'enemy';

export interface FormattedLogEntry {
  text: string;
  type: BattleLogType;
}

function resolveMinionName(state: GameState, instanceId: string): string {
  for (const player of state.players) {
    const onBoard = player.board.find((m) => m.instanceId === instanceId);
    if (onBoard) return onBoard.card.name;
  }
  for (const event of state.log) {
    if (event.type === 'minion-death' && event.data.instanceId === instanceId) {
      return String(event.data.cardName ?? 'Minion');
    }
  }
  return 'Minion';
}

function actorLabel(playerId: string, selfId: string, opponentId: string): string {
  if (playerId === selfId) return 'Você';
  if (playerId === opponentId) return 'Inimigo';
  return 'Jogador';
}

function formatMinionDeath(
  event: GameEvent,
  state: GameState,
  eventIndex: number,
  selfId: string,
  opponentId: string
): string {
  const instanceId = String(event.data.instanceId);
  const cardName = String(event.data.cardName ?? 'Minion');
  const namePart = event.playerId === selfId ? `Seu ${cardName}` : `Inimigo ${cardName}`;

  // Hero power / secrets can be logged after minion-death when events were out of order
  for (let i = eventIndex + 1; i < Math.min(state.log.length, eventIndex + 3); i++) {
    const next = state.log[i];
    if (next.type === 'hero-power') {
      const pathway = String(next.data.pathway ?? '');
      const powerName = PATHWAYS[pathway as keyof typeof PATHWAYS]?.powerName ?? 'Poder';
      return `💀 ${namePart} morreu pelo poder ${powerName}`;
    }
    if (next.type === 'secret-triggered') {
      const secretName = String(next.data.secretName ?? 'Segredo');
      return `💀 ${namePart} morreu pelo segredo ${secretName}`;
    }
  }

  for (let i = eventIndex - 1; i >= Math.max(0, eventIndex - 8); i--) {
    const prev = state.log[i];

    if (prev.type === 'attack') {
      const attackerId = String(prev.data.attacker);
      const targetId = String(prev.data.target);
      const attackerName = resolveMinionName(state, attackerId);
      const targetName = resolveMinionName(state, targetId);

      if (instanceId === targetId) {
        const dmg = prev.data.targetDamage ?? '?';
        return `💀 ${namePart} morreu ao receber ${dmg} de dano de ${attackerName}`;
      }
      if (instanceId === attackerId) {
        const dmg = prev.data.attackerDamage ?? '?';
        return `💀 ${namePart} morreu em combate ao atacar ${targetName} (${dmg} de dano recebido)`;
      }
    }

    if (prev.type === 'hero-power') {
      const pathway = String(prev.data.pathway ?? '');
      const powerName = PATHWAYS[pathway as keyof typeof PATHWAYS]?.powerName ?? 'Poder';
      return `💀 ${namePart} morreu pelo poder ${powerName}`;
    }

    if (prev.type === 'secret-triggered') {
      const secretName = String(prev.data.secretName ?? 'Segredo');
      return `💀 ${namePart} morreu pelo segredo ${secretName}`;
    }

    if (prev.type === 'play-card' && prev.data.cardType === 'ritual') {
      const spellName = String(prev.data.cardName ?? 'ritual');
      return `💀 ${namePart} morreu pelo ritual ${spellName}`;
    }
  }

  return `💀 ${namePart} morreu`;
}

export function formatGameEvent(
  event: GameEvent,
  state: GameState,
  selfId: string,
  opponentId: string,
  eventIndex?: number
): FormattedLogEntry | null {
  const actor = actorLabel(event.playerId, selfId, opponentId);
  const isEnemy = event.playerId === opponentId;

  switch (event.type) {
    case 'play-card':
      return {
        text: `${actor} jogou ${event.data.cardName ?? 'uma carta'}`,
        type: isEnemy ? 'enemy' : 'action',
      };

    case 'attack': {
      const attackerName = resolveMinionName(state, String(event.data.attacker));
      const targetName = resolveMinionName(state, String(event.data.target));
      const dmg = event.data.targetDamage ?? '?';
      const counter = event.data.attackerDamage ?? 0;
      const counterNote = counter ? ` · retaliação ${counter}` : '';
      return {
        text: `${actor}: ${attackerName} → ${targetName} (${dmg} dano${counterNote})`,
        type: isEnemy ? 'enemy' : 'damage',
      };
    }

    case 'attack-hero': {
      const attackerName = resolveMinionName(state, String(event.data.attacker));
      const dmg = event.data.damage ?? '?';
      const targetLabel = isEnemy ? 'seu herói' : 'herói inimigo';
      return {
        text: `${actor}: ${attackerName} ataca ${targetLabel} (${dmg} dano)`,
        type: isEnemy ? 'enemy' : 'damage',
      };
    }

    case 'minion-death': {
      const idx = eventIndex ?? state.log.indexOf(event);
      const text = idx >= 0
        ? formatMinionDeath(event, state, idx, selfId, opponentId)
        : `💀 ${event.data.cardName ?? 'Minion'} morreu`;
      return {
        text,
        type: event.playerId === selfId ? 'damage' : 'enemy',
      };
    }

    case 'hero-power': {
      const pathway = String(event.data.pathway ?? '');
      const powerName = PATHWAYS[pathway as keyof typeof PATHWAYS]?.powerName ?? 'Poder';
      return {
        text: `${actor} usou ${powerName}`,
        type: isEnemy ? 'enemy' : 'action',
      };
    }

    case 'secret-triggered':
      return {
        text: `${isEnemy ? 'Inimigo' : 'Você'} revelou segredo: ${event.data.secretName ?? '???'}`,
        type: isEnemy ? 'enemy' : 'system',
      };

    case 'fate-coin':
      return { text: `${actor} usou Fate Coin (+1 Spirituality)`, type: 'action' };

    case 'madness-damage':
      return {
        text: `${actor} sofreu ${event.data.damage} de dano (Madness)`,
        type: 'damage',
      };

    case 'fatigue':
      return {
        text: `${actor} sofreu ${event.data.damage} de dano (Fatigue)`,
        type: 'damage',
      };

    default:
      return null;
  }
}
