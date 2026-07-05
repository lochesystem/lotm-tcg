import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Pathway } from 'game-engine';
import type { CombatPhase } from '../stores/gameStore';

interface Props {
  sourceHero: 'player' | 'opponent';
  targetId: string | null;
  targetHero?: 'player' | 'opponent' | null;
  pathway: Pathway;
  phase?: CombatPhase;
  powerName?: string;
}

const BEAM_THEME: Record<string, { primary: string; glow: string; accent: string }> = {
  'red-priest': { primary: '#fb923c', glow: '#fde68a', accent: '#ef4444' },
  tyrant: { primary: '#38bdf8', glow: '#e0f2fe', accent: '#fef08a' },
  sun: { primary: '#fbbf24', glow: '#fef3c7', accent: '#f59e0b' },
  demoness: { primary: '#e879f9', glow: '#fae8ff', accent: '#c026d3' },
};

const DEFAULT_THEME = { primary: '#c084fc', glow: '#e9d5ff', accent: '#9333ea' };

function resolveTargetSelector(
  targetId: string | null,
  targetHero: 'player' | 'opponent' | null | undefined
): string | null {
  if (targetId) return `[data-minion-id="${targetId}"]`;
  if (targetHero === 'player') return '[data-hero-player]';
  if (targetHero === 'opponent') return '[data-hero-enemy]';
  return null;
}

export function HeroPowerBeam({
  sourceHero,
  targetId,
  targetHero,
  pathway,
  phase = 'preview',
  powerName,
}: Props) {
  const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const theme = BEAM_THEME[pathway] ?? DEFAULT_THEME;
  const isCharging = phase === 'strike';
  const isImpact = phase === 'impact';
  const isActive = phase === 'strike' || phase === 'impact';

  useEffect(() => {
    const updateCoords = () => {
      const getCenter = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      };

      const sourceEl = document.querySelector(
        sourceHero === 'player' ? '[data-hero-player]' : '[data-hero-enemy]'
      ) as HTMLElement | null;
      const targetSelector = resolveTargetSelector(targetId, targetHero);
      const targetEl = targetSelector
        ? (document.querySelector(targetSelector) as HTMLElement | null)
        : null;

      if (sourceEl && targetEl) {
        const from = getCenter(sourceEl);
        const to = getCenter(targetEl);
        setCoords({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
      } else {
        setCoords(null);
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    const interval = setInterval(updateCoords, 80);
    return () => {
      window.removeEventListener('resize', updateCoords);
      clearInterval(interval);
    };
  }, [sourceHero, targetId, targetHero, phase]);

  const show = !!coords;

  return (
    <AnimatePresence>
      {show && coords && (
        <>
          {/* Power name label during preview */}
          {phase === 'preview' && powerName && (
            <motion.div
              className="fixed z-[45] pointer-events-none left-1/2 -translate-x-1/2 top-[18%]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="px-4 py-1.5 rounded-full bg-void-900/90 border border-orange-400/50 text-orange-200 text-xs font-bold shadow-lg shadow-orange-900/40">
                {powerName}
              </div>
            </motion.div>
          )}

          <motion.svg
            className="fixed inset-0 w-full h-full z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <defs>
              <filter id="hero-power-glow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="hero-power-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={theme.glow} stopOpacity="0.9" />
                <stop offset="50%" stopColor={theme.primary} stopOpacity="1" />
                <stop offset="100%" stopColor={theme.accent} stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Wide glow beam */}
            <motion.line
              x1={coords.x1}
              y1={coords.y1}
              x2={coords.x2}
              y2={coords.y2}
              stroke="url(#hero-power-gradient)"
              strokeWidth={isImpact ? 14 : isCharging ? 10 : 5}
              strokeLinecap="round"
              filter="url(#hero-power-glow)"
              opacity={isActive ? 0.75 : 0.35}
              animate={{
                opacity: isImpact ? [0.6, 1, 0.4] : isCharging ? [0.5, 0.9, 0.5] : [0.25, 0.5, 0.25],
              }}
              transition={{ duration: isImpact ? 0.45 : 0.85, repeat: isImpact ? 0 : Infinity }}
            />

            {/* Core beam */}
            <motion.line
              x1={coords.x1}
              y1={coords.y1}
              x2={coords.x2}
              y2={coords.y2}
              stroke={theme.glow}
              strokeWidth={isImpact ? 4 : 2}
              strokeLinecap="round"
              strokeDasharray={isActive ? undefined : '8 10'}
              animate={isActive
                ? { strokeDashoffset: 0, opacity: 1 }
                : { strokeDashoffset: [0, -36], opacity: [0.7, 1, 0.7] }}
              transition={isActive
                ? { duration: 0.2 }
                : { strokeDashoffset: { duration: 0.65, repeat: Infinity, ease: 'linear' }, opacity: { duration: 1, repeat: Infinity } }}
            />

            {/* Source charge ring */}
            <motion.circle
              cx={coords.x1}
              cy={coords.y1}
              r={isCharging ? 16 : 10}
              fill="none"
              stroke={theme.primary}
              strokeWidth={2.5}
              animate={{
                r: isImpact ? [14, 24, 14] : isCharging ? [12, 22, 12] : [8, 16, 8],
                opacity: [1, 0.2, 1],
              }}
              transition={{ duration: isImpact ? 0.5 : 0.9, repeat: Infinity }}
            />

            {/* Traveling orb during strike/impact */}
            {(isCharging || isImpact) && (
              <motion.circle
                r={isImpact ? 10 : 7}
                fill={theme.glow}
                filter="url(#hero-power-glow)"
                initial={{ cx: coords.x1, cy: coords.y1, opacity: 0 }}
                animate={{
                  cx: isImpact ? coords.x2 : [coords.x1, coords.x2],
                  cy: isImpact ? coords.y2 : [coords.y1, coords.y2],
                  opacity: isImpact ? [1, 0.8, 0] : [0, 1, 1],
                }}
                transition={{
                  duration: isImpact ? 0.35 : 0.7,
                  ease: 'easeIn',
                }}
              />
            )}

            {/* Target reticle */}
            <motion.circle
              cx={coords.x2}
              cy={coords.y2}
              r={isImpact ? 18 : 12}
              fill="none"
              stroke={theme.accent}
              strokeWidth={isImpact ? 3 : 2}
              animate={{
                r: isImpact ? [14, 26, 14] : [10, 20, 10],
                opacity: [0.9, 0.25, 0.9],
              }}
              transition={{ duration: isImpact ? 0.45 : 0.8, repeat: isImpact ? 0 : Infinity }}
            />
          </motion.svg>
        </>
      )}
    </AnimatePresence>
  );
}
