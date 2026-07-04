import { Screen } from '../App';
import { getAllCards, Card, Pathway, BeyonderCard } from 'game-engine';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollectionStore } from '../stores/collectionStore';
import { MiniCard, LockedMiniCard } from '../components/MiniCard';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function CollectionScreen({ onNavigate }: Props) {
  const [filterPathway, setFilterPathway] = useState<Pathway | 'neutral' | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { ownsCard, getQuantity } = useCollectionStore();
  const allCards = getAllCards();

  const filtered = filterPathway === 'all'
    ? allCards
    : allCards.filter((c) => c.pathway === filterPathway);

  const ownedCount = allCards.filter((c) => ownsCard(c.id)).length;

  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-4">
          <button onClick={() => onNavigate('home')} className="text-sm text-void-400 hover:text-void-200">
            ← Voltar
          </button>
          <h2 className="text-xl font-bold">Coleção</h2>
          <div className="text-sm text-void-400">{ownedCount}/{allCards.length}</div>
        </div>

        {/* Filters */}
        <div className="flex-none flex gap-1.5 px-4 pb-3 overflow-x-auto">
          {(['all', 'neutral', 'fool', 'red-priest', 'tyrant', 'sun', 'door', 'demoness'] as const).map((pw) => (
            <button
              key={pw}
              onClick={() => setFilterPathway(pw)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterPathway === pw
                  ? 'bg-purple-700 text-purple-100'
                  : 'bg-void-800 text-void-400 hover:bg-void-700'
              }`}
            >
              {pw === 'all' ? 'Todas' : pw.charAt(0).toUpperCase() + pw.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {filtered.map((card, index) => {
              const owned = ownsCard(card.id);
              const qty = getQuantity(card.id);
              const globalIndex = allCards.findIndex((c) => c.id === card.id) + 1;

              return (
                <div key={card.id} className="relative">
                  {/* Card number */}
                  <div className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-void-700 border border-void-500 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-void-300">#{globalIndex}</span>
                  </div>

                  {/* Quantity badge */}
                  {owned && qty > 1 && (
                    <div className="absolute -top-1 -left-1 z-20 w-5 h-5 rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">x{qty}</span>
                    </div>
                  )}

                  {/* Card or locked placeholder */}
                  {owned ? (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedCard(card)}
                      className="cursor-pointer"
                    >
                      <MiniCard card={card} />
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedCard(card)}
                      className="cursor-pointer"
                    >
                      <LockedMiniCard card={card} />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card detail modal */}
        <AnimatePresence>
          {selectedCard && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
              onClick={() => setSelectedCard(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-void-900 border border-void-600 rounded-2xl p-6 max-w-xs w-full"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold">{selectedCard.name}</h3>
                  <span className="text-blue-400 font-bold text-lg">{selectedCard.cost}</span>
                </div>
                <div className="text-xs text-void-400 uppercase mb-2 flex items-center gap-2">
                  <span>{selectedCard.type.replace('-', ' ')}</span>
                  <span>•</span>
                  <span>{selectedCard.pathway}</span>
                  <span>•</span>
                  <span className={
                    selectedCard.rarity === 'legendary' ? 'text-yellow-400' :
                    selectedCard.rarity === 'epic' ? 'text-purple-400' :
                    selectedCard.rarity === 'rare' ? 'text-blue-400' : 'text-void-400'
                  }>{selectedCard.rarity}</span>
                </div>
                <p className="text-sm text-void-200 mb-3">{selectedCard.description || 'Sem efeito especial.'}</p>
                {selectedCard.keywords && selectedCard.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedCard.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 bg-purple-900/50 border border-purple-500/30 rounded text-[10px] text-purple-200 capitalize">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                {selectedCard.flavorText && (
                  <p className="text-xs text-void-500 italic mb-3">"{selectedCard.flavorText}"</p>
                )}
                {selectedCard.type === 'beyonder' && (
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-yellow-400 font-semibold">⚔️ {(selectedCard as BeyonderCard).attack}</span>
                    <span className="text-red-400 font-semibold">❤️ {(selectedCard as BeyonderCard).health}</span>
                  </div>
                )}

                {/* Owned status */}
                <div className="mt-3 pt-3 border-t border-void-700">
                  {ownsCard(selectedCard.id) ? (
                    <p className="text-xs text-green-400">✓ Possui x{getQuantity(selectedCard.id)}</p>
                  ) : (
                    <p className="text-xs text-void-500">🔒 Não adquirida — ganhe packs para desbloquear</p>
                  )}
                </div>

                <button
                  onClick={() => setSelectedCard(null)}
                  className="mt-4 w-full py-2 bg-void-700 hover:bg-void-600 rounded-lg text-sm transition-all"
                >
                  Fechar
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
