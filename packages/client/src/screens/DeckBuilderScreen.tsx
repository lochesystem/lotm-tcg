import { useCallback, useEffect, useState } from 'react';
import { ArchiveCard, ArchiveHeader, PathwayFilterBar, type PathwayFilter } from '../components/menu/ArchivePrimitives';
import { GameButton, useMenuLanguage } from '../components/menu/MenuPrimitives';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { useCollectionStore } from '../stores/collectionStore';
import { getCardById, Card, Pathway, getAllCards, validateDeck, PATHWAYS } from 'game-engine';
import { getCurrentUserId } from '../lib/sessionContext';
import {
  activateDeck,
  DECK_SLOT_COUNT,
  ensureDeckSlots,
  saveDeckToSlot,
} from '../sync/player-sync';
import { isSupabaseConfigured, type DbDeck } from '../lib/supabase';
import { useTranslation } from '../i18n';

interface Props {
  onNavigate: (screen: Screen) => void;
}

function cardMatchesSearch(card: Card, query: string) {
  return card.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

function cardsFromIds(ids: string[]): Card[] {
  return ids.map((id) => getCardById(id)).filter((c): c is Card => !!c);
}

export function DeckBuilderScreen({ onNavigate }: Props) {
  const { t } = useTranslation();
  const { text, pathwayName } = useMenuLanguage();
  const [query, setQuery] = useState('');
  const [showDeck, setShowDeck] = useState(false);
  const ownedCards = useCollectionStore((s) => s.ownedCardIds);
  const { activeDeckId, setActiveDeckFromCloud } = useGameStore();
  const ownsCard = useCollectionStore((s) => s.ownsCard);
  const getQuantity = useCollectionStore((s) => s.getQuantity);
  const isPathwayUnlocked = useCollectionStore((s) => s.isPathwayUnlocked);
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [deckName, setDeckName] = useState(() => t('deck.defaultName'));
  const [deckHeroPathway, setDeckHeroPathway] = useState<Pathway>('fool');
  const [collectionPathwayFilter, setCollectionPathwayFilter] = useState<PathwayFilter>('all');
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
        setDeckHeroPathway(deck.pathway as Pathway);
        setDeckName(deck.name);
        setDeckCards(cardsFromIds(deck.cards));
        if (deck.cards.length === 30) {
          setActiveDeckFromCloud(deck.cards, deck.pathway as Pathway, deck.id);
        }
      } else {
        setDeckName(t('deck.defaultSlotName', { n: slot + 1 }));
        setDeckCards([]);
      }
    },
    [setActiveDeckFromCloud, t],
  );

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId || !isSupabaseConfigured) return;

    setLoadingSlots(true);
    void (async () => {
      try {
        const slots = await ensureDeckSlots(userId, deckHeroPathway);
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

  // Reading the inventory above keeps available copies current after cloud hydration.
  void ownedCards;
  const available = getAllCards().filter((c) => {
    if (!cardMatchesSearch(c, query)) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (collectionPathwayFilter !== 'all' && c.pathway !== collectionPathwayFilter) return false;
    if (isSupabaseConfigured && getCurrentUserId()) {
      return ownsCard(c.id);
    }
    return c.pathway === deckHeroPathway || c.pathway === 'neutral';
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
      setSaveMessage(t('deck.loginRequiredCloud'));
      return;
    }

    const cardIds = deckCards.map((c) => c.id);
    const validation = validateDeck({ pathway: deckHeroPathway, cards: cardIds });
    if (!validation.valid) {
      setSaveMessage(validation.errors[0] ?? t('deck.invalidDeck'));
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      const saved = await saveDeckToSlot(userId, selectedSlot, {
        id: savedSlots[selectedSlot]?.id,
        name: deckName.trim() || t('deck.defaultSlotName', { n: selectedSlot + 1 }),
        pathway: deckHeroPathway,
        cards: cardIds,
        isActive: true,
      });
      const nextSlots = savedSlots.map((d, i) => {
        if (i === selectedSlot) return saved;
        return d ? { ...d, is_active: false } : null;
      });
      setSavedSlots(nextSlots);
      setActiveDeckFromCloud(saved.cards, saved.pathway as Pathway, saved.id);
      setSaveMessage(t('deck.deckSaved'));
    } catch (e) {
      setSaveMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cloudEnabled = isSupabaseConfigured && !!getCurrentUserId();

  return <main className="veil-ui archive-screen deck-screen">
    <ArchiveHeader title={text('Baralhos', 'Decks')} subtitle={text('Prepare sua próxima estratégia.', 'Prepare your next strategy.')}><span className="archive-counter"><strong>{deckCards.length}</strong> / 30<small>{text('cartas', 'cards')}</small></span></ArchiveHeader>
    {cloudEnabled && <div className="deck-slots" role="group" aria-label={t('deck.cloudDecks')}>
      {Array.from({ length: DECK_SLOT_COUNT }, (_, slot) => <button type="button" key={slot} disabled={loadingSlots || saving} aria-pressed={selectedSlot === slot} onClick={() => void selectSlot(slot)}><span>{t('deck.slot', { n: slot + 1 })}{savedSlots[slot]?.is_active && <small>{t('deck.inUse')}</small>}</span><strong>{savedSlots[slot]?.name ?? t('deck.empty')}</strong><span>{savedSlots[slot]?.cards.length ?? 0}/30</span></button>)}
    </div>}
    <div className="deck-identity">
      <label><span>{text('Nome do baralho', 'Deck name')}</span><input value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder={t('deck.namePlaceholder')} /></label>
      <label><span>{t('deck.deckPower')}</span><select value={deckHeroPathway} onChange={(e) => setDeckHeroPathway(e.target.value as Pathway)}>{Object.values(PATHWAYS).filter((pw) => isPathwayUnlocked(pw.id as Pathway)).map((pw) => <option key={pw.id} value={pw.id}>{pathwayName(pw.id as Pathway)}</option>)}</select></label>
    </div>
    <div className="archive-toolbar"><label className="archive-search"><span className="sr-only">{text('Buscar carta', 'Search cards')}</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={text('Buscar carta para adicionar', 'Search for a card to add')} /></label><select value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)} aria-label={text('Tipo de carta', 'Card type')}>{(['all', 'beyonder', 'ritual', 'sealed-artifact', 'mystical-item'] as const).map((id) => <option key={id} value={id}>{id === 'all' ? t('deck.filterAll') : t(`cardTypes.${id}`)}</option>)}</select></div>
    <PathwayFilterBar value={collectionPathwayFilter} onChange={setCollectionPathwayFilter} />
    <div className="deck-workspace">
      <div className="archive-gallery"><div className="archive-grid">{available.map((card) => {
        const count = deckCards.filter((c) => c.id === card.id).length;
        const max = card.rarity === 'legendary' ? 1 : 2;
        const canAdd = deckCards.length < 30 && count < max && (!cloudEnabled || count < getQuantity(card.id));
        return <ArchiveCard key={card.id} card={card} quantity={count} disabled={!canAdd} action={text('Adicionar', 'Add')} onClick={() => addCard(card)} />;
      })}</div>{available.length === 0 && <p className="archive-empty">{text('Nenhuma carta disponível com estes filtros.', 'No available cards match these filters.')}</p>}</div>
      <aside className={`deck-list ${showDeck ? 'deck-list--open' : ''}`} aria-label={t('deck.yourDeck')}>
        <button type="button" className="deck-list-toggle" aria-expanded={showDeck} aria-controls="deck-card-list" onClick={() => setShowDeck(!showDeck)}><span>{t('deck.yourDeck')} · {deckCards.length}/30</span><span>{showDeck ? text('Recolher', 'Collapse') : text('Ver cartas', 'View cards')}</span></button>
        <div className="deck-card-list" id="deck-card-list">{deckCards.length === 0 ? <p className="archive-empty">{t('deck.tapCards')}</p> : deckCards.map((card, i) => <button type="button" key={`${card.id}-${i}`} onClick={() => removeCard(i)} aria-label={`${text('Remover', 'Remove')}: ${card.name}`}><span className="deck-card-cost">{card.cost}</span><span>{card.name}</span><span aria-hidden="true">−</span></button>)}</div>
      </aside>
    </div>
    <footer className="deck-save-bar"><GameButton variant="primary" onClick={() => void handleSave()} disabled={saving || deckCards.length !== 30 || !cloudEnabled}>{saving ? t('deck.saving') : cloudEnabled ? t('deck.saveCloud') : t('deck.loginRequiredSave')}</GameButton>{saveMessage && <p role="status">{saveMessage}</p>}{cloudEnabled && activeDeckId && savedSlots[selectedSlot]?.id === activeDeckId && <p>{t('deck.deckActive')}</p>}</footer>
  </main>;
}
