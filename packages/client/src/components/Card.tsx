import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, Keyword, BeyonderCard, SealedArtifactCard } from 'game-engine';
import { KeywordTooltip, KeywordBadge } from './KeywordTooltip';

function useCardArt(cardId: string): string | null {
  const path = `/cards/${cardId}.png`;
  return path;
}

function CardArt({ cardId, className }: { cardId: string; className?: string }) {
  const [hasImage, setHasImage] = useState(true);
  const src = useCardArt(cardId);

  if (!src || !hasImage) return null;

  return (
    <img
      src={src}
      alt=""
      onError={() => setHasImage(false)}
      className={`absolute inset-0 w-full h-full object-cover opacity-60 ${className ?? ''}`}
      loading="lazy"
    />
  );
}

interface Props {
  card: CardType;
  canPlay?: boolean;
  onClick?: () => void;
  small?: boolean;
}

const RARITY_STYLES = {
  common: { border: 'border-void-500', glow: '' },
  rare: { border: 'border-blue-400', glow: 'shadow-blue-500/20 shadow-md' },
  epic: { border: 'border-purple-400', glow: 'shadow-purple-500/30 shadow-lg' },
  legendary: { border: 'border-gold-400', glow: 'shadow-gold-400/40 shadow-lg' },
};

const PATHWAY_GRADIENT = {
  fool: 'from-slate-700 via-gray-800 to-slate-900',
  'red-priest': 'from-red-800 via-red-900 to-red-950',
  tyrant: 'from-sky-800 via-blue-900 to-blue-950',
  sun: 'from-amber-700 via-yellow-900 to-amber-950',
  door: 'from-emerald-700 via-emerald-900 to-emerald-950',
  demoness: 'from-fuchsia-800 via-pink-900 to-pink-950',
  neutral: 'from-zinc-700 via-zinc-800 to-zinc-900',
};

const TYPE_LABELS = {
  beyonder: 'Beyonder',
  'sealed-artifact': 'Sealed Artifact',
  ritual: 'Ritual',
  'mystical-item': 'Mystical Item',
};

