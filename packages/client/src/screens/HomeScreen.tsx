import { useState } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { PATHWAYS, PathwayDefinition } from 'game-engine';
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
  const { selectedPathway, setPathway } = useGameStore();
  const { profile, signOut } = useAuthStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full">
        {/* Title */}
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

        {/* Pathway selector */}
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
            {Object.values(PATHWAYS).map((pw: PathwayDefinition) => (
              <motion.button
                key={pw.id}
                onClick={() => setPathway(pw.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  selectedPathway === pw.id
                    ? 'border-purple-400/60 bg-purple-900/30 text-purple-100 shadow-lg shadow-purple-900/20'
                    : 'border-void-700 bg-void-900/50 text-void-300 hover:border-void-500 hover:bg-void-800/50'
                }`}
              >
                {selectedPathway === pw.id && (
                  <motion.div
                    className="absolute inset-0 bg-purple-500/5"
                    layoutId="pathway-highlight"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="relative flex items-center gap-1.5">
                  <span className="text-base">{PATHWAY_ICONS[pw.id]}</span>
                  <div>
                    <div className="font-bold text-xs">{pw.name}</div>
                    <div className="text-[9px] text-void-400">{pw.identity}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Selected pathway info */}
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

        {/* Action buttons */}
        <motion.div
          className="flex flex-col gap-2.5 w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            onClick={() => {
              useGameStore.getState().startLocalGame();
              onNavigate('battle');
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 rounded-xl font-bold text-lg tracking-wide transition-all shadow-lg shadow-purple-900/40 border border-purple-500/20"
          >
            Batalhar vs NPC
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

      {/* How to play modal */}
      <HowToPlay show={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}
