interface PlayIconProps {
  className?: string;
  /** Nudge triangle visually toward center inside a circle button */
  opticalCenter?: boolean;
}

export function PlayIcon({ className = 'w-5 h-5', opticalCenter = false }: PlayIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`block shrink-0 ${className} ${opticalCenter ? 'translate-x-[2px]' : ''}`}
      aria-hidden
    >
      <path d="M8 6.5v11l9.5-5.5L8 6.5z" />
    </svg>
  );
}
