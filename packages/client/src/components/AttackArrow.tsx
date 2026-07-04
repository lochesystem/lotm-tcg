import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  attackerId: string | null;
  targetId: string | null; // null = hero
  isPlayerAttacking?: boolean;
}

export function AttackArrow({ attackerId, targetId, isPlayerAttacking }: Props) {
  const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  useEffect(() => {
    if (!attackerId) {
      setCoords(null);
      return;
    }

    const getCenter = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const attackerEl = document.querySelector(`[data-minion-id="${attackerId}"]`) as HTMLElement;
    const targetEl = targetId
      ? (document.querySelector(`[data-minion-id="${targetId}"]`) as HTMLElement)
      : (document.querySelector(`[data-hero-enemy]`) as HTMLElement);

    if (attackerEl && targetEl) {
      const from = getCenter(attackerEl);
      const to = getCenter(targetEl);
      setCoords({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    } else {
      setCoords(null);
    }
  }, [attackerId, targetId]);

  const show = !!attackerId && !!coords;

  return (
    <AnimatePresence>
      {show && coords && (
        <motion.svg
          className="fixed inset-0 w-full h-full z-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={isPlayerAttacking ? '#4ade80' : '#f87171'}
              />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Pulsing glow line */}
          <motion.line
            x1={coords.x1}
            y1={coords.y1}
            x2={coords.x2}
            y2={coords.y2}
            stroke={isPlayerAttacking ? '#4ade80' : '#f87171'}
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#glow)"
            opacity={0.4}
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />

          {/* Main arrow line */}
          <motion.line
            x1={coords.x1}
            y1={coords.y1}
            x2={coords.x2}
            y2={coords.y2}
            stroke={isPlayerAttacking ? '#4ade80' : '#f87171'}
            strokeWidth="2.5"
            strokeLinecap="round"
            markerEnd="url(#arrowhead)"
            strokeDasharray="8 4"
            animate={{ strokeDashoffset: [0, -24] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
          />

          {/* Source pulse circle */}
          <motion.circle
            cx={coords.x1}
            cy={coords.y1}
            r="6"
            fill="none"
            stroke={isPlayerAttacking ? '#4ade80' : '#f87171'}
            strokeWidth="2"
            animate={{ r: [6, 12, 6], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />

          {/* Target pulse circle */}
          <motion.circle
            cx={coords.x2}
            cy={coords.y2}
            r="8"
            fill="none"
            stroke={isPlayerAttacking ? '#86efac' : '#fca5a5'}
            strokeWidth="2"
            animate={{ r: [8, 16, 8], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
