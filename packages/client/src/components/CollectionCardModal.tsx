import { motion } from 'framer-motion';
import { Card } from 'game-engine';
import { TcgCardFace } from './TcgCardFace';
import { useTranslation } from '../i18n';

interface Props {
  card: Card;
  owned: boolean;
  quantity: number;
  onClose: () => void;
}

export function CollectionCardModal({ card, owned, quantity, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center gap-3 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.88, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      >
        <div className="relative">
          <TcgCardFace card={card} showLockedBanner={!owned} />
        </div>

        <div className="w-full rounded-xl border border-void-600/80 bg-void-900/90 px-4 py-3 text-center backdrop-blur-sm">
          {owned ? (
            <p className="text-sm text-green-400 font-medium">
              {t('collection.owned', { quantity })}
            </p>
          ) : (
            <p className="text-sm text-void-400">{t('collection.notOwned')}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-void-500 hover:text-void-300 transition-colors py-1"
        >
          {t('common.close')}
        </button>
      </motion.div>
    </motion.div>
  );
}
