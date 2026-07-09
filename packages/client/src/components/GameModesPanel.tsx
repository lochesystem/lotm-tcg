import { motion } from 'framer-motion';
import {
  PATHWAYS,
  getStoryWinUnlock,
  isStoryProgressionBoss,
  type Pathway,
} from 'game-engine';
import { useTranslation } from '../i18n';
import { useLocalizedCardText } from '../hooks/useLocalizedCardText';
import { StoryPathMiniMap } from './StoryPathMiniMap';
import { EssenceBadge } from './EssenceBadge';

export type GameModeTab = 'story' | 'pvp' | 'trail';

export type PvpSubMode = 'ranked' | 'friends';

interface Props {
  activeTab: GameModeTab;
  onTabChange: (tab: GameModeTab) => void;
  storyProgress: number;
  essenceBalance: number;
  nextBoss: Pathway | null;
  selectedStoryBoss: Pathway;
  onSelectStoryBoss: (boss: Pathway) => void;
  selectableBosses: Pathway[];
  storyDone: boolean;
  pvpSubMode: PvpSubMode;
  onPvpSubModeChange: (mode: PvpSubMode) => void;
  onContinueStory: () => void;
  onOpenRanked: () => void;
  onOpenFriends: () => void;
  onOpenTrail: () => void;
}

const PATHWAY_ICONS: Record<string, string> = {
  fool: '🎭',
  'red-priest': '🔥',
  tyrant: '⚡',
  sun: '☀️',
  door: '🚪',
  demoness: '🌙',
};

const TABS: { id: GameModeTab; labelKey: string }[] = [
  { id: 'story', labelKey: 'home.modeTabStory' },
  { id: 'pvp', labelKey: 'home.modeTabPvp' },
  { id: 'trail', labelKey: 'home.modeTabTrail' },
];

