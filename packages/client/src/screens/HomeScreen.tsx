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
  getStoryChapterLabel,
  isStoryComplete,
  type Pathway,
} from 'game-engine';
import { HowToPlay } from '../components/HowToPlay';
import { isSupabaseConfigured } from '../lib/supabase';

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
  const { selectedPathway, setPathway, startStoryBattle } = useGameStore();
  const { profile, signOut } = useAuthStore();
  const storyProgress = useCollectionStore((s) => s.storyProgress);
  const isPathwayUnlocked = useCollectionStore((s) => s.isPathwayUnlocked);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const nextBoss = getCurrentStoryBoss(storyProgress);
  const storyDone = isStoryComplete(storyProgress);

  useEffect(() => {
    if (!isPathwayUnlocked(selectedPathway)) {
      setPathway('fool');
    }
  }, [selectedPathway, isPathwayUnlocked, setPathway]);

  const handleStoryBattle = () => {
    startStoryBattle();
    onNavigate('battle');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-gold-400 to-purple-200 mb-1">
            Beyond the Veil
          </h1>
          <p className="text-void-300 text-xs tracking-[0.25em] uppercase font-medium">
            Lord of the Mysteries TCG
          </p>
          {isSupabaseConfigured && profile && (
            <p className="text-void-500 text-xs mt-2">@{profile.username}</p>
          )}
        </motion.div>

        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[10px] text-void-400 uppercase tracking-widest mb-2 text-center font-medium">
            Escolha seu Pathway
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
                      <span className="text-[8px] font-bold tracking-wider text-void-400 mt-0.5">LOCKED</span>
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
                      <div className="text-[9px] text-void-400">{pw.identity}</div>
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
            <span className="text-purple-300 font-bold">Pathway Power:</span>
            <span className="text-void-200">{PATHWAYS[selectedPathway].powerName}</span>
            <span className="text-void-500">(Custo 2)</span>
          </div>
          <p className="text-[10px] text-void-400 mt-1">
            {PATHWAYS[selectedPathway].powerDescription}
          </p>
        </motion.div>

        <motion.div
          className="w-full bg-void-900/60 border border-purple-900/40 rounded-xl p-3"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold mb-1">
            Modo História
          </p>
          {storyDone ? (
            <p className="text-xs text-green-400">História completa! Todos os pathways desbloqueados.</p>
          ) : nextBoss ? (
            <>
              <p className="text-xs text-void-200">{getStoryChapterLabel(nextBoss)}</p>
              <p className="text-[10px] text-void-500 mt-1">
                Derrote o mestre {PATHWAYS[nextBoss].name} para avançar
                {nextBoss === 'sun' || nextBoss === 'door' || nextBoss === 'demoness'
                  ? ` e desbloquear ${PATHWAYS[nextBoss].name}`
                  : ''}
                .
              </p>
            </>
          ) : null}
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
            <span>Modo História</span>
            {!storyDone && nextBoss && (
              <span className="block text-[10px] font-normal text-purple-200/80 mt-0.5">
                vs {PATHWAYS[nextBoss].name}
              </span>
            )}
          </motion.button>
          <motion.button
            onClick={() => onNavigate('lobby')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-void-800/80 border border-void-500 hover:border-purple-500 rounded-xl font-medium transition-all"
          >
            Jogar com Amigos
          </motion.button>
          <div className="flex gap-2.5">
            <motion.button
              onClick={() => onNavigate('deck-builder')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 bg-void-800/50 border border-void-700 hover:border-void-500 rounded-xl text-sm font-medium transition-all"
            >
              Montar Deck
            </motion.button>
            <motion.button
              onClick={() => onNavigate('collection')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 bg-void-800/50 border border-void-700 hover:border-void-500 rounded-xl text-sm font-medium transition-all"
            >
              Coleção
            </motion.button>
          </div>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="text-xs text-void-500 hover:text-purple-300 transition-all mt-1 underline underline-offset-2"
          >
            Como Jogar — Regras e Tutorial
          </button>
          {isSupabaseConfigured && (
            <button
              onClick={() => void signOut()}
              className="text-xs text-void-600 hover:text-red-400 transition-all underline underline-offset-2"
            >
              Sair da conta
            </button>
          )}
        </motion.div>
      </div>

      <HowToPlay show={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}
