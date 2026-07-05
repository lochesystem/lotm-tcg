import { Card, BeyonderCard, SealedArtifactCard } from 'game-engine';
import { useState } from 'react';
import { CardArt } from './CardArt';

const PATHWAY_GRADIENT: Record<string, string> = {
  fool: 'from-slate-700 via-gray-800 to-slate-900',
  'red-priest': 'from-red-800 via-red-900 to-red-950',
  tyrant: 'from-sky-800 via-blue-900 to-blue-950',
  sun: 'from-amber-700 via-yellow-900 to-amber-950',
  door: 'from-emerald-700 via-emerald-900 to-emerald-950',
  demoness: 'from-fuchsia-800 via-pink-900 to-pink-950',
  neutral: 'from-zinc-700 via-zinc-800 to-zinc-900',
};

const RARITY_BORDER: Record<string, string> = {
  common: 'border-void-500',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-yellow-400',
};

interface MiniCardProps {
  card: Card;
  className?: string;
}

export function MiniCard({ card, className = '' }: MiniCardProps) {
  const isBeyonder = card.type === 'beyonder';
  const isWeapon = card.type === 'sealed-artifact';
  const [showName, setShowName] = useState(true);

  return (
    <div
      className={`relative w-full aspect-[2/3] rounded-lg border-2 overflow-hidden bg-gradient-to-b ${PATHWAY_GRADIENT[card.pathway]} ${RARITY_BORDER[card.rarity]} ${className}`}
    >
      <CardArt
        cardId={card.id}
        opacityClass="opacity-70"
        onLoaded={() => setShowName(false)}
        onMissing={() => setShowName(true)}
      />
      <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-[9px] font-black text-white shadow-sm z-10">
        {card.cost}
      </div>
      {showName && (
      <div className="absolute inset-0 flex items-center justify-center px-1 z-[1] pointer-events-none">
        <span className="text-[8px] font-semibold text-center leading-tight text-white/90 line-clamp-2 drop-shadow-md">
          {card.name}
        </span>
      </div>
      )}
      {isBeyonder && (
        <div className="absolute bottom-0.5 inset-x-0 flex justify-between px-0.5">
          <div className="w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center text-[7px] font-bold text-white">
            {(card as BeyonderCard).attack}
          </div>
          <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[7px] font-bold text-white">
            {(card as BeyonderCard).health}
          </div>
        </div>
      )}
      {isWeapon && (
        <div className="absolute bottom-0.5 inset-x-0 flex justify-between px-0.5">
          <div className="w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center text-[7px] font-bold text-white">
            {(card as SealedArtifactCard).attack}
          </div>
          <div className="w-4 h-4 rounded-full bg-amber-700 flex items-center justify-center text-[7px] font-bold text-white">
            {(card as SealedArtifactCard).durability}
          </div>
        </div>
      )}
    </div>
  );
}

export function LockedMiniCard({ card }: { card: Card }) {
  return (
    <div className="relative w-full aspect-[2/3] rounded-lg border-2 border-void-700 overflow-hidden bg-void-900">
      <div className="absolute inset-0 bg-black/60 z-10" />
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className="text-lg opacity-60">🔒</span>
        <span className="text-[7px] text-void-500 mt-0.5 text-center px-1 line-clamp-1">{card.name}</span>
      </div>
      <div
        className={`absolute inset-0 opacity-20 bg-gradient-to-b ${
          card.pathway === 'fool'
            ? 'from-slate-700 to-slate-900'
            : card.pathway === 'red-priest'
              ? 'from-red-900 to-red-950'
              : card.pathway === 'tyrant'
                ? 'from-sky-900 to-blue-950'
                : card.pathway === 'sun'
                  ? 'from-amber-800 to-amber-950'
                  : card.pathway === 'door'
                    ? 'from-emerald-800 to-emerald-950'
                    : card.pathway === 'demoness'
                      ? 'from-fuchsia-900 to-pink-950'
                      : 'from-zinc-800 to-zinc-900'
        }`}
      />
    </div>
  );
}
