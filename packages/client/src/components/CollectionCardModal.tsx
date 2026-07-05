import { motion } from 'framer-motion';
import { Card } from 'game-engine';
import { TcgCardFace } from './TcgCardFace';

interface Props {
  card: Card;
  owned: boolean;
  quantity: number;
  onClose: () => void;
}

export function CollectionCardModal({ card, owned, quantity, onClose }: Props) {
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
          <TcgCardFace card={card} />
          {!owned && (
            <div className="absolute inset-x-0 top-[42%] -translate-y-1/2 z-30 pointer-events-none">
              <div className="w-[108%] -ml-[4%] -rotate-6 bg-void-950/92 border-y border-void-500/50 py-1.5 shadow-2xl">
                <span className="block text-center text-[11px] font-black tracking-[0.35em] text-void-200">
                  &lt;LOCKED&gt;
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="w-full rounded-xl border border-void-600/80 bg-void-900/90 px-4 py-3 text-center backdrop-blur-sm">
          {owned ? (
            <p className="text-sm text-green-400 font-medium">✓ Possui x{quantity}</p>
          ) : (
            <p className="text-sm text-void-400">Não adquirida — ganhe packs para desbloquear</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-void-500 hover:text-void-300 transition-colors py-1"
        >
          Fechar
        </button>
      </motion.div>
    </motion.div>
  );
}
