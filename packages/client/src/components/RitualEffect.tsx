import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Pathway } from 'game-engine';
import type { CombatPhase } from '../stores/gameStore';
import { HeroPowerBeam } from './HeroPowerBeam';
import { HeroPowerImpact } from './HeroPowerImpact';
import { LightningStrikeEffect } from './LightningStrikeEffect';

interface Props {
  cardName: string;
  pathway: Pathway;
  targetIds: string[];
  targetHero: 'player' | 'opponent' | null;
  isAoE: boolean;
  isNpc: boolean;
  phase: CombatPhase;
  showImpact: boolean;
}

const RITUAL_THEME: Record<string, { label: string; flash: string }> = {
  'red-priest': { label: 'border-orange-400/60 text-orange-200', flash: 'from-orange-600/55 via-red-500/30' },
  tyrant: { label: 'border-sky-400/60 text-sky-200', flash: 'from-sky-600/50 via-blue-500/25' },
  demoness: { label: 'border-fuchsia-400/60 text-fuchsia-200', flash: 'from-fuchsia-600/45 via-pink-500/25' },
};

const DEFAULT_THEME = { label: 'border-purple-400/60 text-purple-200', flash: 'from-purple-600/45 via-violet-500/25' };

function resolveTargetSelector(
  targetId: string | null,
  targetHero: 'player' | 'opponent' | null | undefined
): string | null {
  if (targetId) return `[data-minion-id="${targetId}"]`;
  if (targetHero === 'player') return '[data-hero-player]';
  if (targetHero === 'opponent') return '[data-hero-enemy]';
  return null;
}

export function RitualEffect({
  cardName,
  pathway,
  targetIds,
  targetHero,
  isAoE,
  isNpc,
  phase,
  showImpact,
}: Props) {
  const theme = RITUAL_THEME[pathway] ?? DEFAULT_THEME;
  const [targetRects, setTargetRects] = useState<
    { id: string; x: number; y: number; w: number; h: number }[]
  >([]);

  const singleTargetId = !isAoE && targetIds.length === 1 ? targetIds[0] : null;
  const singleTargetHero = !isAoE && targetIds.length === 0 ? targetHero : null;
  const useLightning = pathway === 'tyrant' && !isAoE && (singleTargetId || singleTargetHero);

  useEffect(() => {
    const update = () => {
      const rects: { id: string; x: number; y: number; w: number; h: number }[] = [];

      for (const id of targetIds) {
        const el = document.querySelector(`[data-minion-id="${id}"]`) as HTMLElement | null;
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        rects.push({
          id,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          w: rect.width,
          h: rect.height,
        });
      }

      if (targetHero && targetIds.length === 0) {
        const selector = resolveTargetSelector(null, targetHero);
        const el = selector ? (document.querySelector(selector) as HTMLElement | null) : null;
        if (el) {
          const rect = el.getBoundingClientRect();
          rects.push({
            id: '__hero__',
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            w: rect.width,
            h: rect.height,
          });
        }
      }

      setTargetRects(rects);
    };

    update();
    const interval = setInterval(update, 80);
    return () => clearInterval(interval);
  }, [targetIds, targetHero, phase]);

  const showTargeting = phase === 'preview' || phase === 'strike';

  return (
    <>
      {/* Card name during preview */}
      <AnimatePresence>
        {phase === 'preview' && (
          <motion.div
            className="fixed z-[45] pointer-events-none left-1/2 -translate-x-1/2 top-[16%]"
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className={`px-5 py-2 rounded-full bg-void-900/92 border shadow-xl backdrop-blur-sm ${theme.label}`}>
              <p className="text-[10px] uppercase tracking-widest text-center opacity-80">
                {isNpc ? 'Ritual inimigo' : 'Ritual'}
              </p>
              <p className="text-sm font-bold text-center whitespace-nowrap text-white">{cardName}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single-target beam from caster hero (non-lightning rituals) */}
      {!useLightning && (singleTargetId || singleTargetHero) ? (
        <HeroPowerBeam
          sourceHero={isNpc ? 'opponent' : 'player'}
          targetId={singleTargetId}
          targetHero={singleTargetHero}
          pathway={pathway}
          phase={phase}
        />
      ) : null}

      {/* Tyrant lightning bolt from sky */}
      {useLightning && (
        <LightningStrikeEffect
          targetId={singleTargetId}
          targetHero={singleTargetHero}
          phase={phase}
          showImpact={showImpact}
        />
      )}

      {/* AoE targeting rings + board flash */}
      {isAoE && (
        <>
          <AnimatePresence>
            {showTargeting && (
              <motion.svg
                className="fixed inset-0 w-full h-full z-40 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {targetRects.map((rect) => (
                  <motion.g key={rect.id}>
                    <motion.circle
                      cx={rect.x}
                      cy={rect.y}
                      r={Math.max(rect.w, rect.h) * 0.55}
                      fill="none"
                      stroke="#fb923c"
                      strokeWidth={phase === 'strike' ? 3 : 2}
                      animate={{
                        r: phase === 'strike'
                          ? [Math.max(rect.w, rect.h) * 0.5, Math.max(rect.w, rect.h) * 0.72, Math.max(rect.w, rect.h) * 0.5]
                          : [Math.max(rect.w, rect.h) * 0.45, Math.max(rect.w, rect.h) * 0.62, Math.max(rect.w, rect.h) * 0.45],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{ duration: phase === 'strike' ? 0.7 : 1, repeat: Infinity }}
                    />
                  </motion.g>
                ))}
              </motion.svg>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === 'impact' && (
              <motion.div
                className={`fixed inset-x-0 bottom-0 h-[48%] z-[38] pointer-events-none bg-gradient-to-t ${theme.flash} to-transparent`}
                initial={{ opacity: 0, scaleY: 0.6 }}
                animate={{ opacity: [0, 0.95, 0], scaleY: [0.6, 1.05, 1] }}
                transition={{ duration: 0.65 }}
              />
            )}
          </AnimatePresence>
        </>
      )}

      {/* Impact on each target */}
      {showImpact && !useLightning && targetIds.map((id) => (
        <HeroPowerImpact
          key={id}
          show
          targetId={id}
          targetHero={null}
          pathway={pathway}
        />
      ))}
      {showImpact && !useLightning && targetHero && targetIds.length === 0 && (
        <HeroPowerImpact
          show
          targetId={null}
          targetHero={targetHero}
          pathway={pathway}
        />
      )}
    </>
  );
}
