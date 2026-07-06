import { Screen } from '../App';
import { getAllCards, Card, Pathway, PATHWAYS } from 'game-engine';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollectionStore } from '../stores/collectionStore';
import { MiniCard, LockedMiniCard } from '../components/MiniCard';
import { CollectionCardModal } from '../components/CollectionCardModal';
import { useTranslation } from '../i18n';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function CollectionScreen({ onNavigate }: Props) {
  const { t } = useTranslation();
  const [filterPathway, setFilterPathway] = useState<Pathway | 'neutral' | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { ownsCard, getQuantity } = useCollectionStore();
  const allCards = getAllCards();

  const filtered = filterPathway === 'all'
    ? allCards
    : allCards.filter((c) => c.pathway === filterPathway);

  const ownedCount = allCards.filter((c) => ownsCard(c.id)).length;

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950" />

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-4">
          <button onClick={() => onNavigate('home')} className="text-sm text-void-400 hover:text-void-200">
            {t('common.back')}
          </button>
          <h2 className="text-xl font-bold">{t('collection.title')}</h2>
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
              {pw === 'all'
                ? t('collection.filterAll')
                : pw === 'neutral'
                  ? t('collection.filterNeutral')
                  : PATHWAYS[pw].name}
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

        <AnimatePresence>
          {selectedCard && (
            <CollectionCardModal
              card={selectedCard}
              owned={ownsCard(selectedCard.id)}
              quantity={getQuantity(selectedCard.id)}
              onClose={() => setSelectedCard(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
