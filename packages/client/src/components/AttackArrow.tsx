import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { CombatPhase } from '../stores/gameStore';

interface Props {
  attackerId: string | null;
  targetId: string | null;
  targetHero?: 'player' | 'opponent' | null;
  isPlayerAttacking?: boolean;
  phase?: CombatPhase;
}

function resolveHeroSelector(
  targetHero: 'player' | 'opponent' | null | undefined,
  isPlayerAttacking: boolean | undefined
): string {
  if (targetHero === 'player') return '[data-hero-player]';
  if (targetHero === 'opponent') return '[data-hero-enemy]';
  return isPlayerAttacking ? '[data-hero-enemy]' : '[data-hero-player]';
}

export function AttackArrow({ attackerId, targetId, targetHero, isPlayerAttacking, phase = 'preview' }: Props) {
  const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const isStriking = phase === 'strike' || phase === 'impact';
  const color = isPlayerAttacking ? '#4ade80' : '#f87171';
  const glowColor = isPlayerAttacking ? '#86efac' : '#fca5a5';

  useEffect(() => {
    if (!attackerId) {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      const getCenter = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      };

      const attackerEl = document.querySelector(`[data-minion-id="${attackerId}"]`) as HTMLElement;
      const targetEl = targetId
        ? (document.querySelector(`[data-minion-id="${targetId}"]`) as HTMLElement)
        : (document.querySelector(resolveHeroSelector(targetHero, isPlayerAttacking)) as HTMLElement);

      if (attackerEl && targetEl) {
        const from = getCenter(attackerEl);
        const to = getCenter(targetEl);
        setCoords({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
      } else {
        setCoords(null);
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    const interval = setInterval(updateCoords, 100);
    return () => {
      window.removeEventListener('resize', updateCoords);
      clearInterval(interval);
    };
  }, [attackerId, targetId, targetHero, isPlayerAttacking, phase]);

  const show = !!attackerId && !!coords;

  return (
    <AnimatePresence>
      {show && coords && (
        <motion.svg
          className="fixed inset-0 w-full h-full z-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="12"
              markerHeight="8"
              refX="10"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 12 4, 0 8" fill={color} />
            </marker>
            <filter id="arrow-glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer glow */}
          <motion.line
            x1={coords.x1}
            y1={coords.y1}
            x2={coords.x2}
            y2={coords.y2}
            stroke={color}
            strokeWidth={isStriking ? 10 : 6}
            strokeLinecap="round"
            filter="url(#arrow-glow)"
            opacity={isStriking ? 0.55 : 0.35}
            animate={{ opacity: isStriking ? [0.4, 0.7, 0.4] : [0.2, 0.5, 0.2] }}
            transition={{ duration: isStriking ? 0.5 : 0.9, repeat: Infinity }}
          />

          {/* Main arrow */}
          <motion.line
            x1={coords.x1}
            y1={coords.y1}
            x2={coords.x2}
            y2={coords.y2}
            stroke={color}
            strokeWidth={isStriking ? 4 : 2.5}
            strokeLinecap="round"
            markerEnd="url(#arrowhead)"
            strokeDasharray={isStriking ? undefined : '10 6'}
            animate={isStriking
              ? { strokeDashoffset: 0, opacity: 1 }
              : { strokeDashoffset: [0, -32], opacity: [0.85, 1, 0.85] }}
            transition={isStriking
              ? { duration: 0.2 }
              : { strokeDashoffset: { duration: 0.7, repeat: Infinity, ease: 'linear' }, opacity: { duration: 1.2, repeat: Infinity } }}
          />

          {/* Source pulse */}
          <motion.circle
            cx={coords.x1}
            cy={coords.y1}
            r={isStriking ? 10 : 7}
            fill="none"
            stroke={color}
            strokeWidth={2}
            animate={{ r: isStriking ? [10, 18, 10] : [7, 14, 7], opacity: [1, 0.25, 1] }}
            transition={{ duration: isStriking ? 0.6 : 1.1, repeat: Infinity }}
          />

          {/* Target pulse */}
          <motion.circle
            cx={coords.x2}
            cy={coords.y2}
            r={isStriking ? 12 : 9}
            fill="none"
            stroke={glowColor}
            strokeWidth={isStriking ? 3 : 2}
            animate={{ r: isStriking ? [12, 22, 12] : [9, 18, 9], opacity: [0.9, 0.2, 0.9] }}
            transition={{ duration: isStriking ? 0.5 : 0.85, repeat: Infinity }}
          />

          {/* Target crosshair during strike */}
          {isStriking && (
            <>
              <motion.line
                x1={coords.x2 - 14} y1={coords.y2} x2={coords.x2 + 14} y2={coords.y2}
                stroke={glowColor} strokeWidth={2} strokeLinecap="round"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              />
              <motion.line
                x1={coords.x2} y1={coords.y2 - 14} x2={coords.x2} y2={coords.y2 + 14}
                stroke={glowColor} strokeWidth={2} strokeLinecap="round"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              />
            </>
          )}
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
