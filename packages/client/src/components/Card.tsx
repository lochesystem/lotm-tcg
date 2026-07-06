import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, Keyword, BeyonderCard, SealedArtifactCard } from 'game-engine';
import { KeywordTooltipContent, KeywordBadge } from './KeywordTooltip';
import { AnchorTooltip } from './AnchorTooltip';
import { CardArt } from './CardArt';
import { useLocalizedCardText } from '../hooks/useLocalizedCardText';
import { useTranslation } from '../i18n';

interface Props {
  card: CardType;
  /** Green glow — enough mana and legal to select */
  playable?: boolean;
  /** @deprecated use playable */
  canPlay?: boolean;
  selected?: boolean;
  showDetail?: boolean;
  onCloseDetail?: () => void;
  onClick?: () => void;
  onHoverChange?: (hovering: boolean) => void;
  /** When true, hover lift/scale is reduced so other UI isn't covered */
  suppressHoverLift?: boolean;
  /** Floating preview above the card on hover (e.g. while another card is selected) */
  showHoverPreview?: boolean;
  /** Hand row: no vertical lift, portal tooltips */
  compactHand?: boolean;
  onKeywordHover?: (keyword: Keyword | null) => void;
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

export function CardComponent({
  card,
  playable,
  canPlay,
  selected,
  showDetail: showDetailProp,
  onCloseDetail,
  onClick,
  onHoverChange,
  suppressHoverLift,
  showHoverPreview,
  compactHand,
  onKeywordHover,
  small,
}: Props) {
  const { cardDescription } = useLocalizedCardText();
  const isPlayable = playable ?? canPlay;
  const [showDetailLocal, setShowDetailLocal] = useState(false);
  const [hoveredKeyword, setHoveredKeyword] = useState<Keyword | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [descHovered, setDescHovered] = useState(false);
  const descAnchorRef = useRef<HTMLSpanElement>(null);
  const cardAnchorRef = useRef<HTMLDivElement>(null);
  const smallAnchorRef = useRef<HTMLDivElement>(null);
  const keywordRefs = useRef<Partial<Record<Keyword, HTMLSpanElement>>>({});
  const showDetail = showDetailProp ?? showDetailLocal;

  const rarity = RARITY_STYLES[card.rarity];
  const gradient = PATHWAY_GRADIENT[card.pathway];
  const isBeyonder = card.type === 'beyonder';
  const isWeapon = card.type === 'sealed-artifact';

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    setShowDetailLocal((open) => !open);
  };

