import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type SVGProps } from 'react';
import type { Pathway } from 'game-engine';
import { useLocaleStore } from '../../i18n';
import { PATHWAY_PRESENTATION } from './presentation';
import './menu.css';

export function useMenuLanguage() {
  const locale = useLocaleStore((s) => s.locale);
  const pt = locale.startsWith('pt');
  return {
    pt,
    text: (portuguese: string, english: string) => pt ? portuguese : english,
    pathwayName: (id: Pathway) => PATHWAY_PRESENTATION[id].name[pt ? 'pt' : 'en'],
  };
}

export type IconName = 'collection' | 'decks' | 'home' | 'shop' | 'profile' | 'settings' | 'gem' | 'story' | 'pvp' | 'trail' | 'lock' | 'close';
const ICON_PATHS: Record<IconName, ReactNode> = {
  collection: <><rect x="7" y="3" width="12" height="17" rx="1" /><path d="M5 6H3v15h12v-1M13 7v9m-3-5 3-4 3 4m-6 2 3 3 3-3" /></>,
  decks: <><path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4" /></>,
  home: <><path d="M4 21V10l8-7 8 7v11H4Zm5 0v-7h6v7M12 3v5m-8 2h16" /></>,
  shop: <><path d="M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 4 5 4 5 0 0 4 8 4 8 0 0 4 5 4 5 0M9 21v-7h6v7" /></>,
  profile: <><circle cx="12" cy="7" r="4" /><path d="M3 22v-2a9 9 0 0 1 18 0v2" /></>,
  settings: <><path d="m10 2-.7 3-2 .9-2.7-1.2-2 3.5 2.2 2V13l-2.2 2 2 3.5 2.7-1.2 2 .9.7 3h4l.7-3 2-.9 2.7 1.2 2-3.5-2.2-2v-2.8l2.2-2-2-3.5-2.7 1.2-2-.9L14 2h-4Z" /><circle cx="12" cy="11.6" r="3" /></>,
  gem: <><path d="m12 2 7 8-7 12-7-12 7-8Zm0 0v20M5 10h14" /></>,
  story: <><path d="M12 5c-3-3-7-3-10-1v15c3-2 7-2 10 1 3-3 7-3 10-1V4c-3-2-7-2-10 1Zm0 0v15" /></>,
  pvp: <><path d="m3 2 7 5 10 13m-5 1 6-5M21 2l-7 5L4 20m5 1-6-5M3 2l1 7m17-7-1 7" /></>,
  trail: <><path d="m4 7 3-5 3 5H4Zm10 2 3-6 3 6h-6ZM7 12c14-4 16 3 6 5-8 2-8 3-5 5M2 12h8m5 0h7" /></>,
  lock: <><rect x="5" y="10" width="14" height="12" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3" /></>,
  close: <path d="m5 5 14 14M19 5 5 19" />,
};

export function MenuIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{ICON_PATHS[name]}</svg>;
}

export function GameButton({ variant = 'secondary', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  return <button type="button" className={`veil-button veil-button--${variant} ${className}`} {...props}>{children}</button>;
}

export function GamePanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`veil-panel ${className}`}>{children}</section>;
}

export function HeroArtwork({ pathway, priority = false, className = '' }: { pathway: Pathway; priority?: boolean; className?: string }) {
  const art = PATHWAY_PRESENTATION[pathway];
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [pathway]);
  return <div className={`veil-art ${className}`} aria-hidden="true">
    {!failed && <img key={pathway} src={art.artwork} alt="" width="1024" height="1536" style={{ objectPosition: art.focalPoint }} loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />}
  </div>;
}

export function PlayerHeader({ name, essence, pathway, onOpenProfile, onOpenOptions }: { name: string; essence: number; pathway: Pathway; onOpenProfile: () => void; onOpenOptions: () => void }) {
  const { pt, text } = useMenuLanguage();
  return <header className="veil-player-header" data-pathway={pathway}>
    <button type="button" className="veil-player" onClick={onOpenProfile} aria-label={text('Abrir perfil', 'Open profile')}>
      <span className="veil-avatar"><MenuIcon name="profile" /></span>
      <span className="veil-player-name">{name}</span>
    </button>
    <span className="veil-essence" aria-label={text('Essência', 'Essence')}>
      <MenuIcon name="gem" /><span>{new Intl.NumberFormat(pt ? 'pt-BR' : 'en-US').format(essence)}</span>
    </span>
    <button type="button" className="veil-icon-button" aria-label={text('Configurações', 'Settings')} onClick={onOpenOptions}><MenuIcon name="settings" /></button>
  </header>;
}

export function GameModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { text } = useMenuLanguage();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);
  return <dialog ref={ref} className="veil-ui veil-dialog" aria-labelledby="veil-dialog-title" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="veil-dialog-body">
      <div className="veil-dialog-heading"><h2 id="veil-dialog-title">{title}</h2><button type="button" className="veil-icon-button" onClick={onClose} aria-label={text('Fechar', 'Close')}><MenuIcon name="close" /></button></div>
      {children}
    </div>
  </dialog>;
}

export function PathwaySelector({ selected, unlocked, onSelect, onClose }: { selected: Pathway; unlocked: (id: Pathway) => boolean; onSelect: (id: Pathway) => void; onClose: () => void }) {
  const { text, pathwayName } = useMenuLanguage();
  return <GameModal title={text('Escolha seu caminho', 'Choose your pathway')} onClose={onClose}>
    <div className="veil-pathway-grid">
      {(Object.keys(PATHWAY_PRESENTATION) as Pathway[]).map((id) => <button type="button" key={id} className="veil-pathway-option" aria-pressed={selected === id} disabled={!unlocked(id)} onClick={() => { onSelect(id); onClose(); }}>
        <HeroArtwork pathway={id} />
        <span className="veil-pathway-option-name">{!unlocked(id) && <MenuIcon name="lock" />}{pathwayName(id)}</span>
      </button>)}
    </div>
    <p className="veil-muted">{text('Vença os capítulos da história para desbloquear novos caminhos.', 'Win story chapters to unlock new pathways.')}</p>
  </GameModal>;
}
