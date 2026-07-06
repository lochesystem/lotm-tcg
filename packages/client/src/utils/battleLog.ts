import type { GameEvent, GameState } from 'game-engine';
import { PATHWAYS } from 'game-engine';
import type { Locale } from '../i18n/types';
import { translate } from '../i18n/useTranslation';

export type BattleLogType = 'action' | 'damage' | 'system' | 'reward' | 'enemy';

export interface FormattedLogEntry {
  text: string;
  type: BattleLogType;
}

function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  return translate(locale, key, vars);
}

function resolveMinionName(state: GameState, instanceId: string, locale: Locale): string {
  for (const player of state.players) {
    const onBoard = player.board.find((m) => m.instanceId === instanceId);
    if (onBoard) return onBoard.card.name;
  }
  for (const event of state.log) {
    if (event.type === 'minion-death' && event.data.instanceId === instanceId) {
      return String(event.data.cardName ?? t(locale, 'battle.events.minion'));
    }
  }
  return t(locale, 'battle.events.minion');
}

function actorLabel(
  locale: Locale,
  playerId: string,
  selfId: string,
  opponentId: string,
): string {
  if (playerId === selfId) return t(locale, 'battle.events.you');
  if (playerId === opponentId) return t(locale, 'battle.events.enemy');
  return t(locale, 'battle.events.player');
}

function formatMinionDeath(
  event: GameEvent,
  state: GameState,
  eventIndex: number,
  selfId: string,
  opponentId: string,
  locale: Locale,
): string {
  const instanceId = String(event.data.instanceId);
  const cardName = String(event.data.cardName ?? t(locale, 'battle.events.minion'));
  const namePart =
    event.playerId === selfId
      ? t(locale, 'battle.events.yourMinion', { name: cardName })
      : t(locale, 'battle.events.enemyMinion', { name: cardName });

  for (let i = eventIndex + 1; i < Math.min(state.log.length, eventIndex + 3); i++) {
    const next = state.log[i];
    if (next.type === 'hero-power') {
      const pathway = String(next.data.pathway ?? '');
      const powerName =
        PATHWAYS[pathway as keyof typeof PATHWAYS]?.powerName ?? t(locale, 'battle.events.power');
      return t(locale, 'battle.events.minionDiedByPower', { namePart, power: powerName });
    }
    if (next.type === 'secret-triggered') {
      const secretName = String(next.data.secretName ?? t(locale, 'battle.events.secret'));
      return t(locale, 'battle.events.minionDiedBySecret', { namePart, secret: secretName });
    }
  }

  for (let i = eventIndex - 1; i >= Math.max(0, eventIndex - 8); i--) {
    const prev = state.log[i];

    if (prev.type === 'attack') {
      const attackerId = String(prev.data.attacker);
      const targetId = String(prev.data.target);
      const attackerName = resolveMinionName(state, attackerId, locale);
      const targetName = resolveMinionName(state, targetId, locale);

      if (instanceId === targetId) {
        const dmg = String(prev.data.targetDamage ?? '?');
        return t(locale, 'battle.events.minionDiedFromDamage', {
          namePart,
          dmg,
          attacker: attackerName,
        });
      }
      if (instanceId === attackerId) {
        const dmg = String(prev.data.attackerDamage ?? '?');
        return t(locale, 'battle.events.minionDiedInCombat', {
          namePart,
          target: targetName,
          dmg,
        });
      }
    }

    if (prev.type === 'hero-power') {
      const pathway = String(prev.data.pathway ?? '');
      const powerName =
        PATHWAYS[pathway as keyof typeof PATHWAYS]?.powerName ?? t(locale, 'battle.events.power');
      return t(locale, 'battle.events.minionDiedByPower', { namePart, power: powerName });
    }

    if (prev.type === 'secret-triggered') {
      const secretName = String(prev.data.secretName ?? t(locale, 'battle.events.secret'));
      return t(locale, 'battle.events.minionDiedBySecret', { namePart, secret: secretName });
    }

    if (prev.type === 'play-card' && prev.data.cardType === 'ritual') {
      const spellName = String(prev.data.cardName ?? t(locale, 'battle.events.ritual'));
      return t(locale, 'battle.events.minionDiedByRitual', { namePart, spell: spellName });
    }
  }

  return t(locale, 'battle.events.minionDied', { namePart });
}

