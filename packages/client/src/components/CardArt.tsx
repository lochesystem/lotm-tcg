import { useEffect, useState } from 'react';
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

// Reset load/error state when a slot is reused for a different card.
export function CardArt(props: Props) {
  return <CardArtImage key={props.cardId} {...props} />;
}

function CardArtImage({
  cardId,
  className,
  opacityClass = 'opacity-60',
  fit = 'cover',
  loading = 'lazy',
  onLoaded,
  onMissing,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!failed) return;
    // Retry once automatically, and recover hidden images after reconnection.
    const retry = () => {
      setAttempt((value) => value + 1);
      setFailed(false);
    };
    const timer = attempt === 0 ? window.setTimeout(retry, 1500) : undefined;
    window.addEventListener('online', retry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', retry);
    };
  }, [failed, attempt]);

  if (failed) return null;

  return (
    <img
      key={attempt}
      src={getCardArtUrl(cardId)}
      alt=""
      decoding="async"
      onLoad={() => onLoaded?.()}
      onError={() => {
        setFailed(true);
        onMissing?.();
      }}
      className={`absolute inset-0 w-full h-full object-top ${
        fit === 'contain' ? 'object-contain' : 'object-cover'
      } ${opacityClass} ${className ?? ''}`}
      loading={loading}
    />
  );
}
