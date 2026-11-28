import type { Pathway } from 'game-engine';
import { getStoryWinUnlock, STORY_BOSS_ORDER } from 'game-engine';
import { GamePanel, HeroArtwork, MenuIcon, useMenuLanguage } from './MenuPrimitives';

export type MenuMode = 'story' | 'pvp' | 'trail';
export type PvpMode = 'ranked' | 'friends';

export function ModeTabs({ value, onChange }: { value: MenuMode; onChange: (mode: MenuMode) => void }) {
  const { text } = useMenuLanguage();
  const tabs = [
    { id: 'story' as const, label: text('História', 'Story'), icon: 'story' as const },
    { id: 'pvp' as const, label: 'PvP', icon: 'pvp' as const },
    { id: 'trail' as const, label: text('Trilha', 'Trail'), icon: 'trail' as const },
  ];
  return <div className="veil-mode-tabs" role="group" aria-label={text('Modo de jogo', 'Game mode')}>
    {tabs.map((tab) => <button type="button" key={tab.id} aria-pressed={value === tab.id} onClick={() => onChange(tab.id)}><MenuIcon name={tab.icon} />{tab.label}</button>)}
  </div>;
}

export function OpponentPanel({ boss, selectable, progress, onSelect }: { boss: Pathway; selectable: Pathway[]; progress: number; onSelect: (id: Pathway) => void }) {
  const { text, pathwayName } = useMenuLanguage();
  const bossIndex = STORY_BOSS_ORDER.indexOf(boss);
  const replay = bossIndex < progress;
  const unlock = !replay ? getStoryWinUnlock(progress) : null;
  return <GamePanel className="veil-opponent-panel">
    <div className="veil-opponent-content">
      <span className="veil-eyebrow">{text('Modo história', 'Story mode')} · {String(Math.max(1, bossIndex + 1)).padStart(2, '0')}</span>
      <h2>{pathwayName(boss)}</h2>
      <p>{replay ? text('Revisite este confronto com um novo baralho.', 'Revisit this encounter with a new deck.') : text('Escolha seu baralho e enfrente o próximo desafio.', 'Choose your deck and face the next challenge.')}</p>
      {unlock && <p className="veil-opponent-reward">{text('Desbloqueia', 'Unlocks')}: {pathwayName(unlock)}</p>}
    </div>
    <HeroArtwork key={boss} pathway={boss} className="veil-opponent-art" />
    <div className="veil-story-footer">
      <span>{text('Capítulos concluídos', 'Chapters completed')} <strong>{Math.min(progress, STORY_BOSS_ORDER.length)}/{STORY_BOSS_ORDER.length}</strong></span>
      <progress value={Math.min(progress, STORY_BOSS_ORDER.length)} max={STORY_BOSS_ORDER.length} aria-label={text('Progresso da história', 'Story progress')} />
    </div>
    {selectable.length > 1 && <div className="veil-boss-picker">
      <label htmlFor="veil-boss-select">{text('Adversário', 'Opponent')}</label>
      <select id="veil-boss-select" value={boss} onChange={(e) => onSelect(e.target.value as Pathway)}>
        {selectable.map((id) => <option key={id} value={id}>{pathwayName(id)}{STORY_BOSS_ORDER.indexOf(id) < progress ? text(' · Repetir', ' · Replay') : ''}</option>)}
      </select>
    </div>}
  </GamePanel>;
}

export function PvpPanel({ value, onChange }: { value: PvpMode; onChange: (mode: PvpMode) => void }) {
  const { text } = useMenuLanguage();
  return <GamePanel className="veil-mode-content">
    <span className="veil-eyebrow">{text('Duelo entre jogadores', 'Player duels')}</span>
    <h2>{text('Escolha seu confronto', 'Choose your encounter')}</h2>
    <div className="veil-pvp-options" role="group" aria-label={text('Tipo de duelo', 'Duel type')}>
      <button type="button" aria-pressed={value === 'ranked'} onClick={() => onChange('ranked')}><MenuIcon name="pvp" /><strong>{text('Ranqueado', 'Ranked')}</strong><span>{text('Encontre um adversário.', 'Find an opponent.')}</span></button>
      <button type="button" aria-pressed={value === 'friends'} onClick={() => onChange('friends')}><MenuIcon name="profile" /><strong>{text('Com amigos', 'With friends')}</strong><span>{text('Crie ou entre em uma sala.', 'Create or join a room.')}</span></button>
    </div>
  </GamePanel>;
}

export function TrailPanel() {
  const { text } = useMenuLanguage();
  return <GamePanel className="veil-mode-content veil-trail-panel">
    <MenuIcon name="trail" />
    <span className="veil-eyebrow">{text('Trilha Beyonder', 'Beyonder Trail')}</span>
    <h2>{text('Cada escolha muda o destino', 'Every choice changes fate')}</h2>
    <p>{text('Explore rotas, enfrente inimigos e fortaleça seu baralho durante a jornada.', 'Explore branching paths, face enemies and strengthen your deck along the way.')}</p>
  </GamePanel>;
}
