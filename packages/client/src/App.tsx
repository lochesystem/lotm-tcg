import { useEffect, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { BattleScreen } from './screens/BattleScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { DeckBuilderScreen } from './screens/DeckBuilderScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { AuthScreen } from './screens/AuthScreen';
import { useAuthStore } from './stores/authStore';
import { isSupabaseConfigured } from './lib/supabase';

export type Screen = 'home' | 'battle' | 'collection' | 'deck-builder' | 'lobby';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const { status, bootstrap } = useAuthStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (isSupabaseConfigured && status === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-void-950 text-void-400 text-sm">
        Carregando...
      </div>
    );
  }

  if (isSupabaseConfigured && status === 'unauthenticated') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-void-950">
        <AuthScreen />
      </div>
    );
  }

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
