import { motion, AnimatePresence } from 'framer-motion';
import { MinionInstance } from 'game-engine';
import { MinionSlot } from './MinionSlot';

interface Props {
  minions: MinionInstance[];
  isEnemy: boolean;
  selectedAttacker: string | null;
  validTargetIds?: Set<string> | null;
  attackingMinion?: string | null;
  damagedMinion?: string | null;
  onMinionClick: (instanceId: string, isEnemy: boolean) => void;
  onValidTargetHover?: (instanceId: string, hovering: boolean) => void;
}

export function AnimatedBoard({
  minions,
  isEnemy,
  selectedAttacker,
  validTargetIds,
  attackingMinion,
  damagedMinion,
  onMinionClick,
  onValidTargetHover,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-1.5 px-2 min-h-[5.5rem]">
      <AnimatePresence initial={false}>
        {minions.map((minion) => {
          const isAttacking = attackingMinion === minion.instanceId;
          const isBeingHit = damagedMinion === minion.instanceId;

          const isValidTarget = !!validTargetIds?.has(minion.instanceId);

          return (
            <motion.div
              key={minion.instanceId}
              initial={{ scale: 0, y: isEnemy ? -40 : 40, opacity: 0 }}
              animate={
                isAttacking
                  ? { scale: 1.15, y: isEnemy ? 28 : -28, opacity: 1, zIndex: 30 }
                  : isBeingHit
                  ? { scale: 0.92, opacity: 1, y: 0, x: [0, -5, 5, -3, 3, 0] }
                  : { scale: 1, y: 0, opacity: 1, x: 0 }
              }
              exit={{
                scale: 0.2,
                rotate: 12,
                opacity: 0,
                y: isEnemy ? -24 : 24,
                filter: 'blur(3px) brightness(2) grayscale(0.6)',
                transition: { duration: 0.85, ease: [0.4, 0, 0.2, 1] },
              }}
              transition={{
                type: 'spring',
                stiffness: isAttacking ? 180 : 400,
                damping: isAttacking ? 14 : 20,
                x: isBeingHit ? { duration: 0.45 } : undefined,
              }}
            >
              <MinionSlot
                minion={minion}
                isEnemy={isEnemy}
                isSelected={selectedAttacker === minion.instanceId}
                isTarget={isValidTarget}
                isBeingAttacked={isBeingHit}
                onClick={() => onMinionClick(minion.instanceId, isEnemy)}
                onHover={isValidTarget && onValidTargetHover
                  ? (hovering) => onValidTargetHover(minion.instanceId, hovering)
                  : undefined}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
      {minions.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-void-700 text-xs"
        >
          {isEnemy ? 'Campo inimigo vazio' : 'Jogue minions aqui'}
        </motion.p>
      )}
    </div>
  );
}
