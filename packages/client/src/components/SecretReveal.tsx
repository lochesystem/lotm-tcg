import './menu/overlays.css';
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
            className="veil-event-notice veil-event-notice--secret"
            initial={{ opacity: 0, y: -20, scale: 0.85, rotateY: 90 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div className="veil-announcement veil-announcement--compact" role="status">
              <p className="text-[10px] text-[#d7aeb6] uppercase tracking-widest mb-1">
                {pending.ownerIsPlayer
                  ? t('battle.secretReveal.yours')
                  : t('battle.secretReveal.enemy')}
              </p>
              <motion.p
                className="text-base font-bold text-[#f1ece4]"
                animate={pending.phase === 'effect' ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.45, repeat: pending.phase === 'effect' ? 2 : 0 }}
              >
                ✧ {pending.secretName}
              </motion.p>
              <p className="text-[10px] text-[#c0b4b9] mt-1">
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
