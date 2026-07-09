import { PATHWAYS, STORY_BOSS_ORDER, type Pathway } from 'game-engine';

const BOSS_ICONS: Record<string, string> = {
  'red-priest': '🔥',
  tyrant: '⚡',
  sun: '☀️',
  door: '🚪',
  demoness: '🌙',
};

interface Props {
  storyProgress: number;
  currentBoss?: Pathway | null;
}

export function StoryPathMiniMap({ storyProgress, currentBoss }: Props) {
  const nodes = STORY_BOSS_ORDER;

  return (
    <div className="relative py-2 px-1">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        aria-hidden
      >
        {nodes.slice(0, -1).map((_, i) => {
          const x1 = ((i + 0.5) / nodes.length) * 100;
          const x2 = ((i + 1.5) / nodes.length) * 100;
          const cleared = i < storyProgress;
          return (
            <line
              key={`line-${i}`}
              x1={`${x1}%`}
              y1="50%"
              x2={`${x2}%`}
              y2="50%"
              stroke={cleared ? 'rgba(192, 132, 252, 0.6)' : 'rgba(100, 116, 139, 0.35)'}
              strokeWidth={cleared ? 2.5 : 1.5}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      <div className="relative flex justify-between items-center">
        <div
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-base z-10 ${
            storyProgress > 0
              ? 'border-purple-400/60 bg-purple-950/50 opacity-80'
              : 'border-purple-400 bg-purple-900/40 ring-2 ring-purple-400/30'
          }`}
          title={PATHWAYS.fool.name}
        >
          🎭
        </div>

        {nodes.map((boss, i) => {
          const cleared = storyProgress > i;
          const isCurrent = currentBoss === boss || (storyProgress === i && !cleared);
          const locked = storyProgress < i;

          return (
            <div
              key={boss}
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-base z-10 transition-all ${
                cleared
                  ? 'border-purple-400/50 bg-void-900/80 opacity-70'
                  : isCurrent
                    ? 'border-amber-400 bg-amber-950/50 ring-2 ring-amber-400/40 scale-110'
                    : locked
                      ? 'border-void-700 bg-void-950/80 opacity-35'
                      : 'border-void-600 bg-void-900/60'
              }`}
              title={PATHWAYS[boss].name}
            >
              {locked && !isCurrent ? '·' : BOSS_ICONS[boss]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
