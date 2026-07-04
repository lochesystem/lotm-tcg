import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  show: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: 'Objetivo',
    content: 'Reduza a vida do herói inimigo a 0. Cada herói começa com 30 HP. Se seu deck acabar, você sofre dano crescente (Madness) a cada turno.',
  },
  {
    title: 'Spirituality (Mana)',
    content: 'Começa em 1 e cresce +1 por turno (máximo 10). Use para jogar cartas e ativar o Pathway Power. Recarga completa todo turno.',
  },
  {
    title: 'Seu Turno',
    content: '1. Compra automática de 1 carta\n2. Jogue cartas da mão (custo ≤ Spirituality)\n3. Ataque com minions no campo\n4. Use o Pathway Power (1x por turno)\n5. Clique "Finalizar Turno"',
  },
  {
    title: 'Tipos de Carta',
    content: '⚔ Beyonder (Minion) — Fica no campo. Tem ATK e HP. Ataca a partir do próximo turno (exceto Haste/Frenzy).\n\n✦ Ritual (Spell) — Efeito instantâneo. Desaparece após uso.\n\n🗡 Sealed Artifact (Arma) — Equipa no herói. Permite atacar diretamente.\n\n❓ Mystical Item (Segredo) — Fica oculto e ativa quando o gatilho acontece.',
  },
  {
    title: 'Combate',
    content: 'Toque em um minion seu (borda verde = pode atacar), depois toque no alvo inimigo. Ambos trocam dano simultaneamente. Se a vida chegar a 0, o minion morre.',
  },
  {
    title: 'Keywords',
    content: '🛡️ Provoke — Inimigos DEVEM atacar este primeiro\n👁️‍🗨️ Stealth — Não pode ser alvo até atacar\n☠️ Corruption — Mata qualquer minion que danificar\n🔮 Divination — Ignora o primeiro dano\n⚔️ Frenzy — Ataca minions imediatamente\n💨 Haste — Ataca qualquer coisa imediatamente\n🌀 Madness X — Dano a si mesmo por turno',
  },
  {
    title: 'Pathways',
    content: 'Cada Pathway é uma classe com cartas exclusivas e um Hero Power único (custo 2, 1x por turno). Construa decks com cartas do seu Pathway + Neutras.',
  },
  {
    title: 'Deck Building',
    content: '30 cartas por deck. Máximo 2 cópias de cada carta (1 cópia para Legendárias). Só cartas do seu Pathway + Neutras.',
  },
  {
    title: 'Multiplayer',
    content: 'Crie uma sala e compartilhe o código de 4 letras com um amigo. Ambos selecionam o deck, e a partida começa automaticamente.',
  },
  {
    title: 'Recompensas',
    content: 'Vitórias contra NPCs e jogadores concedem Booster Packs:\n📦 Ordinary — 3 cartas (garantia 1 Rare+)\n📦 Beyonder — 5 cartas (garantia 1 Epic+)\n📦 Sealed — 5 cartas (garantia 1 Legendary)',
  },
];

export function HowToPlay({ show, onClose }: Props) {
  const [currentSection, setCurrentSection] = useState(0);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-void-900 border border-void-500 rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-void-700">
              <h2 className="text-lg font-display font-bold">Como Jogar</h2>
              <button onClick={onClose} className="text-void-400 hover:text-white text-lg">✕</button>
            </div>

            {/* Navigation tabs */}
            <div className="flex overflow-x-auto gap-1 p-2 border-b border-void-800">
              {SECTIONS.map((section, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSection(i)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                    currentSection === i
                      ? 'bg-purple-700 text-purple-100'
                      : 'bg-void-800 text-void-400 hover:bg-void-700'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <h3 className="text-base font-bold mb-3 text-purple-200">
                    {SECTIONS[currentSection].title}
                  </h3>
                  <p className="text-sm text-void-200 leading-relaxed whitespace-pre-line">
                    {SECTIONS[currentSection].content}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between p-4 border-t border-void-700">
              <button
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="px-3 py-1.5 text-xs font-medium text-void-400 hover:text-void-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-[10px] text-void-500">
                {currentSection + 1}/{SECTIONS.length}
              </span>
              <button
                onClick={() => setCurrentSection(Math.min(SECTIONS.length - 1, currentSection + 1))}
                disabled={currentSection === SECTIONS.length - 1}
                className="px-3 py-1.5 text-xs font-medium text-void-400 hover:text-void-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Próximo →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
