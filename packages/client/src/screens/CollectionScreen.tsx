import { useMemo, useState } from 'react';
import type { Screen } from '../App';
import { getAllCards, type Card } from 'game-engine';
import { useCollectionStore } from '../stores/collectionStore';
import { CollectionCardModal } from '../components/CollectionCardModal';
import { ArchiveCard, ArchiveHeader, PathwayFilterBar, type PathwayFilter } from '../components/menu/ArchivePrimitives';
import { useMenuLanguage } from '../components/menu/MenuPrimitives';
import { useLocalizedCardText } from '../hooks/useLocalizedCardText';

const CARDS = getAllCards();
export function CollectionScreen({ onNavigate: _onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { text } = useMenuLanguage();
  const { cardType } = useLocalizedCardText();
  // Subscribe to data as well as stable methods so cloud hydration updates the gallery.
  const ownedCards = useCollectionStore((s) => s.ownedCardIds);
  const ownsCard = useCollectionStore((s) => s.ownsCard);
  const getQuantity = useCollectionStore((s) => s.getQuantity);
  const [pathway, setPathway] = useState<PathwayFilter>('all');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [ownership, setOwnership] = useState('all');
  const [selected, setSelected] = useState<Card | null>(null);
  const filtered = useMemo(() => CARDS.filter((card) =>
    (pathway === 'all' || card.pathway === pathway) &&
    (type === 'all' || card.type === type) &&
    (ownership === 'all' || (ownership === 'owned' ? ownsCard(card.id) : !ownsCard(card.id))) &&
    card.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ), [pathway, type, ownership, query, ownsCard, ownedCards]);
  const count = CARDS.filter((card) => ownsCard(card.id)).length;
  return <main className="veil-ui archive-screen">
    <ArchiveHeader title={text('Coleção', 'Collection')} subtitle={text('Seu arquivo de poderes e mistérios.', 'Your archive of powers and mysteries.')}><span className="archive-counter"><strong>{count}</strong> / {CARDS.length}<small>{text('descobertas', 'discovered')}</small></span></ArchiveHeader>
    <div className="archive-toolbar"><label className="archive-search"><span className="sr-only">{text('Buscar carta', 'Search cards')}</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={text('Buscar pelo nome da carta', 'Search by card name')} /></label>
      <div className="archive-selects"><select value={type} onChange={(e) => setType(e.target.value)} aria-label={text('Tipo de carta', 'Card type')}><option value="all">{text('Todos os tipos', 'All types')}</option>{['beyonder', 'ritual', 'sealed-artifact', 'mystical-item'].map((id) => <option key={id} value={id}>{cardType(id)}</option>)}</select><select value={ownership} onChange={(e) => setOwnership(e.target.value)} aria-label={text('Disponibilidade', 'Ownership')}><option value="all">{text('Todas as cartas', 'All cards')}</option><option value="owned">{text('Obtidas', 'Owned')}</option><option value="missing">{text('Não obtidas', 'Missing')}</option></select></div>
    </div>
    <PathwayFilterBar value={pathway} onChange={setPathway} />
    <div className="archive-results" aria-live="polite">{filtered.length} {text('cartas', 'cards')}</div>
    <div className="archive-gallery"><div className="archive-grid">{filtered.map((card) => <ArchiveCard key={card.id} card={card} owned={ownsCard(card.id)} quantity={getQuantity(card.id)} onClick={() => setSelected(card)} />)}</div>{filtered.length === 0 && <p className="archive-empty">{text('Nenhuma carta encontrada. Experimente outros filtros.', 'No cards found. Try different filters.')}</p>}</div>
    {selected && <CollectionCardModal card={selected} owned={ownsCard(selected.id)} quantity={getQuantity(selected.id)} onClose={() => setSelected(null)} />}
  </main>;
}
