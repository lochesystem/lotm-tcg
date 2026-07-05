import { useState } from 'react';
import { getCardArtUrl } from '../utils/cardArt';

interface Props {
  cardId: string;
  className?: string;
  opacityClass?: string;
  onLoaded?: () => void;
  onMissing?: () => void;
}

export function CardArt({ cardId, className, opacityClass = 'opacity-60', onLoaded, onMissing }: Props) {
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
      className={`absolute inset-0 w-full h-full object-cover ${opacityClass} ${className ?? ''}`}
      loading="lazy"
    />
  );
}
