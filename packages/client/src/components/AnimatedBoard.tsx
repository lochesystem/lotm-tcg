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
      <AnimatePresence mode="popLayout">
        {minions.map((minion) => {
          const isAttacking = attackingMinion === minion.instanceId;
          const isBeingHit = damagedMinion === minion.instanceId;

          const isValidTarget = !!validTargetIds?.has(minion.instanceId);

          return (
            <motion.div
              key={minion.instanceId}
              layout
              initial={{ scale: 0, y: isEnemy ? -40 : 40, opacity: 0 }}
              animate={
                isAttacking
                  ? { scale: 1.15, y: isEnemy ? 20 : -20, opacity: 1 }
                  : isBeingHit
                  ? { scale: 0.95, opacity: 1, y: 0 }
                  : { scale: 1, y: 0, opacity: 1 }
              }
              exit={{
                scale: 0,
                rotate: (Math.random() - 0.5) * 40,
                opacity: 0,
                y: 30,
                filter: 'blur(4px) brightness(2)',
                transition: { duration: 0.5, ease: 'easeIn' },
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 20,
                layout: { duration: 0.2 },
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
