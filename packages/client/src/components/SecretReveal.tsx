import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import type { PendingSecret } from '../stores/gameStore';
import { AttackArrow } from './AttackArrow';

interface Props {
  pending: PendingSecret | null;
}

export function SecretReveal({ pending }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <AnimatePresence>
        {pending && (pending.phase === 'reveal' || pending.phase === 'effect') && (
          <motion.div
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[55] pointer-events-none"
            initial={{ opacity: 0, y: -20, scale: 0.85, rotateY: 90 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div className="px-6 py-4 rounded-2xl bg-purple-950/95 border-2 border-purple-400/60 shadow-2xl shadow-purple-900/50 backdrop-blur-sm text-center min-w-[12rem]">
              <p className="text-[10px] text-purple-300/90 uppercase tracking-widest mb-1">
                {pending.ownerIsPlayer
                  ? t('battle.secretReveal.yours')
                  : t('battle.secretReveal.enemy')}
              </p>
              <motion.p
                className="text-base font-bold text-purple-50"
                animate={pending.phase === 'effect' ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.45, repeat: pending.phase === 'effect' ? 2 : 0 }}
              >
                ✧ {pending.secretName}
              </motion.p>
              <p className="text-[10px] text-purple-300/70 mt-1">
                {pending.phase === 'reveal'
                  ? t('battle.secretReveal.revealed')
                  : t('battle.secretReveal.triggered')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pending?.phase === 'impact' && pending.targetMinionId && (
        <AttackArrow
          attackerHero={pending.ownerIsPlayer ? 'player' : 'opponent'}
          targetId={pending.targetMinionId}
          isPlayerAttacking={pending.ownerIsPlayer}
          phase="impact"
        />
      )}
    </>
  );
}
