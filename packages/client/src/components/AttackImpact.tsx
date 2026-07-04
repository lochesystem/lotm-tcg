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
        w: Math.max(rect.width, 48),
        h: Math.max(rect.height, 60),
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
          style={{
            left: pos.x - pos.w / 2,
            top: pos.y - pos.h / 2,
            width: pos.w,
            height: pos.h,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 rounded-xl bg-red-500/30 border-2 border-red-400/60"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 1, 0.4, 0], scale: [0.85, 1.08, 1, 0.95] }}
            transition={{ duration: 0.5 }}
          />

          <motion.div
            className="absolute left-1/2 top-1/2 h-1.5 w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-orange-200 to-transparent"
            style={{ rotate: '-38deg' }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1.3, 0.6], opacity: [0, 1, 0] }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />

          <motion.div
            className="absolute left-1/2 top-1/2 h-2 w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-red-400 to-transparent"
            style={{ rotate: '32deg' }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1.2, 0.5], opacity: [0, 1, 0] }}
            transition={{ duration: 0.42, delay: 0.07, ease: 'easeOut' }}
          />

          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-200/90 blur-[2px]"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: [0, pos.w * 1.1, 0],
              height: [0, pos.h * 1.1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 0.48, delay: 0.05 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