export function CardComponent({ card, canPlay, onClick, small }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [hoveredKeyword, setHoveredKeyword] = useState<Keyword | null>(null);

  const rarity = RARITY_STYLES[card.rarity];
  const gradient = PATHWAY_GRADIENT[card.pathway];
  const isBeyonder = card.type === 'beyonder';
  const isWeapon = card.type === 'sealed-artifact';

  const handleClick = () => {
    if (onClick && canPlay) {
      onClick();
    } else {
      setShowDetail(!showDetail);
    }
  };

  if (small) {
    return (
      <motion.button
        onClick={handleClick}
        whileHover={canPlay ? { scale: 1.08, y: -4 } : undefined}
        whileTap={canPlay ? { scale: 0.95 } : undefined}
        className={`
          relative flex-shrink-0 rounded-lg border-2 overflow-hidden transition-colors
          ${rarity.border} ${rarity.glow}
          ${canPlay ? 'cursor-pointer' : 'opacity-70'}
          w-16 h-24
          bg-gradient-to-b ${gradient}
        `}
      >
        <CardArt cardId={card.id} />
        {/* Cost — big crystal */}
        <div className="absolute -top-0.5 -left-0.5 w-6 h-6 rounded-br-xl rounded-tl-lg bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-800 flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-blue-500/40 border-r border-b border-blue-300/30 z-10">
          {card.cost}
        </div>
        <div className="relative mt-6 px-0.5 text-center text-[7px] font-medium leading-tight line-clamp-2">
          {card.name}
        </div>
        {isBeyonder && (
          <div className="absolute bottom-0 inset-x-0 flex justify-between px-0.5 pb-0.5">
            <div className="w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center text-[8px] font-bold">
              {(card as BeyonderCard).attack}
            </div>
            <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[8px] font-bold">
              {(card as BeyonderCard).health}
            </div>
          </div>
        )}
      </motion.button>
    );
  }

  return (
    <>
      <motion.button
        onClick={handleClick}
        layout
        whileHover={canPlay ? { scale: 1.08, y: -8, zIndex: 10 } : { scale: 1.02 }}
        whileTap={canPlay ? { scale: 0.92 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          relative flex-shrink-0 rounded-xl border-2 overflow-hidden
          ${rarity.border} ${rarity.glow}
          ${canPlay ? 'cursor-pointer ring-1 ring-green-400/30' : 'opacity-75'}
          w-20 h-32
          bg-gradient-to-b ${gradient}
        `}
      >
        <CardArt cardId={card.id} />

        {/* Cost crystal — prominent */}
        <div className="absolute -top-1 -left-1 w-8 h-8 rounded-br-2xl rounded-tl-xl bg-gradient-to-br from-blue-300 via-blue-500 to-indigo-800 flex items-center justify-center text-sm font-black text-white shadow-xl shadow-blue-500/50 border-r-2 border-b-2 border-blue-200/40 z-10">
          {card.cost}
        </div>

        {/* Card type indicator */}
        <div className="absolute top-1 right-1">
          <span className="text-[8px] bg-black/40 px-1 rounded text-void-300">
            {card.type === 'beyonder' ? '⚔' : card.type === 'ritual' ? '✦' : card.type === 'sealed-artifact' ? '🗡' : '?'}
          </span>
        </div>

        {/* Card name */}
        <div className="mt-7 px-1 text-center text-[9px] font-semibold leading-tight line-clamp-2 text-white/90">
          {card.name}
        </div>

        {/* Description preview */}
        {card.description && (
          <div className="mt-0.5 px-1 text-center text-[7px] leading-tight text-void-300 line-clamp-2">
            {card.description}
          </div>
        )}

        {/* Keywords */}
        {card.keywords && card.keywords.length > 0 && (
          <div className="absolute bottom-7 inset-x-0 flex flex-wrap justify-center gap-0.5 px-0.5">
            {card.keywords.map((kw) => (
              <KeywordBadge key={kw} keyword={kw} />
            ))}
          </div>
        )}

        {/* Stats */}
        {isBeyonder && (
          <div className="absolute bottom-0 inset-x-0 flex justify-between px-0.5 pb-0.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 flex items-center justify-center text-xs font-black shadow-md border border-yellow-300/30">
              {(card as BeyonderCard).attack}
            </div>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 to-red-700 flex items-center justify-center text-xs font-black shadow-md border border-red-300/30">
              {(card as BeyonderCard).health}
            </div>
          </div>
        )}

        {isWeapon && (
          <div className="absolute bottom-0 inset-x-0 flex justify-between px-0.5 pb-0.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 flex items-center justify-center text-xs font-black shadow-md">
              {(card as SealedArtifactCard).attack}
            </div>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 flex items-center justify-center text-xs font-black shadow-md">
              {(card as SealedArtifactCard).durability}
            </div>
          </div>
        )}

        {/* Playable glow pulse */}
        {canPlay && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-green-400/40"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Detail overlay on tap (mobile) */}
      {showDetail && (
        <CardDetailOverlay card={card} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}

function CardDetailOverlay({ card, onClose }: { card: CardType; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-void-900 border border-void-500 rounded-2xl p-5 max-w-xs w-full shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-display font-bold text-white">{card.name}</h3>
            <p className="text-xs text-void-400 capitalize mt-0.5">
              {TYPE_LABELS[card.type]} • {card.pathway} • {card.rarity}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {card.cost}
          </div>
        </div>

        {/* Stats */}
        {card.type === 'beyonder' && (
          <div className="flex gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-yellow-600 flex items-center justify-center text-sm font-bold">
                {(card as BeyonderCard).attack}
              </div>
              <span className="text-xs text-void-300">Ataque</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold">
                {(card as BeyonderCard).health}
              </div>
              <span className="text-xs text-void-300">Vida</span>
            </div>
          </div>
        )}
        {card.type === 'sealed-artifact' && (
          <div className="flex gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-yellow-600 flex items-center justify-center text-sm font-bold">
                {(card as SealedArtifactCard).attack}
              </div>
              <span className="text-xs text-void-300">Ataque</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-gray-500 flex items-center justify-center text-sm font-bold">
                {(card as SealedArtifactCard).durability}
              </div>
              <span className="text-xs text-void-300">Durabilidade</span>
            </div>
          </div>
        )}

        {/* Description */}
        {card.description && (
          <p className="text-sm text-void-100 mb-3 leading-relaxed">{card.description}</p>
        )}

        {/* Keywords explained */}
        {card.keywords && card.keywords.length > 0 && (
          <div className="space-y-2 mb-3 border-t border-void-700 pt-3">
            <p className="text-xs text-void-400 font-medium uppercase tracking-wider">Keywords</p>
            {card.keywords.map((kw) => (
              <KeywordExplanation key={kw} keyword={kw} />
            ))}
          </div>
        )}

        {/* Flavor text */}
        {card.flavorText && (
          <p className="text-xs text-void-500 italic border-t border-void-800 pt-2 mt-2">
            "{card.flavorText}"
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 bg-void-700 hover:bg-void-600 rounded-xl text-sm font-medium transition-all"
        >
          Fechar
        </button>
      </motion.div>
    </motion.div>
  );
}

const KEYWORD_EXPLANATIONS: Record<Keyword, { icon: string; name: string; text: string }> = {
  stealth: { icon: '👁️‍🗨️', name: 'Stealth', text: 'Invisível — não pode ser alvo até atacar.' },
  provoke: { icon: '🛡️', name: 'Provoke', text: 'Taunt — inimigos devem atacar este minion primeiro.' },
  corruption: { icon: '☠️', name: 'Corruption', text: 'Mata instantaneamente qualquer minion que danificar.' },
  divination: { icon: '🔮', name: 'Divination', text: 'Escudo — ignora o primeiro dano recebido.' },
  frenzy: { icon: '⚔️', name: 'Frenzy', text: 'Pode atacar minions no turno que entra (não o herói).' },
  haste: { icon: '💨', name: 'Haste', text: 'Pode atacar qualquer alvo imediatamente.' },
  madness: { icon: '🌀', name: 'Madness', text: 'Causa dano ao SEU herói no fim de cada turno.' },
  'sequence-ascend': { icon: '⬆️', name: 'Ascend', text: 'Evolui para forma superior se condição for cumprida.' },
};

function KeywordExplanation({ keyword }: { keyword: Keyword }) {
  const info = KEYWORD_EXPLANATIONS[keyword];
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm flex-shrink-0">{info.icon}</span>
      <div>
        <span className="text-xs font-semibold text-purple-300">{info.name}</span>
        <span className="text-xs text-void-300 ml-1">{info.text}</span>
      </div>
    </div>
  );
}
