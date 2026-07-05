import { AttackArrow } from './AttackArrow';

interface Props {
  attackerId?: string | null;
  attackerHero?: 'player' | 'opponent' | null;
  targetMinionIds: Set<string>;
  showHero?: boolean;
  /** Which hero is the attack target when showHero is true */
  targetHero?: 'player' | 'opponent';
  isPlayerAttacking?: boolean;
}

/** Preview arrows to every valid target (works on mobile without hover). */
export function AttackTargetArrows({
  attackerId,
  attackerHero,
  targetMinionIds,
  showHero = false,
  targetHero = 'opponent',
  isPlayerAttacking = true,
}: Props) {
  if (!attackerId && !attackerHero) return null;

  return (
    <>
      {[...targetMinionIds].map((id) => (
        <AttackArrow
          key={id}
          attackerId={attackerId}
          attackerHero={attackerHero}
          targetId={id}
          isPlayerAttacking={isPlayerAttacking}
          phase="preview"
        />
      ))}
      {showHero && (
        <AttackArrow
          attackerId={attackerId}
          attackerHero={attackerHero}
          targetHero={targetHero}
          isPlayerAttacking={isPlayerAttacking}
          phase="preview"
        />
      )}
    </>
  );
}
