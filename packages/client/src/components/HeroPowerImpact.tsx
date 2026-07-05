import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Pathway } from 'game-engine';

interface Props {
  show: boolean;
  targetId: string | null;
  targetHero?: 'player' | 'opponent' | null;
  pathway: Pathway;
}

const IMPACT_THEME: Record<string, { ring: string; flash: string; core: string }> = {
  'red-priest': { ring: 'border-orange-400/70', flash: 'bg-orange-300/50', core: 'bg-yellow-200/80' },
  tyrant: { ring: 'border-sky-400/70', flash: 'bg-sky-300/50', core: 'bg-yellow-100/90' },
  sun: { ring: 'border-amber-400/70', flash: 'bg-amber-300/50', core: 'bg-yellow-100/80' },
  demoness: { ring: 'border-fuchsia-400/70', flash: 'bg-fuchsia-300/40', core: 'bg-pink-200/70' },
};

const DEFAULT_THEME = { ring: 'border-purple-400/70', flash: 'bg-purple-300/40', core: 'bg-violet-200/70' };

function resolveTargetSelector(
  targetId: string | null,
  targetHero: 'player' | 'opponent' | null | undefined
): string | null {
  if (targetId) return `[data-minion-id="${targetId}"]`;
  if (targetHero === 'player') return '[data-hero-player]';
  if (targetHero === 'opponent') return '[data-hero-enemy]';
  return null;
}

export function HeroPowerImpact({ show, targetId, targetHero, pathway }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const theme = IMPACT_THEME[pathway] ?? DEFAULT_THEME;

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
            className={`absolute inset-0 rounded-xl border-2 ${theme.ring}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0.3, 0], scale: [0.8, 1.15, 1.05, 0.95] }}
            transition={{ duration: 0.55 }}
          />

          <motion.div
            className={`absolute inset-0 rounded-full ${theme.flash} blur-md`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.4, 1.6] }}
            transition={{ duration: 0.5 }}
          />

          <motion.div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${theme.core} blur-[1px]`}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: [0, pos.w * 1.2, 0],
              height: [0, pos.h * 1.2, 0],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 0.48, delay: 0.05 }}
          />

          {/* Radiant spokes */}
          {[0, 45, 90, 135].map((deg) => (
            <motion.div
              key={deg}
              className="absolute left-1/2 top-1/2 h-0.5 w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-yellow-100/90 to-transparent"
              style={{ rotate: `${deg}deg` }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 1.1, 0.4], opacity: [0, 1, 0] }}
              transition={{ duration: 0.42, delay: 0.04 }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
