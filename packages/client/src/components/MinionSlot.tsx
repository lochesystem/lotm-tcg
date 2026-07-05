import { useState, useEffect, useRef } from 'react';
import { motion, useAnimationControls, AnimatePresence } from 'framer-motion';
import { MinionInstance, Keyword } from 'game-engine';
import { KeywordTooltip } from './KeywordTooltip';
import { CardArt } from './CardArt';

interface Props {
  minion: MinionInstance;
  isEnemy: boolean;
  isSelected?: boolean;
  isTarget?: boolean;
  isRitualTarget?: boolean;
  isBeingAttacked?: boolean;
  onClick: () => void;
  onHover?: (hovering: boolean) => void;
}

export function MinionSlot({ minion, isEnemy, isSelected, isTarget, isRitualTarget, isBeingAttacked, onClick, onHover }: Props) {
  const [hoveredKeyword, setHoveredKeyword] = useState<Keyword | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showName, setShowName] = useState(true);
  const controls = useAnimationControls();
  const prevHealthRef = useRef(minion.currentHealth);

  // Shake when taking damage
  useEffect(() => {
    if (minion.currentHealth < prevHealthRef.current) {
      controls.start({
        x: [0, -4, 4, -3, 3, -1, 0],
        transition: { duration: 0.4 },
      });
    }
    prevHealthRef.current = minion.currentHealth;
  }, [minion.currentHealth, controls]);

  const canAttack = !isEnemy && minion.canAttack && !minion.exhausted;
  const keywords = Array.from(minion.keywords);
  const hasStealth = keywords.includes('stealth');
  const hasProvoke = keywords.includes('provoke');
  const hasDivination = keywords.includes('divination');
  const hasCorruption = keywords.includes('corruption');

  const healthDamaged = minion.currentHealth < minion.maxHealth;
  const attackBuffed = minion.currentAttack > minion.card.attack;
  const attackDebuffed = minion.currentAttack < minion.card.attack;

  return (
    <div className="relative" data-minion-id={minion.instanceId}>
      {/* Keyword tooltip */}
      {hoveredKeyword && (
        <KeywordTooltip keyword={hoveredKeyword} show={!!hoveredKeyword} />
      )}

      <motion.button
        onClick={() => {
          onClick();
          if (!isTarget && !canAttack) {
            setShowInfo(true);
            setTimeout(() => setShowInfo(false), 3000);
          }
        }}
        onContextMenu={(e) => { e.preventDefault(); setShowInfo(!showInfo); }}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        onPointerEnter={() => onHover?.(true)}
        onPointerLeave={() => onHover?.(false)}
        animate={controls}
        initial={false}
        whileHover={isTarget ? { scale: 1.08 } : canAttack ? { scale: 1.04, y: -2 } : undefined}
        whileTap={canAttack || isTarget ? { scale: 0.92 } : undefined}
        style={{
          scale: isSelected ? 1.08 : 1,
          y: isSelected ? -4 : 0,
        }}
        className={`
          relative w-[4.2rem] h-[5.2rem] rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 overflow-hidden
          ${isSelected ? 'border-green-400 shadow-green-400/40 shadow-lg ring-2 ring-green-400/30' : ''}
          ${isTarget && isEnemy ? 'border-red-400 shadow-red-500/50 shadow-lg cursor-crosshair ring-2 ring-red-400/40' : ''}
          ${isRitualTarget ? 'border-orange-400 shadow-orange-500/50 shadow-lg ring-2 ring-orange-400/50' : ''}
          ${canAttack && !isSelected ? 'border-green-500/70 hover:border-green-400 hover:shadow-green-400/20 hover:shadow-md' : ''}
          ${!isSelected && !isTarget && !canAttack ? 'border-void-600' : ''}
          ${hasProvoke ? 'ring-2 ring-yellow-500/40 ring-offset-1 ring-offset-void-950' : ''}
          bg-gradient-to-b from-void-800 to-void-900
        `}
      >
        <CardArt
          cardId={minion.card.id}
          opacityClass="opacity-75"
          onLoaded={() => setShowName(false)}
          onMissing={() => setShowName(true)}
        />

        {/* Target hit flash */}
        {isBeingAttacked && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-red-500/50 border-2 border-red-300/80 z-20 pointer-events-none"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: [0, 1, 0.6, 0], scale: [1.1, 1, 0.95, 1] }}
            transition={{ duration: 0.55 }}
          />
        )}

        {isRitualTarget && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-orange-500/25 border-2 border-orange-400/70"
            animate={{ opacity: [0.35, 0.85, 0.35], scale: [1, 1.03, 1] }}
            transition={{ duration: 0.85, repeat: Infinity }}
          />
        )}

        {/* Target pulse overlay */}
        {isTarget && isEnemy && !isRitualTarget && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-red-500/20 border-2 border-red-400/60"
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.02, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Stealth overlay */}
        {hasStealth && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-b from-gray-600/30 to-transparent"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Divination shield */}
        {hasDivination && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-cyan-400/50"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Name (fallback when no art) */}
        {showName && (
        <div className="relative z-[1] text-[8px] font-semibold text-center px-1 leading-tight line-clamp-2 mb-0.5 text-white/90 drop-shadow-md">
          {minion.card.name}
        </div>
        )}

        {/* Keywords row */}
        {keywords.length > 0 && (
          <div className="relative z-[1] flex gap-0.5 mb-0.5">
            {hasStealth && (
              <span
                className="text-[9px] cursor-help"
                onMouseEnter={() => setHoveredKeyword('stealth')}
                onMouseLeave={() => setHoveredKeyword(null)}
              >👁️‍🗨️</span>
            )}
            {hasProvoke && (
              <span
                className="text-[9px] cursor-help"
                onMouseEnter={() => setHoveredKeyword('provoke')}
                onMouseLeave={() => setHoveredKeyword(null)}
              >🛡️</span>
            )}
            {hasDivination && (
              <span
                className="text-[9px] cursor-help"
                onMouseEnter={() => setHoveredKeyword('divination')}
                onMouseLeave={() => setHoveredKeyword(null)}
              >🔮</span>
            )}
            {hasCorruption && (
              <span
                className="text-[9px] cursor-help"
                onMouseEnter={() => setHoveredKeyword('corruption')}
                onMouseLeave={() => setHoveredKeyword(null)}
              >☠️</span>
            )}
            {keywords.includes('frenzy') && (
              <span className="text-[9px]">⚔️</span>
            )}
            {keywords.includes('haste') && (
              <span className="text-[9px]">💨</span>
            )}
          </div>
        )}

        {/* Attack / Health */}
        <div className="absolute bottom-0.5 inset-x-0 z-10 flex justify-between px-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${
            attackBuffed ? 'bg-green-500 text-white' :
            attackDebuffed ? 'bg-orange-500 text-white' :
            'bg-gradient-to-br from-yellow-400 to-yellow-700 text-white'
          }`}>
            {minion.currentAttack}
          </div>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${
            healthDamaged ? 'bg-red-700 text-red-200' :
            'bg-gradient-to-br from-red-400 to-red-700 text-white'
          }`}>
            {minion.currentHealth}
          </div>
        </div>

        {/* Exhausted sleeping indicator */}
        {minion.exhausted && !isEnemy && (
          <motion.div
            className="absolute -top-1 -right-1 text-sm"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            💤
          </motion.div>
        )}

        {/* Can attack indicator */}
        {canAttack && !isSelected && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Info popup */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-void-900/98 border border-void-500 rounded-xl p-3 shadow-2xl backdrop-blur-sm"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setShowInfo(false)}
          >
            <p className="text-xs font-bold mb-1 text-white">{minion.card.name}</p>
            <p className="text-[10px] text-void-300 leading-relaxed">
              {minion.card.description || 'Sem habilidade especial.'}
            </p>
            <div className="flex gap-3 mt-2 text-[10px]">
              <span className="text-yellow-400 font-semibold">⚔️ {minion.currentAttack}/{minion.card.attack}</span>
              <span className="text-red-400 font-semibold">❤️ {minion.currentHealth}/{minion.maxHealth}</span>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {keywords.map((kw) => (
                  <span key={kw} className="px-1.5 py-0.5 bg-purple-900/50 border border-purple-500/30 rounded text-[9px] text-purple-200 capitalize">
                    {kw}
                  </span>
                ))}
              </div>
            )}
            {minion.buffs.length > 0 && (
              <p className="text-[9px] text-green-300 mt-1.5">✨ {minion.buffs.length} buff(s) ativo(s)</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
