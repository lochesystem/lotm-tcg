interface Props {
  className?: string;
}

export function HomeIcon({ className = 'w-5 h-5' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`block shrink-0 ${className}`}
      aria-hidden
    >
      <path d="M12 4.5 4 11v9h5v-6h6v6h5v-9l-8-6.5z" />
    </svg>
  );
}
