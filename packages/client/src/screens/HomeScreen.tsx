import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
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
import { HubBackground } from '../components/HubBackground';
import { PlayIcon } from '../components/PlayIcon';
import { EssenceIcon } from '../components/EssenceIcon';
import {
  GameModesPanel,
  type GameModeTab,
  type PvpSubMode,
} from '../components/GameModesPanel';
import { useTranslation } from '../i18n';

interface Props {
  onNavigate: (screen: Screen) => void;
  onOpenProfile: () => void;
}

export function HomeScreen({ onNavigate, onOpenProfile }: Props) {
  const { t } = useTranslation();
  const { selectedPathway, setPathway, startStoryBattle } = useGameStore();
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
    <div className="flex-1 min-h-0 overflow-y-auto hub-scroll relative">
      <HubBackground />
      <div className="relative flex flex-col items-center px-4 pt-4 pb-6 max-w-lg mx-auto w-full">
        <div className="relative z-10 w-full flex flex-col gap-4">
          {/* Header */}
          <div className="w-full">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex items-center justify-start min-w-0">
                <div
                  className="inline-flex items-center gap-1.5 h-7 px-2 rounded-lg border border-void-700/50 bg-void-950/40"
                  title={t('home.essenceBalance', { amount: essenceBalance })}
                >
                  <EssenceIcon className="w-3.5 h-3.5 text-cyan-500/60" />
                  <span className="text-xs font-medium tabular-nums leading-none text-void-300">
                    {essenceBalance}
                  </span>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center col-start-2 px-1"
              >
                <h1 className="text-3xl sm:text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-gold-400 to-purple-200 leading-tight whitespace-nowrap">
                  Beyond the Veil
                </h1>
              </motion.div>

              <div className="flex items-center justify-end min-w-0">
                <button
                  type="button"
                  onClick={() => setShowOptions(true)}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl border border-void-700/60 bg-void-950/50 text-void-500 hover:text-void-200 hover:border-void-500 transition-colors"
                  aria-label={t('home.optionsButton')}
                >
                  ⚙️
                </button>
              </div>
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
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative w-full py-4 rounded-2xl font-display font-bold text-xl tracking-[0.2em] uppercase overflow-hidden
              play-cta-glow play-cta-gradient
              border border-purple-300/40 text-purple-50"
          >
            <span className="play-cta-shimmer pointer-events-none" aria-hidden />
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center justify-center"
              >
                <PlayIcon className="w-5 h-5" opticalCenter />
              </motion.span>
              {playLabel}
            </span>
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
