/** Subtle nebula + starfield backdrop for hub screens. */
export function HubBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-void-950 to-void-950" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[120%] h-64 bg-purple-600/15 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -left-16 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-12 w-56 h-56 bg-fuchsia-700/10 rounded-full blur-3xl" />

      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.35) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 80% 20%, rgba(200,180,255,0.45) 0%, transparent 100%),
            radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 55%, rgba(255,255,255,0.25) 0%, transparent 100%)
          `,
        }}
      />
    </div>
  );
}
