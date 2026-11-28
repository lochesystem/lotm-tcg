import { useEffect, useState } from 'react';
import type { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { useCollectionStore } from '../stores/collectionStore';
import { useAuthStore } from '../stores/authStore';
import { getCurrentStoryBoss, getSelectableStoryBosses, type Pathway } from 'game-engine';
import { HowToPlay } from '../components/HowToPlay';
import { DeckSelectModal, type DeckChoice } from '../components/DeckSelectModal';
import { GameButton, HeroArtwork, PathwaySelector, PlayerHeader, useMenuLanguage } from '../components/menu/MenuPrimitives';
import { ModeTabs, OpponentPanel, PvpPanel, TrailPanel, type MenuMode, type PvpMode } from '../components/menu/ModePanel';

interface Props {
  onNavigate: (screen: Screen) => void;
  onOpenProfile?: () => void;
  onOpenOptions?: () => void;
}

export function HomeScreen({ onNavigate, onOpenProfile, onOpenOptions }: Props) {
  const { text, pathwayName } = useMenuLanguage();
  const selectedPathway = useGameStore((s) => s.selectedPathway);
  const setPathway = useGameStore((s) => s.setPathway);
  const startStoryBattle = useGameStore((s) => s.startStoryBattle);
  const progress = useCollectionStore((s) => s.storyProgress);
  const essence = useCollectionStore((s) => s.essenceBalance);
  const unlocked = useCollectionStore((s) => s.isPathwayUnlocked);
  const profile = useAuthStore((s) => s.profile);
  const [mode, setMode] = useState<MenuMode>('story');
  const [pvpMode, setPvpMode] = useState<PvpMode>('ranked');
  const [showPathways, setShowPathways] = useState(false);
  const [showDecks, setShowDecks] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [boss, setBoss] = useState<Pathway>(() => getCurrentStoryBoss(progress) ?? 'red-priest');
  const selectable = getSelectableStoryBosses(progress);

  useEffect(() => {
    const choices = getSelectableStoryBosses(progress);
    setBoss(getCurrentStoryBoss(progress) ?? choices[choices.length - 1] ?? 'red-priest');
  }, [progress]);

  useEffect(() => {
    if (!unlocked(selectedPathway)) setPathway('fool');
  }, [selectedPathway, unlocked, setPathway]);

  const play = () => {
    if (mode === 'story') setShowDecks(true);
    else if (mode === 'pvp') onNavigate(pvpMode === 'ranked' ? 'ranked' : 'lobby');
    else onNavigate('roguelike');
  };
  const chooseDeck = (choice: DeckChoice) => {
    setShowDecks(false);
    startStoryBattle(boss, choice.deck);
    onNavigate('battle');
  };
  const playLabel = mode === 'story' ? text('Jogar', 'Play') : mode === 'trail' ? text('Entrar na trilha', 'Enter the trail') : pvpMode === 'ranked' ? text('Jogar ranqueado', 'Play ranked') : text('Jogar com amigos', 'Play with friends');

  return <main className="veil-ui veil-home">
    <div className="veil-home-inner">
      <PlayerHeader name={profile?.display_name || profile?.username || text('Beyonder', 'Beyonder')} essence={essence} pathway={selectedPathway} onOpenProfile={onOpenProfile ?? (() => {})} onOpenOptions={onOpenOptions ?? (() => {})} />
      <h1 className="veil-wordmark"><span>Beyond the Veil</span></h1>
      <section className="veil-hero" aria-label={pathwayName(selectedPathway)}>
        <HeroArtwork key={selectedPathway} pathway={selectedPathway} priority />
        <div className="veil-pathway-summary">
          <div><p className="veil-eyebrow">{text('Caminho selecionado', 'Selected pathway')}</p><h2>{pathwayName(selectedPathway)}</h2></div>
          <GameButton onClick={() => setShowPathways(true)}>{text('Trocar caminho', 'Change pathway')}</GameButton>
        </div>
      </section>
      <div className="veil-play-area">
        <ModeTabs value={mode} onChange={setMode} />
        {mode === 'story' && <OpponentPanel boss={boss} selectable={selectable} progress={progress} onSelect={setBoss} />}
        {mode === 'pvp' && <PvpPanel value={pvpMode} onChange={setPvpMode} />}
        {mode === 'trail' && <TrailPanel />}
        <GameButton variant="primary" onClick={play}>{playLabel}</GameButton>
        <GameButton variant="quiet" onClick={() => setShowHelp(true)}>{text('Como jogar', 'How to play')}</GameButton>
      </div>
    </div>
    {showPathways && <PathwaySelector selected={selectedPathway} unlocked={unlocked} onSelect={setPathway} onClose={() => setShowPathways(false)} />}
    <HowToPlay show={showHelp} onClose={() => setShowHelp(false)} />
    <DeckSelectModal show={showDecks} starterPathway={selectedPathway} title={text('Escolha seu baralho', 'Choose your deck')} onSelect={chooseDeck} onClose={() => setShowDecks(false)} />
  </main>;
}
