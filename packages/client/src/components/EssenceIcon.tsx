interface Props {
  className?: string;
}

export function EssenceIcon({ className = 'w-3.5 h-3.5' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`block shrink-0 ${className}`}
      aria-hidden
    >
      <path d="M12 3c-1.8 3.2-5.5 6.3-5.5 10.2A5.5 5.5 0 0 0 12 18.5a5.5 5.5 0 0 0 5.5-5.3C17.5 9.3 13.8 6.2 12 3z" />
    </svg>
  );
}