  const closeDetail = () => {
    if (onCloseDetail) onCloseDetail();
    else setShowDetailLocal(false);
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
    onHoverChange?.(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    onHoverChange?.(false);
    setHoveredKeyword(null);
  };

  const hoverMotion = compactHand
    ? { scale: selected ? 1.04 : isPlayable ? 1.03 : 1.01 }
    : suppressHoverLift && !selected
      ? { scale: 1.03 }
      : isPlayable
        ? { scale: 1.08, y: -8, zIndex: 10 }
        : { scale: 1.02 };

  const selectMotion = compactHand
    ? { scale: selected ? 1.05 : 1, zIndex: selected ? 30 : 0 }
    : { y: selected ? -10 : 0, scale: selected ? 1.08 : 1, zIndex: selected ? 30 : 0 };

  if (small) {
    return (
      <div
        ref={smallAnchorRef}
        className="relative flex-shrink-0"
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
      >
        <motion.button
          onClick={handleClick}
          whileHover={isPlayable ? { scale: 1.08, y: -4 } : undefined}
          whileTap={isPlayable ? { scale: 0.95 } : undefined}
          className={`
            relative flex-shrink-0 rounded-lg border-2 overflow-hidden transition-colors
            ${rarity.border} ${rarity.glow}
            ${selected ? 'ring-2 ring-gold-400/80 -translate-y-2 z-20' : ''}
            ${isPlayable || onClick ? 'cursor-pointer' : 'opacity-70'}
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

        <AnchorTooltip anchorEl={smallAnchorRef.current} show={isHovered}>
          <div className="bg-void-900/98 border border-void-500 rounded-xl p-2.5 shadow-2xl backdrop-blur-md">
            <CardHoverPreviewContent card={card} />
          </div>
        </AnchorTooltip>
      </div>
    );
  }

  return (
    <div
      ref={cardAnchorRef}
      className="relative flex-shrink-0 overflow-visible"
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
    >
      {showHoverPreview && isHovered && !compactHand && (
        <CardHoverPreview card={card} />
      )}

      <AnchorTooltip anchorEl={cardAnchorRef.current} show={!!(showHoverPreview && isHovered && compactHand)}>
        <CardHoverPreviewContent card={card} />
      </AnchorTooltip>

      <AnchorTooltip anchorEl={descAnchorRef.current} show={descHovered && !!card.description}>
        <p className="text-[8px] font-semibold text-blue-200 mb-0.5">Efeito</p>
        <p className="text-[9px] text-void-100 leading-snug">{cardDescription(card.description)}</p>
      </AnchorTooltip>

      {card.keywords?.map((kw) => (
        <AnchorTooltip
          key={kw}
          anchorEl={hoveredKeyword === kw ? (keywordRefs.current[kw] ?? null) : null}
          show={hoveredKeyword === kw}
        >
          <KeywordTooltipContent keyword={kw} />
        </AnchorTooltip>
      ))}

      <motion.button
        onClick={handleClick}
        layout={!compactHand}
        whileHover={hoverMotion}
        whileTap={isPlayable ? { scale: 0.96 } : undefined}
        animate={selectMotion}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          relative flex-shrink-0 rounded-xl border-2
          ${rarity.border} ${rarity.glow}
          ${selected ? 'ring-2 ring-gold-400/90 shadow-lg shadow-gold-400/20' : ''}
          ${isPlayable ? 'cursor-pointer ring-1 ring-green-400/30' : onClick ? 'cursor-pointer' : 'opacity-75'}
          w-20 h-32
        `}
      >
        <div className={`absolute inset-0 rounded-[10px] overflow-hidden bg-gradient-to-b ${gradient}`}>
          <CardArt cardId={card.id} />
        </div>

        {/* Cost crystal — prominent */}
        <div className="absolute -top-1 -left-1 w-8 h-8 rounded-br-2xl rounded-tl-xl bg-gradient-to-br from-blue-300 via-blue-500 to-indigo-800 flex items-center justify-center text-sm font-black text-white shadow-xl shadow-blue-500/50 border-r-2 border-b-2 border-blue-200/40 z-10">
          {card.cost}
        </div>

        {/* Card type indicator */}
        <div className="absolute top-1 right-1 z-10">
          <span className="text-[8px] bg-black/40 px-1 rounded text-void-300">
            {card.type === 'beyonder' ? '⚔' : card.type === 'ritual' ? '✦' : card.type === 'sealed-artifact' ? '🗡' : '?'}
          </span>
        </div>

        {/* Card name */}
        <div className="relative z-10 mt-7 px-1 text-center text-[9px] font-semibold leading-tight line-clamp-2 text-white/90">
          {card.name}
        </div>

        {/* Description preview */}
        {card.description && (
          <span
            ref={descAnchorRef}
            className="relative z-10 block mt-0.5 px-1 text-center text-[7px] leading-tight text-void-300 line-clamp-2 cursor-help"
            onMouseEnter={(e) => { e.stopPropagation(); setDescHovered(true); }}
            onMouseLeave={() => setDescHovered(false)}
          >
            {cardDescription(card.description)}
          </span>
        )}

        {/* Keywords */}
        {card.keywords && card.keywords.length > 0 && (
          <div className="absolute bottom-7 inset-x-0 z-10 flex flex-wrap justify-center gap-0.5 px-0.5">
            {card.keywords.map((kw) => (
              <span
                key={kw}
                ref={(el) => {
                  if (el) keywordRefs.current[kw] = el;
                }}
              >
                <KeywordBadge
                  keyword={kw}
                  onHover={(show) => {
                    setHoveredKeyword(show ? kw : null);
                    onKeywordHover?.(show ? kw : null);
                  }}
                />
              </span>
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
        {isPlayable && !selected && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-green-400/40"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {showDetail && (
        <CardDetailOverlay card={card} onClose={closeDetail} />
      )}
    </div>
  );
}

function CardHoverPreview({ card }: { card: CardType }) {
  return (
    <motion.div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 z-[120] pointer-events-none"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
    >
      <div className="bg-void-900/98 border border-void-500 rounded-xl p-2.5 shadow-2xl backdrop-blur-md">
        <CardHoverPreviewContent card={card} />
      </div>
    </motion.div>
  );
}

function CardHoverPreviewContent({ card }: { card: CardType }) {
  const { cardDescription } = useLocalizedCardText();
  const isWeapon = card.type === 'sealed-artifact';
  return (
    <>
      <p className="text-[11px] font-semibold text-white">{card.name}</p>
      {card.description && (
        <p className="text-[10px] text-void-200 mt-1 leading-snug">{cardDescription(card.description)}</p>
      )}
      {isWeapon && (
        <p className="text-[10px] text-void-300 mt-1">
          {(card as SealedArtifactCard).attack} Ataque / {(card as SealedArtifactCard).durability} Durabilidade
        </p>
      )}
      {card.type === 'beyonder' && (
        <p className="text-[10px] text-void-300 mt-1">
          {(card as BeyonderCard).attack}/{(card as BeyonderCard).health} ATK/Vida
        </p>
      )}
      {card.keywords && card.keywords.length > 0 && (
        <div className="mt-1.5 space-y-1 border-t border-void-700 pt-1.5">
          {card.keywords.map((kw) => (
            <KeywordExplanation key={kw} keyword={kw} />
          ))}
        </div>
      )}
    </>
  );
}

function CardDetailOverlay({ card, onClose }: { card: CardType; onClose: () => void }) {
  const { cardDescription, cardType, rarity: rarityLabel } = useLocalizedCardText();
  const { t } = useTranslation();

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
              {cardType(card.type)} • {card.pathway} • {rarityLabel(card.rarity)}
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
          <p className="text-sm text-void-100 mb-3 leading-relaxed">{cardDescription(card.description)}</p>
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
          {t('common.close')}
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
