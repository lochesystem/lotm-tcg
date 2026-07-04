import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card as CardType, PackResult } from 'game-engine';
import { CardComponent } from './Card';
import { useCollectionStore } from '../stores/collectionStore';

interface Props {
  pack: PackResult;
  onClose: () => void;
}

const PACK_LABELS = {
  ordinary: 'Pacote Comum',
  beyonder: 'Pacote Beyonder',
  sealed: 'Pacote Selado',
};

const PACK_COLORS = {
  ordinary: 'from-gray-600 to-gray-800',
  beyonder: 'from-purple-600 to-purple-900',
  sealed: 'from-gold-400 to-yellow-700',
};

export function PackOpening({ pack, onClose }: Props) {
  const [revealed, setRevealed] = useState(false);
  const addCards = useCollectionStore((s) => s.addCards);

  useEffect(() => {
    if (revealed) {
      addCards(pack.cards.map((c) => c.id));
    }
  }, [revealed]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-6 max-w-sm w-full"
      >
        {!revealed ? (
          <motion.button
            onClick={() => setRevealed(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-48 h-64 rounded-2xl bg-gradient-to-b ${PACK_COLORS[pack.packType]} border-2 border-white/20 flex items-center justify-center shadow-2xl`}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📦</div>
              <div className="font-display font-bold text-sm">
                {PACK_LABELS[pack.packType]}
              </div>
              <div className="text-xs text-white/60 mt-2">Toque para abrir</div>
            </div>
          </motion.button>
        ) : (
          <>
            <h3 className="font-display text-lg text-gold-400">
              {PACK_LABELS[pack.packType]}
            </h3>
            <div className="flex gap-2 flex-wrap justify-center">
              <AnimatePresence>
                {pack.cards.map((card, i) => (
                  <motion.div
                    key={`${card.id}-${i}`}
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ delay: i * 0.2, duration: 0.4 }}
                  >
                    <CardComponent card={card} canPlay={false} small />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-void-700 hover:bg-void-600 rounded-lg text-sm font-medium transition-all"
            >
              Continuar
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
