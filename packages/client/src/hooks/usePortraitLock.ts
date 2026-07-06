import { useEffect, useState } from 'react';

function isLandscapeViewport(): boolean {
  const type = window.screen?.orientation?.type;
  if (type) return type.startsWith('landscape');
  return window.innerWidth > window.innerHeight;
}

/** Touch-first layouts where portrait is required (phones, small tablets). */
function isMobileGameLayout(): boolean {
  return (
    window.matchMedia('(pointer: coarse) and (max-width: 900px)').matches ||
    window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches
  );
}

async function tryLockPortrait(): Promise<void> {
  const orientation = window.screen?.orientation as ScreenOrientation & {
    lock?: (orientation: 'portrait' | 'landscape' | 'natural') => Promise<void>;
  };
  if (!orientation?.lock) return;
  try {
    await orientation.lock('portrait');
  } catch {
    // Allowed mainly in installed PWA / fullscreen; overlay covers the rest.
  }
}

export function usePortraitLock(): boolean {
  const [blocked, setBlocked] = useState(
    () => isMobileGameLayout() && isLandscapeViewport(),
  );

  useEffect(() => {
    void tryLockPortrait();

    const update = () => {
      setBlocked(isMobileGameLayout() && isLandscapeViewport());
    };

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.screen.orientation?.addEventListener('change', update);

    const onGesture = () => {
      void tryLockPortrait();
    };
    window.addEventListener('pointerdown', onGesture, { once: true });

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.screen.orientation?.removeEventListener('change', update);
    };
  }, []);

  return blocked;
}
