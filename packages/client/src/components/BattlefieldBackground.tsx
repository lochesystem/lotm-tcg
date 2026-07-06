import { useEffect, useRef, useState } from 'react';

interface Props {
  imageUrl: string;
  videoUrl?: string | null;
}

/** Full-screen battlefield — looping muted MP4 when available, PNG poster as fallback. */
export function BattlefieldBackground({ imageUrl, videoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoActive, setVideoActive] = useState(Boolean(videoUrl));

  useEffect(() => {
    setVideoActive(Boolean(videoUrl));
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || !videoActive) return;

    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    const tryPlay = () => {
      void video.play().catch(() => setVideoActive(false));
    };

    tryPlay();

    const onVisible = () => {
      if (document.visibilityState === 'visible') tryPlay();
      else video.pause();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [videoUrl, videoActive]);

  if (videoActive && videoUrl) {
    return (
      <video
        ref={videoRef}
        className="absolute inset-0 z-0 w-full h-full object-cover object-top pointer-events-none"
        src={videoUrl}
        poster={imageUrl}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        onError={() => setVideoActive(false)}
        aria-hidden
      />
    );
  }

  return (
    <div
      className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-top pointer-events-none"
      style={{ backgroundImage: `url("${imageUrl}")` }}
      aria-hidden
    />
  );
}
