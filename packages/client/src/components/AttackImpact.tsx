import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  show: boolean;
  targetId: string | null;
  targetHero?: 'player' | 'opponent' | null;
}

function resolveTargetSelector(
  targetId: string | null,
  targetHero: 'player' | 'opponent' | null | undefined
): string | null {
  if (targetId) return `[data-minion-id="${targetId}"]`;
  if (targetHero === 'player') return '[data-hero-player]';
  if (targetHero === 'opponent') return '[data-hero-enemy]';
  return null;
}

export function AttackImpact({ show, targetId, targetHero }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (!show) {
      setPos(null);
      return;
    }

    const update = () => {
      const selector = resolveTargetSelector(targetId, targetHero);
      if (!selector) {
        setPos(null);
        return;
      }
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        setPos(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        w: rect.width,
        h: rect.height,
      });
    };

    update();
    const interval = setInterval(update, 50);
    return () => clearInterval(interval);
  }, [show, targetId, targetHero]);

  return (
    <AnimatePresence>
      {show && pos && (
        <motion.div
          className="fixed pointer-events-none z-50"
          style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Local flash on target */}
          <motion.div
            className="absolute inset-0 rounded-xl bg-red-400/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.35 }}
          />

          {/* Slash 1 */}
          <motion.div
            className="absolute left-1/2 top-1/2 h-1 w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-orange-200 to-transparent"
            style={{ rotate: '-35deg' }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1.2, 0.8], opacity: [0, 1, 0] }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />

          {/* Slash 2 */}
          <motion.div
            className="absolute left-1/2 top-1/2 h-1.5 w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-red-400 to-transparent"
            style={{ rotate: '28deg' }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1.1, 0.7], opacity: [0, 1, 0] }}
            transition={{ duration: 0.38, delay: 0.06, ease: 'easeOut' }}
          />

          {/* Impact burst */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-200/80 blur-sm"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{ width: [0, pos.w * 0.9, 0], height: [0, pos.h * 0.9, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.42, delay: 0.04 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
