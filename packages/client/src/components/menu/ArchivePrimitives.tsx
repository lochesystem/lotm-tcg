import type { ReactNode } from 'react';
import type { Card, Pathway } from 'game-engine';
import { MiniCard, LockedMiniCard } from '../MiniCard';
import { useLocalizedCardText } from '../../hooks/useLocalizedCardText';
import { useMenuLanguage } from './MenuPrimitives';
import './screens.css';

export function ArchiveHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return <header className="archive-header"><div><p className="veil-eyebrow">Beyond the Veil</p><h1>{title}</h1><p className="archive-subtitle">{subtitle}</p></div>{children}</header>;
}
export type PathwayFilter = Pathway | 'neutral' | 'all';
export function PathwayFilterBar({ value, onChange }: { value: PathwayFilter; onChange: (value: PathwayFilter) => void }) {
  const { text, pathwayName } = useMenuLanguage();
  return <div className="archive-chips" role="group" aria-label={text('Filtrar por caminho', 'Filter by pathway')}>
    {(['all', 'neutral', 'fool', 'red-priest', 'tyrant', 'sun', 'door', 'demoness'] as const).map((id) => <button type="button" key={id} aria-pressed={value === id} onClick={() => onChange(id)}>{id === 'all' ? text('Todos', 'All') : id === 'neutral' ? text('Neutras', 'Neutral') : pathwayName(id)}</button>)}
  </div>;
}
export function ArchiveCard({ card, owned = true, quantity, disabled = false, onClick, action }: { card: Card; owned?: boolean; quantity?: number; disabled?: boolean; onClick: () => void; action?: string }) {
  const { rarity } = useLocalizedCardText();
  return <button type="button" className="archive-card" disabled={disabled} onClick={onClick} aria-label={action ? `${action}: ${card.name}` : card.name}>
    <span className="archive-card-art">{owned ? <MiniCard card={card} /> : <LockedMiniCard card={card} />}{quantity !== undefined && quantity > 0 && <span className="archive-quantity">×{quantity}</span>}</span>
    <span className="archive-card-name">{card.name}</span><span className={`archive-rarity archive-rarity--${card.rarity}`}>{rarity(card.rarity)}</span>
  </button>;
}