export function GameModesPanel({
  activeTab,
  onTabChange,
  storyProgress,
  essenceBalance,
  nextBoss,
  selectedStoryBoss,
  onSelectStoryBoss,
  selectableBosses,
  storyDone,
  pvpSubMode,
  onPvpSubModeChange,
  onContinueStory,
  onOpenRanked,
  onOpenFriends,
  onOpenTrail,
}: Props) {
  const { t } = useTranslation();
  const { storyChapter } = useLocalizedCardText();
  const canPickBoss = selectableBosses.length > 1;
  const currentBoss = storyDone ? selectedStoryBoss : nextBoss;
  const unlockOnWin = nextBoss ? getStoryWinUnlock(storyProgress) : null;

  return (
    <div className="w-full rounded-2xl border border-purple-800/60 bg-void-950/80 overflow-hidden shadow-xl shadow-purple-950/25 hub-panel-glow">
      <div className="flex gap-1 p-1.5 bg-void-900/60 border-b border-void-800/80">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${
                active
                  ? 'bg-gradient-to-b from-purple-600/90 to-purple-800/90 text-purple-50 shadow-md shadow-purple-900/40 border border-purple-400/30'
                  : 'text-void-500 hover:text-void-300 hover:bg-void-800/40'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="p-3.5 min-h-[168px]">
        {activeTab === 'story' && (
          <motion.div
            key="story"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div>
              <p className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">
                {t('home.storyMode')}
              </p>
              <p className="text-sm text-void-100 font-medium mt-0.5">
                {storyDone
                  ? t('home.storyComplete')
                  : currentBoss
                    ? storyChapter(currentBoss)
                    : t('home.storyMode')}
              </p>
              {!storyDone && nextBoss && (
                <p className="text-[10px] text-void-500 mt-1">
                  {unlockOnWin
                    ? t('home.defeatBossUnlock', {
                        name: PATHWAYS[nextBoss].name,
                        unlockName: PATHWAYS[unlockOnWin].name,
                      })
                    : t('home.defeatBoss', { name: PATHWAYS[nextBoss].name })}
                </p>
              )}
            </div>

            <StoryPathMiniMap storyProgress={storyProgress} currentBoss={currentBoss} />

            {canPickBoss && (
              <div className="flex flex-wrap gap-1.5">
                {selectableBosses.map((boss) => {
                  const selected = selectedStoryBoss === boss;
                  const isCurrent = isStoryProgressionBoss(storyProgress, boss);
                  return (
                    <button
                      key={boss}
                      type="button"
                      onClick={() => onSelectStoryBoss(boss)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                        selected
                          ? 'border-purple-400 bg-purple-900/50 text-purple-100'
                          : 'border-void-700 bg-void-900/60 text-void-400 hover:border-void-500'
                      }`}
                    >
                      <span className="mr-0.5">{PATHWAY_ICONS[boss]}</span>
                      {PATHWAYS[boss].name}
                      {isCurrent && !storyDone && (
                        <span className="ml-1 text-[8px] text-gold-400">{t('home.current')}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={onContinueStory}
              className="w-full py-2.5 rounded-xl bg-purple-900/50 border border-purple-500/30 text-sm font-semibold text-purple-100 hover:bg-purple-800/50 transition-colors"
            >
              {storyDone ? t('home.continueStoryReplay') : t('home.continueStory')}
            </button>
          </motion.div>
        )}

        {activeTab === 'pvp' && (
          <motion.div
            key="pvp"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5"
          >
            <p className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">
              {t('home.modeTabPvp')}
            </p>
            <p className="text-[11px] text-void-400">{t('home.pvpModeHint')}</p>

            <button
              type="button"
              onClick={() => {
                onPvpSubModeChange('ranked');
                onOpenRanked();
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                pvpSubMode === 'ranked'
                  ? 'border-red-500/50 bg-red-950/30'
                  : 'border-void-700 bg-void-900/50 hover:border-void-500'
              }`}
            >
              <p className="text-sm font-semibold text-red-100">{t('home.rankedButton')}</p>
              <p className="text-[10px] text-void-400 mt-0.5">{t('home.rankedSubtitle')}</p>
            </button>

            <button
              type="button"
              onClick={() => {
                onPvpSubModeChange('friends');
                onOpenFriends();
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                pvpSubMode === 'friends'
                  ? 'border-purple-500/50 bg-purple-950/30'
                  : 'border-void-700 bg-void-900/50 hover:border-void-500'
              }`}
            >
              <p className="text-sm font-semibold text-void-100">{t('home.playWithFriends')}</p>
              <p className="text-[10px] text-void-400 mt-0.5">{t('home.friendsSubtitle')}</p>
            </button>
          </motion.div>
        )}

        {activeTab === 'trail' && (
          <motion.div
            key="trail"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div>
              <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">
                {t('home.modeTabTrail')}
              </p>
              <p className="text-sm text-void-100 font-medium mt-0.5">{t('home.roguelikeButton')}</p>
              <p className="text-[11px] text-void-400 mt-1 leading-relaxed">{t('home.trailModeHint')}</p>
            </div>

            <div className="flex justify-center gap-3 py-2 opacity-80">
              {['⚔️', '💀', '🔥', '💎', '👁️'].map((icon, i) => (
                <span key={i} className="text-lg">
                  {icon}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenTrail}
              className="w-full py-2.5 rounded-xl bg-indigo-900/40 border border-indigo-500/30 text-sm font-semibold text-indigo-100 hover:bg-indigo-800/40 transition-colors"
            >
              {t('home.enterTrail')}
            </button>
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t border-void-800/80 bg-void-900/30">
        {activeTab === 'story' ? (
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-void-500">{t('home.storyProgressLabel')}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5 flex-1 max-w-[7rem]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i < storyProgress ? 'bg-purple-500' : 'bg-void-700'}`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-medium text-void-400 tabular-nums">
                {storyProgress}/5
              </span>
            </div>
          </div>
        ) : (
          <div className="min-w-0" />
        )}
        <EssenceBadge amount={essenceBalance} />
      </div>
    </div>
  );
}
