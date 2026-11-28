import './menu/overlays.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';

interface Props {
  cardName: string | null;
}

export function NpcPlayReveal({ cardName }: Props) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {cardName && (
        <motion.div
          className="veil-event-notice "
          initial={{ opacity: 0, y: -16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <div className="veil-announcement veil-announcement--compact" role="status">
            <p className="text-[10px] text-red-300/80 uppercase tracking-widest text-center mb-0.5">
              {t('battle.enemyPlays')}
            </p>
            <p className="text-sm font-bold text-white text-center break-words">
              {cardName}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
