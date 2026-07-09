import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { useCollectionStore } from '../stores/collectionStore';
import {
  getCurrentStoryBoss,
  getSelectableStoryBosses,
  isStoryComplete,
  type Pathway,
} from 'game-engine';
import { HowToPlay } from '../components/HowToPlay';
import { DeckSelectModal, type DeckChoice } from '../components/DeckSelectModal';
import { OptionsModal } from '../components/OptionsModal';
import { PathwayHeroCard } from '../components/PathwayHeroCard';
import {
  GameModesPanel,
  type GameModeTab,
  type PvpSubMode,
} from '../components/GameModesPanel';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTranslation } from '../i18n';

interface Props {
  onNavigate: (screen: Screen) => void;
  onOpenProfile: () => void;
}

export function HomeScreen({ onNavigate, onOpenProfile }: Props) {
  const { t } = useTranslation();
  const { selectedPathway, setPathway, startStoryBattle } = useGameStore();
  const { profile } = useAuthStore();
  const storyProgress = useCollectionStore((s) => s.storyProgress);
  const essenceBalance = useCollectionStore((s) => s.essenceBalance);
  const isPathwayUnlocked = useCollectionStore((s) => s.isPathwayUnlocked);

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showDeckSelect, setShowDeckSelect] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [modeTab, setModeTab] = useState<GameModeTab>('story');
  const [pvpSubMode, setPvpSubMode] = useState<PvpSubMode>('ranked');

  const nextBoss = getCurrentStoryBoss(storyProgress);
  const selectableBosses = getSelectableStoryBosses(storyProgress);
  const storyDone = isStoryComplete(storyProgress);
  const [selectedStoryBoss, setSelectedStoryBoss] = useState<Pathway>(
    () => nextBoss ?? selectableBosses[selectableBosses.length - 1] ?? 'red-priest'
  );

  useEffect(() => {
    if (nextBoss) {
      setSelectedStoryBoss(nextBoss);
    } else if (!selectableBosses.includes(selectedStoryBoss)) {
      setSelectedStoryBoss(selectableBosses[0] ?? 'red-priest');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset boss when story progress advances
  }, [storyProgress, nextBoss, selectableBosses]);

  useEffect(() => {
    if (!isPathwayUnlocked(selectedPathway)) {
      setPathway('fool');
    }
  }, [selectedPathway, isPathwayUnlocked, setPathway]);

  const handleDeckChosen = (choice: DeckChoice) => {
    setShowDeckSelect(false);
    startStoryBattle(selectedStoryBoss, choice.deck);
    onNavigate('battle');
  };

  const handlePrimaryPlay = () => {
    switch (modeTab) {
      case 'story':
        setShowDeckSelect(true);
        break;
      case 'pvp':
        onNavigate(pvpSubMode === 'ranked' ? 'ranked' : 'lobby');
        break;
      case 'trail':
        onNavigate('roguelike');
        break;
    }
  };

  const playLabel =
    modeTab === 'story'
      ? storyDone
        ? t('home.playStoryReplay')
        : t('home.playButton')
      : modeTab === 'pvp'
        ? pvpSubMode === 'ranked'
          ? t('home.playRanked')
          : t('home.playFriends')
        : t('home.playTrail');

  return (
    <div className="flex-1 min-h-0 overflow-y-auto hub-scroll">
      <div className="relative flex flex-col items-center px-4 pt-4 pb-6 max-w-lg mx-auto w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-w-0"
            >
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-gold-400 to-purple-200 leading-tight">
                Beyond the Veil
              </h1>
              <p className="text-void-400 text-[10px] tracking-[0.2em] uppercase">
                {t('home.gameSubtitle')}
              </p>
              {isSupabaseConfigured && profile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="text-void-500 text-[10px] mt-1 hover:text-purple-300 transition-colors"
                >
                  @{profile.username}
                </button>
              )}
            </motion.div>

            <div className="flex items-center gap-2 flex-none">
              <div className="px-2.5 py-1.5 rounded-xl border border-amber-700/40 bg-void-900/80 text-right">
                <p className="text-[8px] text-amber-500/80 uppercase tracking-wider">{t('home.essenceLabel')}</p>
                <p className="text-sm font-bold text-amber-200 leading-none">{essenceBalance}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowOptions(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-void-600 bg-void-900/80 text-void-400 hover:text-void-100 hover:border-void-500 transition-colors"
                aria-label={t('home.optionsButton')}
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Pathway hero card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <PathwayHeroCard
              selectedPathway={selectedPathway}
              onSelectPathway={setPathway}
              isPathwayUnlocked={isPathwayUnlocked}
            />
          </motion.div>

          {/* Primary play CTA */}
          <motion.button
            type="button"
            onClick={handlePrimaryPlay}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full py-4 rounded-2xl font-display font-bold text-xl tracking-[0.15em] uppercase
              bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800
              hover:from-purple-500 hover:via-purple-600 hover:to-purple-700
              border border-purple-400/30 shadow-lg shadow-purple-900/50 text-purple-50"
          >
            {playLabel}
          </motion.button>

          {/* Game modes panel */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <GameModesPanel
              activeTab={modeTab}
              onTabChange={setModeTab}
              storyProgress={storyProgress}
              essenceBalance={essenceBalance}
              nextBoss={nextBoss}
              selectedStoryBoss={selectedStoryBoss}
              onSelectStoryBoss={setSelectedStoryBoss}
              selectableBosses={selectableBosses}
              storyDone={storyDone}
              pvpSubMode={pvpSubMode}
              onPvpSubModeChange={setPvpSubMode}
              onContinueStory={() => setShowDeckSelect(true)}
              onOpenRanked={() => onNavigate('ranked')}
              onOpenFriends={() => onNavigate('lobby')}
              onOpenTrail={() => onNavigate('roguelike')}
            />
          </motion.div>

          <button
            type="button"
            onClick={() => setShowHowToPlay(true)}
            className="text-xs text-void-500 hover:text-purple-300 transition-all text-center underline underline-offset-2"
          >
            {t('home.howToPlayLink')}
          </button>
        </div>
      </div>

      <HowToPlay show={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <OptionsModal
        show={showOptions}
        onClose={() => setShowOptions(false)}
        onOpenProfile={onOpenProfile}
      />
      <DeckSelectModal
        show={showDeckSelect}
        starterPathway={selectedPathway}
        title={t('home.deckSelectTitle')}
        onSelect={handleDeckChosen}
        onClose={() => setShowDeckSelect(false)}
      />
    </div>
  );
}
