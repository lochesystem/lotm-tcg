import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Pathway } from 'game-engine';
import { PATHWAYS } from 'game-engine';
import { Screen } from '../App';
import { RoguelikeMapScreen } from './RoguelikeMapScreen';
import { RunRewardScreen, RunCampScreen, RunEventScreen } from './RunRewardScreen';
import { useRoguelikeStore } from '../stores/roguelikeStore';
import { useGameStore } from '../stores/gameStore';
import { useCollectionStore } from '../stores/collectionStore';
import { useTranslation } from '../i18n';

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

export function RoguelikeScreen({ onNavigate }: Props) {
  const { t } = useTranslation();
  const run = useRoguelikeStore((s) => s.run);
  const phase = useRoguelikeStore((s) => s.phase);
  const startNewRun = useRoguelikeStore((s) => s.startNewRun);
  const hasActiveRun = useRoguelikeStore((s) => s.hasActiveRun);
  const lastEssence = useRoguelikeStore((s) => s.lastEssence);
  const finishRunEnd = useRoguelikeStore((s) => s.finishRunEnd);
  const addEssence = useCollectionStore((s) => s.addEssence);
  const isPathwayUnlocked = useCollectionStore((s) => s.isPathwayUnlocked);
  const ascension = useRoguelikeStore((s) => s.ascension);
  const roguelikeWins = useRoguelikeStore((s) => s.roguelikeWins);
  const roguelikeLosses = useRoguelikeStore((s) => s.roguelikeLosses);
  const bestFloor = useRoguelikeStore((s) => s.bestFloor);

  const startRoguelikeBattle = useGameStore((s) => s.startRoguelikeBattle);
  const currentNodeType = useRoguelikeStore((s) => s.currentNodeType);

  const [selectedPathway, setSelectedPathway] = useState<Pathway>('fool');
  const [showRunEnd, setShowRunEnd] = useState(false);
  const [subView, setSubView] = useState<'map' | 'reward' | 'camp' | 'event'>('map');

  useEffect(() => {
    if (phase === 'battle' && run && currentNodeType) {
      startRoguelikeBattle(run, currentNodeType);
      onNavigate('battle');
    }
  }, [phase, run, currentNodeType, startRoguelikeBattle, onNavigate]);

  useEffect(() => {
    if (phase === 'run-end' && lastEssence) {
      setShowRunEnd(true);
    }
  }, [phase, lastEssence]);

  const handleRunEndClose = async () => {
    if (lastEssence) {
      await addEssence(lastEssence.total);
    }
    finishRunEnd();
    setShowRunEnd(false);
    setSubView('map');
  };

  if (showRunEnd && lastEssence) {
    const victory = run?.victory ?? false;
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 bg-void-950 safe-bottom">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <p className="text-4xl mb-4">{victory ? '🏆' : '💀'}</p>
          <h2 className="text-2xl font-bold text-void-100 mb-2">
            {victory ? t('roguelike.victory') : t('roguelike.defeat')}
          </h2>
          <p className="text-void-400 mb-6">{t('roguelike.essenceEarned', { amount: lastEssence.total })}</p>
          <button
            type="button"
            onClick={() => void handleRunEndClose()}
            className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold"
          >
            {t('roguelike.continue')}
          </button>
        </motion.div>
      </div>
    );
  }

  if (hasActiveRun() && run) {
    if (subView === 'reward') {
      return <RunRewardScreen onDone={() => setSubView('map')} />;
    }
    if (subView === 'camp') {
      return <RunCampScreen onDone={() => setSubView('map')} />;
    }
    if (subView === 'event') {
      return <RunEventScreen onDone={() => setSubView('map')} />;
    }

    return (
      <RoguelikeMapScreen
        onOpenReward={() => setSubView('reward')}
        onOpenCamp={() => setSubView('camp')}
        onOpenEvent={() => setSubView('event')}
      />
    );
  }

  const unlockedPathways = (Object.keys(PATHWAYS) as Pathway[]).filter(isPathwayUnlocked);

  return (
    <div className="flex-1 min-h-0 screen-scroll safe-bottom">
      <div className="flex flex-col items-center p-4 sm:p-6 py-6 max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="self-start text-sm text-void-400 hover:text-void-200 mb-4"
        >
          ← {t('common.back')}
        </button>

        <h1 className="text-2xl font-bold text-void-100 mb-1">{t('roguelike.title')}</h1>
        <p className="text-sm text-void-400 text-center mb-6">{t('roguelike.description')}</p>

        <div className="w-full mb-6 p-4 rounded-xl border border-void-700 bg-void-900/50">
          <p className="text-xs text-void-500 uppercase tracking-wider mb-2">{t('roguelike.stats')}</p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-void-100 font-bold">{roguelikeWins}</p>
              <p className="text-void-500 text-xs">{t('roguelike.wins')}</p>
            </div>
            <div>
              <p className="text-void-100 font-bold">{roguelikeLosses}</p>
              <p className="text-void-500 text-xs">{t('roguelike.losses')}</p>
            </div>
            <div>
              <p className="text-void-100 font-bold">{bestFloor}</p>
              <p className="text-void-500 text-xs">{t('roguelike.bestFloor')}</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-void-300 mb-3 self-start">{t('roguelike.choosePathway')}</p>
        <div className="grid grid-cols-2 gap-2 w-full mb-6">
          {unlockedPathways.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPathway(p)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedPathway === p
                  ? 'border-purple-500 bg-purple-950/40'
                  : 'border-void-700 bg-void-900/40 hover:border-void-500'
              }`}
            >
              <span className="text-xl">{PATHWAY_ICONS[p]}</span>
              <p className="text-sm font-medium text-void-100 mt-1">{PATHWAYS[p].name}</p>
            </button>
          ))}
        </div>

        <div className="w-full mb-6">
          <label className="text-sm text-void-400 block mb-2">
            {t('roguelike.ascension', { level: ascension })}
          </label>
          <input
            type="range"
            min={0}
            max={5}
            value={ascension}
            onChange={(e) => useRoguelikeStore.setState({ ascension: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <button
          type="button"
          onClick={() => startNewRun(selectedPathway, ascension)}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-bold text-lg hover:from-purple-600 hover:to-indigo-600"
        >
          {t('roguelike.startRun')}
        </button>
      </div>
    </div>
  );
}
