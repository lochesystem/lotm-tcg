import type { GameEvent, GameState } from 'game-engine';

export interface ParsedSecretTrigger {
  secretName: string;
  secretId: string;
  ownerPlayerId: string;
  targetMinionId: string | null;
  targetHero: 'player' | 'opponent' | null;
}

export function defenderHasTrigger(
  state: GameState,
  defenderPlayerId: string,
  trigger: 'on-minion-played' | 'on-spell-cast',
): boolean {
  const defender = state.players.find((p) => p.id === defenderPlayerId);
  if (!defender) return false;
  return defender.secrets.some((s) => s.card.trigger === trigger);
}

export function parseSecretTriggersFromLog(
  events: GameEvent[],
  playerId: string,
  opponentId: string,
  playedMinionId?: string | null,
): ParsedSecretTrigger[] {
  const results: ParsedSecretTrigger[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.type !== 'secret-triggered') continue;

    const secretName = String(event.data.secretName ?? 'Secret');
    const secretId = String(event.data.secretId ?? '');
    const ownerPlayerId = event.playerId;

    let targetMinionId: string | null = playedMinionId ?? null;
    let targetHero: 'player' | 'opponent' | null = null;

    const tail = events.slice(i + 1, i + 5);
    const death = tail.find((e) => e.type === 'minion-death');
    if (death) {
      targetMinionId = String(death.data.instanceId);
    }

    const returned = tail.find((e) => e.type === 'minion-returned');
    if (returned) {
      targetMinionId = String(returned.data.instanceId);
    }

    const attackHero = tail.find((e) => e.type === 'attack-hero');
    if (!targetMinionId && events.slice(0, i).some((e) => e.type === 'play-card' && e.data.cardType === 'ritual')) {
      targetHero = ownerPlayerId === playerId ? 'opponent' : 'player';
    }

    if (!targetMinionId && !targetHero && playedMinionId) {
      targetMinionId = playedMinionId;
    }

    results.push({
      secretName,
      secretId,
      ownerPlayerId,
      targetMinionId,
      targetHero,
    });
  }

  return results;
}

export function ownerIsLocalPlayer(ownerPlayerId: string, playerId: string): boolean {
  return ownerPlayerId === playerId;
}
