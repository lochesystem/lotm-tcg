import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  turnNumber: number;
  isYourTurn: boolean;
}

export function TurnBanner({ turnNumber, isYourTurn }: Props) {
  const [visible, setVisible] = useState(false);
  const [displayTurn, setDisplayTurn] = useState(turnNumber);
  const [displayIsYours, setDisplayIsYours] = useState(isYourTurn);

  useEffect(() => {
    if (turnNumber < 1) return;

    setDisplayTurn(turnNumber);
    setDisplayIsYours(isYourTurn);
    setVisible(true);

    const timer = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(timer);
  }, [turnNumber, isYourTurn]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`turn-${displayTurn}-${displayIsYours}`}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          {/* Dark scrim behind */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Banner bar that slides in */}
          <motion.div
            className="relative"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{
              scaleX: 1,
              opacity: 1,
              transition: { type: 'spring', stiffness: 200, damping: 20 },
            }}
            exit={{
              scaleX: 0,
              opacity: 0,
              transition: { duration: 0.3, ease: 'easeIn' },
            }}
          >
            <div
              className={`
                px-16 py-5 rounded-xl backdrop-blur-lg border shadow-2xl
                ${displayIsYours
                  ? 'bg-gradient-to-r from-green-900/90 via-green-800/90 to-green-900/90 border-green-400/40 shadow-green-500/20'
                  : 'bg-gradient-to-r from-red-900/90 via-red-800/90 to-red-900/90 border-red-400/40 shadow-red-500/20'
                }
              `}
            >
              {/* Decorative line left */}
              <motion.div
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-8 h-0.5 rounded-full ${displayIsYours ? 'bg-green-400/60' : 'bg-red-400/60'}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.2 }}
              />
              {/* Decorative line right */}
              <motion.div
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-8 h-0.5 rounded-full ${displayIsYours ? 'bg-green-400/60' : 'bg-red-400/60'}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.2 }}
              />

              <motion.h2
                className="text-2xl font-display font-bold text-center text-white"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
              >
                {displayIsYours ? 'Seu Turno' : 'Turno Inimigo'}
              </motion.h2>
              <motion.p
                className="text-xs text-center text-white/50 mt-1 tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                TURNO {displayTurn}
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
