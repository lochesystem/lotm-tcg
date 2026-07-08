import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { useCollectionStore } from '../stores/collectionStore';
import {
  PATHWAYS,
  PathwayDefinition,
  getCurrentStoryBoss,
  getSelectableStoryBosses,
  getStoryWinUnlock,
  isStoryComplete,
  isStoryProgressionBoss,
  type Pathway,
} from 'game-engine';
import { HowToPlay } from '../components/HowToPlay';
import { DeckSelectModal, type DeckChoice } from '../components/DeckSelectModal';
import { OptionsModal } from '../components/OptionsModal';
import { ProfileModal } from '../components/ProfileModal';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTranslation } from '../i18n';
import { useLocalizedCardText } from '../hooks/useLocalizedCardText';

interface Props {
  onNavigate: (screen: Screen) => void;
}

const PATHWAY_ICONS: Record<string, string> = {
  fool: '🎭',
  'red-priest': '🔥',
  tyrant: '⚡',
  sun: '☀️',
  door: '🚪',
  demoness: '🌙',
};

export function HomeScreen({ onNavigate }: Props) {
  const { t } = useTranslation();
  const { pathwayIdentity, pathwayPowerDescription, storyChapter } = useLocalizedCardText();
  const { selectedPathway, setPathway, startStoryBattle } = useGameStore();
  const { profile, signOut } = useAuthStore();
  const storyProgress = useCollectionStore((s) => s.storyProgress);
  const essenceBalance = useCollectionStore((s) => s.essenceBalance);
  const isPathwayUnlocked = useCollectionStore((s) => s.isPathwayUnlocked);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showDeckSelect, setShowDeckSelect] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const nextBoss = getCurrentStoryBoss(storyProgress);
  const storyDone = isStoryComplete(storyProgress);
  const selectableBosses = getSelectableStoryBosses(storyProgress);
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

  const handleStoryBattle = () => {
    setShowDeckSelect(true);
  };

  const handleDeckChosen = (choice: DeckChoice) => {
    setShowDeckSelect(false);
    startStoryBattle(selectedStoryBoss, choice.deck);
    onNavigate('battle');
  };

  const canPickBoss = selectableBosses.length > 1;
  const isReplay = canPickBoss && !isStoryProgressionBoss(storyProgress, selectedStoryBoss);

  return (
    <div className="flex-1 min-h-0 screen-scroll safe-bottom">
      <div className="relative flex flex-col items-center p-4 sm:p-6 py-6 pb-10">
      <button
        type="button"
        onClick={() => setShowOptions(true)}
        className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-xl border border-void-600 bg-void-900/80 text-void-400 hover:text-void-100 hover:border-void-500 transition-colors"
        aria-label={t('home.optionsButton')}
        title={t('home.optionsButton')}
      >
        ⚙️
      </button>
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-6 max-w-lg w-full min-w-0 pb-4">
        <motion.div
          className="text-center w-full"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-gold-400 to-purple-200 mb-1 leading-tight">
            Beyond the Veil
          </h1>
          <p className="text-void-300 text-xs tracking-[0.25em] uppercase font-medium">
            {t('home.gameSubtitle')}
          </p>
          {isSupabaseConfigured && profile && (
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="text-void-500 text-xs mt-2 hover:text-purple-300 transition-colors underline underline-offset-2"
            >
              @{profile.username}
            </button>
          )}
        </motion.div>

        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[10px] text-void-400 uppercase tracking-widest mb-2 text-center font-medium">
            {t('home.choosePathway')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(PATHWAYS).map((pw: PathwayDefinition) => {
              const unlocked = isPathwayUnlocked(pw.id as Pathway);
              const selected = selectedPathway === pw.id;

              return (
                <motion.button
                  key={pw.id}
                  onClick={() => unlocked && setPathway(pw.id)}
                  disabled={!unlocked}
                  whileHover={unlocked ? { scale: 1.03 } : undefined}
                  whileTap={unlocked ? { scale: 0.97 } : undefined}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    !unlocked
                      ? 'border-void-800 bg-void-950/80 text-void-600 cursor-not-allowed'
                      : selected
                        ? 'border-purple-400/60 bg-purple-900/30 text-purple-100 shadow-lg shadow-purple-900/20'
                        : 'border-void-700 bg-void-900/50 text-void-300 hover:border-void-500 hover:bg-void-800/50'
                  }`}
                >
                  {!unlocked && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/65 backdrop-blur-[1px]">
                      <span className="text-base opacity-80">🔒</span>
                      <span className="text-[8px] font-bold tracking-wider text-void-400 mt-0.5">{t('home.locked')}</span>
                    </div>
                  )}

                  {selected && unlocked && (
                    <motion.div
                      className="absolute inset-0 bg-purple-500/5"
                      layoutId="pathway-highlight"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className={`relative flex items-center gap-1.5 ${!unlocked ? 'opacity-40' : ''}`}>
                    <span className="text-base">{PATHWAY_ICONS[pw.id]}</span>
                    <div>
                      <div className="font-bold text-xs">{pw.name}</div>
                      <div className="text-[9px] text-void-400">{pathwayIdentity(pw.id as Pathway)}</div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          className="w-full bg-void-800/40 border border-void-700 rounded-xl p-3"
          key={selectedPathway}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="text-purple-300 font-bold">{t('home.pathwayPower')}</span>
            <span className="text-void-200">{PATHWAYS[selectedPathway].powerName}</span>
            <span className="text-void-500">{t('home.pathwayPowerCost')}</span>
          </div>
          <p className="text-[10px] text-void-400 mt-1">
            {pathwayPowerDescription(selectedPathway)}
          </p>
        </motion.div>

        <motion.div
          className="w-full bg-void-900/60 border border-purple-900/40 rounded-xl p-3"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold mb-1">
            {t('home.storyMode')}
          </p>
          {storyDone ? (
            <p className="text-xs text-green-400">{t('home.storyComplete')}</p>
          ) : nextBoss ? (
            <>
              <p className="text-xs text-void-200">{storyChapter(nextBoss)}</p>
              <p className="text-[10px] text-void-500 mt-1">
                {(() => {
                  const unlockOnWin = getStoryWinUnlock(storyProgress);
                  if (unlockOnWin) {
                    return t('home.defeatBossUnlock', {
                      name: PATHWAYS[nextBoss].name,
                      unlockName: PATHWAYS[unlockOnWin].name,
                    });
                  }
                  return t('home.defeatBoss', { name: PATHWAYS[nextBoss].name });
                })()}
              </p>
            </>
          ) : null}
          {canPickBoss && (
            <div className="mt-3">
              <p className="text-[10px] text-void-400 uppercase tracking-wider mb-2">
                {storyDone ? t('home.pickOpponent') : t('home.chapter')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectableBosses.map((boss) => {
                  const selected = selectedStoryBoss === boss;
                  const isCurrent = isStoryProgressionBoss(storyProgress, boss);
                  return (
                    <button
                      key={boss}
                      type="button"
                      onClick={() => setSelectedStoryBoss(boss)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                        selected
                          ? 'border-purple-400 bg-purple-900/50 text-purple-100'
                          : 'border-void-700 bg-void-900/60 text-void-400 hover:border-void-500'
                      }`}
                    >
                      <span className="mr-1">{PATHWAY_ICONS[boss]}</span>
                      {PATHWAYS[boss].name}
                      {isCurrent && !storyDone && (
                        <span className="ml-1 text-[8px] text-gold-400">{t('home.current')}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i < storyProgress ? 'bg-purple-500' : 'bg-void-700'}`}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col gap-2.5 w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            onClick={handleStoryBattle}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 rounded-xl font-bold text-lg tracking-wide transition-all shadow-lg shadow-purple-900/40 border border-purple-500/20"
          >
            <span>{t('home.storyModeButton')}</span>
            {(canPickBoss || (!storyDone && nextBoss)) && (
              <span className="block text-[10px] font-normal text-purple-200/80 mt-0.5">
                {t('home.vsOpponent', { name: PATHWAYS[selectedStoryBoss].name })}
                {isReplay && ` ${t('home.replay')}`}
              </span>
            )}
          </motion.button>
          <motion.button
            onClick={() => onNavigate('roguelike')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-800 to-purple-900 hover:from-indigo-700 hover:to-purple-800 rounded-xl font-semibold transition-all border border-indigo-500/30"
          >
            {t('home.roguelikeButton')}
          </motion.button>
          <motion.button
            onClick={() => onNavigate('shop')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-void-800/80 border border-amber-700/40 hover:border-amber-500/60 rounded-xl font-medium transition-all text-amber-100"
          >
            {t('home.shopButton')}
            <span className="block text-[10px] text-amber-400/80 mt-0.5">
              {t('home.essenceBalance', { amount: essenceBalance })}
            </span>
          </motion.button>
          <motion.button
            onClick={() => onNavigate('lobby')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-void-800/80 border border-void-500 hover:border-purple-500 rounded-xl font-medium transition-all"
          >
            {t('home.playWithFriends')}
          </motion.button>
          <div className="flex gap-2.5">
            <motion.button
              onClick={() => onNavigate('deck-builder')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 bg-void-800/50 border border-void-700 hover:border-void-500 rounded-xl text-sm font-medium transition-all"
            >
              {t('home.buildDeck')}
            </motion.button>
            <motion.button
              onClick={() => onNavigate('collection')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 bg-void-800/50 border border-void-700 hover:border-void-500 rounded-xl text-sm font-medium transition-all"
            >
              {t('home.collection')}
            </motion.button>
          </div>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="text-xs text-void-500 hover:text-purple-300 transition-all mt-1 underline underline-offset-2"
          >
            {t('home.howToPlayLink')}
          </button>
          {isSupabaseConfigured && (
            <button
              onClick={() => void signOut()}
              className="text-xs text-void-600 hover:text-red-400 transition-all underline underline-offset-2"
            >
              {t('home.signOut')}
            </button>
          )}
        </motion.div>
      </div>

      <HowToPlay show={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <OptionsModal
        show={showOptions}
        onClose={() => setShowOptions(false)}
        onOpenProfile={() => setShowProfile(true)}
      />
      <ProfileModal show={showProfile} onClose={() => setShowProfile(false)} />
      <DeckSelectModal
        show={showDeckSelect}
        starterPathway={selectedPathway}
        title={t('home.deckSelectTitle')}
        onSelect={handleDeckChosen}
        onClose={() => setShowDeckSelect(false)}
      />
      </div>
    </div>
  );
}
