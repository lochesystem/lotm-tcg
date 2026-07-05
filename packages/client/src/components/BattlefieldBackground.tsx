interface Props {
  url: string;
}

/** Full-screen battlefield art — bg-top keeps the dramatic opponent zone visible on tall mobile viewports. */
export function BattlefieldBackground({ url }: Props) {
  return (
    <div
      className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-top pointer-events-none"
      style={{ backgroundImage: `url("${url}")` }}
      aria-hidden
    />
  );
}
