import { useState } from 'react';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { getAllCards, Card, Pathway, getCardsForPathway } from 'game-engine';
import { CardComponent } from '../components/Card';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function DeckBuilderScreen({ onNavigate }: Props) {
  const { selectedPathway } = useGameStore();
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'beyonder' | 'ritual' | 'sealed-artifact' | 'mystical-item'>('all');

  const available = [
    ...getCardsForPathway(selectedPathway),
    ...getCardsForPathway('neutral'),
  ].filter((c) => filterType === 'all' || c.type === filterType);

  const addCard = (card: Card) => {
    if (deckCards.length >= 30) return;
    const count = deckCards.filter((c) => c.id === card.id).length;
    const max = card.rarity === 'legendary' ? 1 : 2;
    if (count >= max) return;
    setDeckCards([...deckCards, card]);
  };

  const removeCard = (index: number) => {
    setDeckCards(deckCards.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-4">
          <button onClick={() => onNavigate('home')} className="text-sm text-void-400 hover:text-void-200">
            Back
          </button>
          <h2 className="text-lg font-bold capitalize">{selectedPathway} Deck</h2>
          <span className={`text-sm font-bold ${deckCards.length === 30 ? 'text-green-400' : 'text-void-400'}`}>
            {deckCards.length}/30
          </span>
        </div>

        {/* Type filter */}
        <div className="flex-none flex gap-1.5 px-4 pb-3 overflow-x-auto">
          {(['all', 'beyonder', 'ritual', 'sealed-artifact', 'mystical-item'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterType === t
                  ? 'bg-purple-700 text-purple-100'
                  : 'bg-void-800 text-void-400 hover:bg-void-700'
              }`}
            >
              {t === 'all' ? 'All' : t.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Split view: cards + deck list */}
        <div className="flex-1 flex min-h-0">
          {/* Available cards */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {available.map((card) => (
                <CardComponent
                  key={card.id}
                  card={card}
                  small
                  canPlay
                  onClick={() => addCard(card)}
                />
              ))}
            </div>
          </div>

          {/* Deck list */}
          <div className="w-36 border-l border-void-700 overflow-y-auto px-2 py-2">
            <div className="text-xs text-void-400 mb-2 text-center">Your Deck</div>
            {deckCards.length === 0 ? (
              <p className="text-xs text-void-600 text-center">Tap cards to add</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {deckCards.map((card, i) => (
                  <button
                    key={`${card.id}-${i}`}
                    onClick={() => removeCard(i)}
                    className="flex items-center gap-1 px-1.5 py-1 rounded bg-void-800 hover:bg-void-700 text-left transition-all"
                  >
                    <span className="text-[9px] text-blue-400 font-bold w-3">{card.cost}</span>
                    <span className="text-[9px] text-void-200 truncate flex-1">{card.name}</span>
                    <span className="text-[8px] text-void-500">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
