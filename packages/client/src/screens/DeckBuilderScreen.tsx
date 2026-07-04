import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { useCollectionStore } from '../stores/collectionStore';
import { getCardById, Card, Pathway, getCardsForPathway, validateDeck } from 'game-engine';
import { MiniCard } from '../components/MiniCard';
import { getCurrentUserId } from '../lib/sessionContext';
import { fetchActiveDeck, saveDeck } from '../sync/player-sync';
import { isSupabaseConfigured } from '../lib/supabase';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function DeckBuilderScreen({ onNavigate }: Props) {
  const { selectedPathway, activeDeckId, setActiveDeckFromCloud } = useGameStore();
  const ownsCard = useCollectionStore((s) => s.ownsCard);
  const getQuantity = useCollectionStore((s) => s.getQuantity);
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [deckName, setDeckName] = useState('Meu Deck');
  const [filterType, setFilterType] = useState<'all' | 'beyonder' | 'ritual' | 'sealed-artifact' | 'mystical-item'>('all');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId || !isSupabaseConfigured) return;

    void (async () => {
      const deck = await fetchActiveDeck(userId);
      if (deck && deck.cards.length > 0) {
        setDeckName(deck.name);
        const cards = deck.cards
          .map((id) => getCardById(id))
          .filter((c): c is Card => !!c);
        setDeckCards(cards);
      }
    })();
  }, []);

  const available = [
    ...getCardsForPathway(selectedPathway),
    ...getCardsForPathway('neutral'),
  ].filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (isSupabaseConfigured && getCurrentUserId()) {
      return ownsCard(c.id);
    }
    return true;
  });

  const addCard = (card: Card) => {
    if (deckCards.length >= 30) return;
    const count = deckCards.filter((c) => c.id === card.id).length;
    const owned = getQuantity(card.id);
    const max = card.rarity === 'legendary' ? 1 : 2;
    if (count >= max) return;
    if (isSupabaseConfigured && getCurrentUserId() && count >= owned) return;
    setDeckCards([...deckCards, card]);
  };

  const removeCard = (index: number) => {
    setDeckCards(deckCards.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const userId = getCurrentUserId();
    if (!userId || !isSupabaseConfigured) {
      setSaveMessage('Login necessário para salvar na nuvem.');
      return;
    }

    const cardIds = deckCards.map((c) => c.id);
    const validation = validateDeck({ pathway: selectedPathway, cards: cardIds });
    if (!validation.valid) {
      setSaveMessage(validation.errors[0] ?? 'Deck inválido');
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      const saved = await saveDeck(userId, {
        id: activeDeckId ?? undefined,
        name: deckName,
        pathway: selectedPathway,
        cards: cardIds,
        isActive: true,
      });
      setActiveDeckFromCloud(saved.cards, saved.pathway as Pathway, saved.id);
      setSaveMessage('Deck salvo!');
    } catch (e) {
      setSaveMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950" />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-none flex items-center justify-between p-4 gap-2">
          <button onClick={() => onNavigate('home')} className="text-sm text-void-400 hover:text-void-200">
            Voltar
          </button>
          <h2 className="text-lg font-bold capitalize truncate">{selectedPathway}</h2>
          <span className={`text-sm font-bold shrink-0 ${deckCards.length === 30 ? 'text-green-400' : 'text-void-400'}`}>
            {deckCards.length}/30
          </span>
        </div>

        <div className="flex-none px-4 pb-2">
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-void-800 border border-void-600 text-sm"
            placeholder="Nome do deck"
          />
        </div>

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
              {t === 'all' ? 'Todas' : t.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {available.map((card) => {
                const inDeckCount = deckCards.filter((c) => c.id === card.id).length;
                const ownedQty = getQuantity(card.id);
                const maxCopies = card.rarity === 'legendary' ? 1 : 2;
                const atMax = inDeckCount >= maxCopies || (isSupabaseConfigured && getCurrentUserId() && inDeckCount >= ownedQty);
                const canAdd = deckCards.length < 30 && !atMax;

                return (
                  <div key={card.id} className="relative">
                    {inDeckCount > 0 && (
                      <div className="absolute -top-1 -left-1 z-20 w-5 h-5 rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">x{inDeckCount}</span>
                      </div>
                    )}

                    <motion.div
                      whileHover={canAdd ? { scale: 1.05 } : undefined}
                      whileTap={canAdd ? { scale: 0.95 } : undefined}
                      onClick={() => canAdd && addCard(card)}
                      className={canAdd ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                    >
                      <MiniCard card={card} />
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-36 border-l border-void-700 overflow-y-auto px-2 py-2">
            <div className="text-xs text-void-400 mb-2 text-center">Seu deck</div>
            {deckCards.length === 0 ? (
              <p className="text-xs text-void-600 text-center">Toque nas cartas</p>
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

        <div className="flex-none p-4 border-t border-void-700">
          <button
            onClick={() => void handleSave()}
            disabled={saving || deckCards.length !== 30}
            className="w-full py-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded-xl font-bold text-sm"
          >
            {saving ? 'Salvando...' : 'Salvar deck na nuvem'}
          </button>
          {saveMessage && (
            <p className="text-xs text-center mt-2 text-void-400">{saveMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
