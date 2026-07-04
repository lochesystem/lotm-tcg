import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { useCollectionStore } from '../stores/collectionStore';
import { getCardById, Card, Pathway, getCardsForPathway, validateDeck } from 'game-engine';
import { MiniCard } from '../components/MiniCard';
import { getCurrentUserId } from '../lib/sessionContext';
import {
  activateDeck,
  DECK_SLOT_COUNT,
  ensureDeckSlots,
  saveDeckToSlot,
} from '../sync/player-sync';
import { isSupabaseConfigured, type DbDeck } from '../lib/supabase';

interface Props {
  onNavigate: (screen: Screen) => void;
}

function cardsFromIds(ids: string[]): Card[] {
  return ids.map((id) => getCardById(id)).filter((c): c is Card => !!c);
}

export function DeckBuilderScreen({ onNavigate }: Props) {
  const { selectedPathway, activeDeckId, setPathway, setActiveDeckFromCloud } = useGameStore();
  const ownsCard = useCollectionStore((s) => s.ownsCard);
  const getQuantity = useCollectionStore((s) => s.getQuantity);
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [deckName, setDeckName] = useState('Meu Deck');
  const [filterType, setFilterType] = useState<'all' | 'beyonder' | 'ritual' | 'sealed-artifact' | 'mystical-item'>('all');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSlots, setSavedSlots] = useState<(DbDeck | null)[]>(Array(DECK_SLOT_COUNT).fill(null));
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const loadSlotIntoEditor = useCallback(
    (slot: number, slots: (DbDeck | null)[]) => {
      const deck = slots[slot];
      if (deck && deck.cards.length > 0) {
        setPathway(deck.pathway as Pathway);
        setDeckName(deck.name);
        setDeckCards(cardsFromIds(deck.cards));
        if (deck.cards.length === 30) {
          setActiveDeckFromCloud(deck.cards, deck.pathway as Pathway, deck.id);
        }
      } else {
        setDeckName(`Deck ${slot + 1}`);
        setDeckCards([]);
      }
    },
    [setPathway, setActiveDeckFromCloud]
  );

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId || !isSupabaseConfigured) return;

    setLoadingSlots(true);
    void (async () => {
      try {
        const slots = await ensureDeckSlots(userId, useGameStore.getState().selectedPathway);
        setSavedSlots(slots);
        const activeSlot = slots.findIndex((d) => d?.is_active);
        const startSlot = activeSlot >= 0 ? activeSlot : 0;
        setSelectedSlot(startSlot);
        loadSlotIntoEditor(startSlot, slots);
      } finally {
        setLoadingSlots(false);
      }
    })();
    // Load cloud slots once when opening the builder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSlot = async (slot: number) => {
    if (slot === selectedSlot) return;

    setSelectedSlot(slot);
    loadSlotIntoEditor(slot, savedSlots);
    setSaveMessage(null);

    const deck = savedSlots[slot];
    const userId = getCurrentUserId();
    if (!deck || deck.cards.length !== 30 || !userId) return;

    try {
      const activated = await activateDeck(userId, deck.id);
      const nextSlots = savedSlots.map((d, i) => {
        if (!d) return null;
        if (i === slot) return activated;
        return { ...d, is_active: false };
      });
      setSavedSlots(nextSlots);
      setActiveDeckFromCloud(activated.cards, activated.pathway as Pathway, activated.id);
    } catch {
      /* keep editing slot even if activation fails */
    }
  };

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
      const saved = await saveDeckToSlot(userId, selectedSlot, {
        id: savedSlots[selectedSlot]?.id,
        name: deckName.trim() || `Deck ${selectedSlot + 1}`,
        pathway: selectedPathway,
        cards: cardIds,
        isActive: true,
      });
      const nextSlots = savedSlots.map((d, i) => {
        if (i === selectedSlot) return saved;
        return d ? { ...d, is_active: false } : null;
      });
      setSavedSlots(nextSlots);
      setActiveDeckFromCloud(saved.cards, saved.pathway as Pathway, saved.id);
      setSaveMessage('Deck salvo!');
    } catch (e) {
      setSaveMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cloudEnabled = isSupabaseConfigured && !!getCurrentUserId();

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

        {cloudEnabled && (
          <div className="flex-none px-4 pb-2">
            <p className="text-[10px] text-void-500 uppercase tracking-wider mb-1.5">Seus decks na nuvem</p>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: DECK_SLOT_COUNT }, (_, slot) => {
                const saved = savedSlots[slot];
                const isSelected = selectedSlot === slot;
                const isInUse = saved?.is_active ?? false;
                const cardCount = saved?.cards.length ?? 0;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={loadingSlots}
                    onClick={() => void selectSlot(slot)}
                    className={`rounded-lg border px-2 py-2 text-left transition-all ${
                      isSelected
                        ? 'border-purple-400 bg-purple-900/40 shadow-md shadow-purple-900/20'
                        : 'border-void-600 bg-void-800/80 hover:border-void-500'
                    } ${loadingSlots ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-void-200">Slot {slot + 1}</span>
                      {isInUse && (
                        <span className="text-[8px] font-semibold text-green-400 uppercase">Em uso</span>
                      )}
                    </div>
                    <p className="text-[9px] text-void-300 truncate mt-0.5">
                      {saved?.name ?? 'Vazio'}
                    </p>
                    <p className="text-[8px] text-void-500 mt-0.5">
                      {cardCount > 0 ? `${cardCount}/30 cartas` : 'Sem cartas'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                const atMax = inDeckCount >= maxCopies || (cloudEnabled && inDeckCount >= ownedQty);
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
            disabled={saving || deckCards.length !== 30 || !cloudEnabled}
            className="w-full py-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded-xl font-bold text-sm"
          >
            {saving ? 'Salvando...' : cloudEnabled ? 'Salvar deck na nuvem' : 'Login necessário para salvar'}
          </button>
          {saveMessage && (
            <p className="text-xs text-center mt-2 text-void-400">{saveMessage}</p>
          )}
          {cloudEnabled && activeDeckId && savedSlots[selectedSlot]?.id === activeDeckId && (
            <p className="text-[10px] text-center mt-1 text-green-400/80">Este deck será usado nas partidas</p>
          )}
        </div>
      </div>
    </div>
  );
}
