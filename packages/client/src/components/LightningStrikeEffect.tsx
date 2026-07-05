import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { CombatPhase } from '../stores/gameStore';

interface Props {
  targetId: string | null;
  targetHero: 'player' | 'opponent' | null;
  phase: CombatPhase;
  showImpact: boolean;
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

/** Jagged lightning bolt from top of screen to target */
export function LightningStrikeEffect({ targetId, targetHero, phase, showImpact }: Props) {
  const [coords, setCoords] = useState<{ x: number; y: number; bolt: string } | null>(null);
  const isActive = phase === 'strike' || phase === 'impact';

  useEffect(() => {
    const update = () => {
      const selector = resolveTargetSelector(targetId, targetHero);
      const el = selector ? (document.querySelector(selector) as HTMLElement | null) : null;
      if (!el) {
        setCoords(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const startY = Math.max(24, rect.top - rect.height * 1.8);
      const midX1 = x + ((((x * 7 + y) | 0) % 50) - 25);
      const midY1 = startY + (y - startY) * 0.35;
      const midX2 = x + ((((x * 13 + y) | 0) % 36) - 18);
      const midY2 = startY + (y - startY) * 0.68;
      const bolt = `M ${x} ${startY} L ${midX1} ${midY1} L ${midX2} ${midY2} L ${x} ${y}`;
      setCoords({ x, y, bolt });
    };

    update();
    const interval = setInterval(update, 80);
    return () => clearInterval(interval);
  }, [targetId, targetHero, phase]);

  return (
    <AnimatePresence>
      {coords && (
        <motion.svg
          className="fixed inset-0 w-full h-full z-[42] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <defs>
            <filter id="lightning-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Sky flash during preview/strike */}
          {(phase === 'preview' || phase === 'strike') && (
            <motion.rect
              x={coords.x - 120}
              y={0}
              width={240}
              height={coords.y}
              fill="url(#lightning-gradient)"
              opacity={0.08}
              animate={{ opacity: phase === 'strike' ? [0.05, 0.18, 0.05] : [0.03, 0.08, 0.03] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}

          {/* Main bolt */}
          {isActive && (
            <>
              <motion.path
                d={coords.bolt}
                fill="none"
                stroke="#7dd3fc"
                strokeWidth={phase === 'impact' ? 10 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lightning-glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: phase === 'impact' ? [1, 0.9, 0] : [0, 1, 1],
                }}
                transition={{
                  pathLength: { duration: 0.22, ease: 'easeOut' },
                  opacity: { duration: phase === 'impact' ? 0.45 : 0.25 },
                }}
              />
              <motion.path
                d={coords.bolt}
                fill="none"
                stroke="#fef9c3"
                strokeWidth={phase === 'impact' ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: phase === 'impact' ? [1, 0.6, 0] : [0, 1, 0.9],
                }}
                transition={{
                  pathLength: { duration: 0.18, ease: 'easeOut' },
                  opacity: { duration: phase === 'impact' ? 0.4 : 0.2 },
                }}
              />
            </>
          )}

          {/* Impact burst */}
          {showImpact && (
            <>
              <motion.circle
                cx={coords.x}
                cy={coords.y}
                r={8}
                fill="none"
                stroke="#fef08a"
                strokeWidth={3}
                initial={{ r: 6, opacity: 1 }}
                animate={{ r: [8, 42, 56], opacity: [1, 0.7, 0] }}
                transition={{ duration: 0.55 }}
              />
              <motion.circle
                cx={coords.x}
                cy={coords.y}
                r={4}
                fill="#fef08a"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.8, 2.2] }}
                transition={{ duration: 0.45 }}
              />
              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const len = 50;
                return (
                  <motion.line
                    key={deg}
                    x1={coords.x}
                    y1={coords.y}
                    x2={coords.x + Math.cos(rad) * len}
                    y2={coords.y + Math.sin(rad) * len}
                    stroke="#bae6fd"
                    strokeWidth={2}
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                  />
                );
              })}
            </>
          )}
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
