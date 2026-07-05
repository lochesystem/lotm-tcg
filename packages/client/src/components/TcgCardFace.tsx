import { Card, BeyonderCard, SealedArtifactCard } from 'game-engine';
import { CardArt } from './CardArt';
import { KeywordBadge } from './KeywordTooltip';

const RARITY_STYLES = {
  common: { border: 'border-void-500', frame: 'from-void-700 to-void-900', glow: '' },
  rare: { border: 'border-blue-400', frame: 'from-blue-900/80 to-void-900', glow: 'shadow-blue-500/25 shadow-xl' },
  epic: { border: 'border-purple-400', frame: 'from-purple-900/80 to-void-900', glow: 'shadow-purple-500/30 shadow-xl' },
  legendary: { border: 'border-yellow-400', frame: 'from-amber-900/80 to-void-900', glow: 'shadow-yellow-500/35 shadow-2xl' },
};

const PATHWAY_GRADIENT: Record<string, string> = {
  fool: 'from-slate-600 via-gray-800 to-slate-950',
  'red-priest': 'from-red-700 via-red-900 to-red-950',
  tyrant: 'from-sky-700 via-blue-900 to-blue-950',
  sun: 'from-amber-600 via-yellow-900 to-amber-950',
  door: 'from-emerald-600 via-emerald-900 to-emerald-950',
  demoness: 'from-fuchsia-700 via-pink-900 to-pink-950',
  neutral: 'from-zinc-600 via-zinc-800 to-zinc-950',
};

const TYPE_LABELS: Record<Card['type'], string> = {
  beyonder: 'Beyonder',
  'sealed-artifact': 'Sealed Artifact',
  ritual: 'Ritual',
  'mystical-item': 'Mystical Item',
};

const TYPE_ICONS: Record<Card['type'], string> = {
  beyonder: '⚔',
  ritual: '✦',
  'sealed-artifact': '🗡',
  'mystical-item': '✧',
};

interface Props {
  card: Card;
  className?: string;
  showLockedBanner?: boolean;
}

export function TcgCardFace({ card, className = '', showLockedBanner = false }: Props) {
  const rarity = RARITY_STYLES[card.rarity];
  const gradient = PATHWAY_GRADIENT[card.pathway];
  const isBeyonder = card.type === 'beyonder';
  const isWeapon = card.type === 'sealed-artifact';

  return (
    <div
      className={`relative w-60 rounded-2xl border-[3px] bg-void-950 ${rarity.border} ${rarity.glow} ${className}`}
    >
      <div className={`absolute inset-0 rounded-[13px] bg-gradient-to-b ${rarity.frame}`} />

      <div className="relative m-1.5 rounded-xl overflow-hidden flex flex-col border border-white/10 shadow-inner">
        {/* Art frame matches PNG assets (2:3) so the image fills width without side bars */}
        <div className={`relative w-full aspect-[2/3] flex-none bg-gradient-to-b ${gradient} overflow-hidden`}>
          <CardArt cardId={card.id} opacityClass="opacity-95" fit="cover" />

          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />

          <div className="absolute top-0 left-0 z-20 w-10 h-10 rounded-br-2xl rounded-tl-lg bg-gradient-to-br from-blue-300 via-blue-500 to-indigo-900 flex items-center justify-center text-base font-black text-white shadow-xl shadow-blue-600/50 border-r-2 border-b-2 border-blue-200/30">
            {card.cost}
          </div>

          <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-white/70 bg-black/45 px-1.5 py-0.5 rounded border border-white/10">
              {TYPE_ICONS[card.type]} {TYPE_LABELS[card.type]}
            </span>
          </div>

          {showLockedBanner && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <div className="w-[108%] -ml-[4%] -rotate-6 bg-void-950/92 border-y border-void-500/50 py-1.5 shadow-2xl">
                <span className="block text-center text-[11px] font-black tracking-[0.35em] text-void-200">
                  &lt;LOCKED&gt;
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="relative flex flex-col bg-gradient-to-b from-void-900 to-void-950 px-2 pt-1.5 pb-2">
          <div className="flex-none border-b border-void-600/80 pb-1 mb-1">
            <h3 className="text-[13px] font-display font-bold text-white leading-tight text-center line-clamp-2">
              {card.name}
            </h3>
            <p className="text-[8px] text-center text-void-400 uppercase tracking-widest mt-0.5 capitalize">
              {card.pathway.replace('-', ' ')} • {card.rarity}
            </p>
          </div>

          <div className="max-h-24 overflow-y-auto">
            <p className="text-[10px] text-void-100 leading-snug text-center">
              {card.description || 'Sem efeito especial.'}
            </p>

            {card.keywords && card.keywords.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                {card.keywords.map((kw) => (
                  <KeywordBadge key={kw} keyword={kw} />
                ))}
              </div>
            )}

            {card.flavorText && (
              <p className="text-[8px] text-void-500 italic text-center mt-1.5 leading-snug">
                &ldquo;{card.flavorText}&rdquo;
              </p>
            )}
          </div>

          {(isBeyonder || isWeapon) && (
            <div className="flex-none flex justify-between items-end pt-1.5 mt-auto">
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-700 flex items-center justify-center text-sm font-black text-white shadow-lg border border-yellow-200/40">
                  {isBeyonder ? (card as BeyonderCard).attack : (card as SealedArtifactCard).attack}
                </div>
                <span className="text-[8px] text-void-400 uppercase">ATK</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-void-400 uppercase">
                  {isWeapon ? 'DUR' : 'HP'}
                </span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg border ${
                    isWeapon
                      ? 'bg-gradient-to-br from-gray-300 to-gray-600 border-gray-200/40'
                      : 'bg-gradient-to-br from-red-400 to-red-700 border-red-200/40'
                  }`}
                >
                  {isBeyonder ? (card as BeyonderCard).health : (card as SealedArtifactCard).durability}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
