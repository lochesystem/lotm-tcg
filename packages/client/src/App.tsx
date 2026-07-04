import { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { BattleScreen } from './screens/BattleScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { DeckBuilderScreen } from './screens/DeckBuilderScreen';
import { LobbyScreen } from './screens/LobbyScreen';

export type Screen = 'home' | 'battle' | 'collection' | 'deck-builder' | 'lobby';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div className="h-screen w-screen overflow-hidden bg-void-950">
      {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
      {screen === 'battle' && <BattleScreen onNavigate={setScreen} />}
      {screen === 'collection' && <CollectionScreen onNavigate={setScreen} />}
      {screen === 'deck-builder' && <DeckBuilderScreen onNavigate={setScreen} />}
      {screen === 'lobby' && <LobbyScreen onNavigate={setScreen} />}
    </div>
  );
}
