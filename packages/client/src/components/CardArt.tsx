import { useState } from 'react';
import { getCardArtUrl } from '../utils/cardArt';

interface Props {
  cardId: string;
  className?: string;
  opacityClass?: string;
  /** cover = fill frame (may crop); contain = show full art */
  fit?: 'cover' | 'contain';
  onLoaded?: () => void;
  onMissing?: () => void;
}

export function CardArt({
  cardId,
  className,
  opacityClass = 'opacity-60',
  fit = 'cover',
  onLoaded,
  onMissing,
}: Props) {
  const [hasImage, setHasImage] = useState(true);
  const src = getCardArtUrl(cardId);

  if (!hasImage) return null;

  return (
    <img
      src={src}
      alt=""
      onLoad={() => onLoaded?.()}
      onError={() => {
        setHasImage(false);
        onMissing?.();
      }}
      className={`absolute inset-0 w-full h-full object-top ${
        fit === 'contain' ? 'object-contain' : 'object-cover'
      } ${opacityClass} ${className ?? ''}`}
      loading="lazy"
    />
  );
}