export function formatGameEvent(
  event: GameEvent,
  state: GameState,
  selfId: string,
  opponentId: string,
  locale: Locale,
  eventIndex?: number,
): FormattedLogEntry | null {
  const actor = actorLabel(locale, event.playerId, selfId, opponentId);
  const isEnemy = event.playerId === opponentId;

  switch (event.type) {
    case 'play-card':
      return {
        text: t(locale, 'battle.events.playedCard', {
          actor,
          card: String(event.data.cardName ?? t(locale, 'battle.events.aCard')),
        }),
        type: isEnemy ? 'enemy' : 'action',
      };

    case 'attack': {
      const attackerName = resolveMinionName(state, String(event.data.attacker), locale);
      const targetName = resolveMinionName(state, String(event.data.target), locale);
      const dmg = String(event.data.targetDamage ?? '?');
      const counter = Number(event.data.attackerDamage ?? 0);
      const counterNote = counter
        ? t(locale, 'battle.events.attackCounter', { n: counter })
        : '';
      return {
        text: t(locale, 'battle.events.attack', {
          actor,
          attacker: attackerName,
          target: targetName,
          dmg,
          counter: counterNote,
        }),
        type: isEnemy ? 'enemy' : 'damage',
      };
    }

    case 'attack-hero': {
      const attackerName = resolveMinionName(state, String(event.data.attacker), locale);
      const dmg = String(event.data.damage ?? '?');
      const targetLabel = isEnemy
        ? t(locale, 'battle.events.yourHero')
        : t(locale, 'battle.events.enemyHero');
      return {
        text: t(locale, 'battle.events.attackHero', {
          actor,
          attacker: attackerName,
          target: targetLabel,
          dmg,
        }),
        type: isEnemy ? 'enemy' : 'damage',
      };
    }

    case 'minion-death': {
      const idx = eventIndex ?? state.log.indexOf(event);
      const text =
        idx >= 0
          ? formatMinionDeath(event, state, idx, selfId, opponentId, locale)
          : t(locale, 'battle.events.minionDied', {
              namePart: String(event.data.cardName ?? t(locale, 'battle.events.minion')),
            });
      return {
        text,
        type: event.playerId === selfId ? 'damage' : 'enemy',
      };
    }

    case 'hero-power': {
      const pathway = String(event.data.pathway ?? '');
      const powerName =
        PATHWAYS[pathway as keyof typeof PATHWAYS]?.powerName ?? t(locale, 'battle.events.power');
      return {
        text: t(locale, 'battle.events.usedPower', { actor, power: powerName }),
        type: isEnemy ? 'enemy' : 'action',
      };
    }

    case 'secret-triggered': {
      const secretActor = isEnemy
        ? t(locale, 'battle.events.enemy')
        : t(locale, 'battle.events.you');
      return {
        text: t(locale, 'battle.events.revealedSecret', {
          actor: secretActor,
          secret: String(event.data.secretName ?? '???'),
        }),
        type: isEnemy ? 'enemy' : 'system',
      };
    }

    case 'fate-coin':
      return {
        text: t(locale, 'battle.events.fateCoin', { actor }),
        type: 'action',
      };

    case 'madness-damage':
      return {
        text: t(locale, 'battle.events.madnessDamage', {
          actor,
          dmg: String(event.data.damage ?? 0),
        }),
        type: 'damage',
      };

    case 'fatigue':
      return {
        text: t(locale, 'battle.events.fatigueDamage', {
          actor,
          dmg: String(event.data.damage ?? 0),
        }),
        type: 'damage',
      };

    case 'concede':
      return {
        text:
          event.playerId === selfId
            ? t(locale, 'battle.events.youConceded')
            : t(locale, 'battle.events.opponentConceded', { actor }),
        type: 'system',
      };

    default:
      return null;
  }
}
