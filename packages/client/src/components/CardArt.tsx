import { useEffect, useState } from 'react';
import { ensureCardArtInMemory, getMemoryCachedCardArtUrl } from '../utils/cardArtCache';
import { getCardArtUrl } from '../utils/cardArt';

interface Props {
  cardId: string;
  className?: string;
  opacityClass?: string;
  /** cover = fill frame (may crop); contain = show full art */
  fit?: 'cover' | 'contain';
  loading?: 'lazy' | 'eager';
  onLoaded?: () => void;
  onMissing?: () => void;
}

export function CardArt({
  cardId,
  className,
  opacityClass = 'opacity-60',
  fit = 'cover',
  loading = 'lazy',
  onLoaded,
  onMissing,
}: Props) {
  const [hasImage, setHasImage] = useState(true);
  const [src, setSrc] = useState(() => getMemoryCachedCardArtUrl(cardId) ?? getCardArtUrl(cardId));

  useEffect(() => {
    setHasImage(true);

    const cached = getMemoryCachedCardArtUrl(cardId);
    if (cached) {
      setSrc(cached);
      return;
    }

    setSrc(getCardArtUrl(cardId));

    let cancelled = false;
    void ensureCardArtInMemory(cardId).then((blobUrl) => {
      if (!cancelled && blobUrl) setSrc(blobUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (!hasImage) return null;

  return (
    <img
      src={src}
      alt=""
      decoding="async"
      onLoad={() => onLoaded?.()}
      onError={() => {
        setHasImage(false);
        onMissing?.();
      }}
      className={`absolute inset-0 w-full h-full object-top ${
        fit === 'contain' ? 'object-contain' : 'object-cover'
      } ${opacityClass} ${className ?? ''}`}
      loading={loading}
    />
  );
}
