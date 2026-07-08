import { useEffect, useRef, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { BattleScreen } from './screens/BattleScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { DeckBuilderScreen } from './screens/DeckBuilderScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { AuthScreen } from './screens/AuthScreen';
import { useAuthStore } from './stores/authStore';
import { isSupabaseConfigured } from './lib/supabase';
import { initMultiplayerBridge } from './lib/initMultiplayerBridge';
import { BgmController } from './components/BgmController';
import { PortraitLockOverlay } from './components/PortraitLockOverlay';
import { useTranslation } from './i18n';
import { warmCardArtCache } from './utils/cardArtCache';

export type Screen = 'home' | 'battle' | 'collection' | 'deck-builder' | 'lobby';

export default function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>('home');
  const { status, bootstrap } = useAuthStore();
  const navigateRef = useRef(setScreen);
  navigateRef.current = setScreen;

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    return initMultiplayerBridge(() => navigateRef.current('battle'));
  }, []);

  const isBooting = isSupabaseConfigured && status === 'loading';
  const showAuth = isSupabaseConfigured && status === 'unauthenticated';

  useEffect(() => {
    if (isBooting || showAuth) return;
    void warmCardArtCache();
  }, [isBooting, showAuth]);

  const bgmScreen: Screen = showAuth || isBooting ? 'home' : screen;

  return (
    <>
      <PortraitLockOverlay />
      <BgmController screen={bgmScreen} enabled />

      {isBooting ? (
        <div className="h-screen w-screen flex items-center justify-center bg-void-950 text-void-400 text-sm">
          {t('common.loading')}
        </div>
      ) : showAuth ? (
        <div className="h-screen w-screen overflow-hidden bg-void-950">
          <AuthScreen />
        </div>
      ) : (
        <div className="h-dvh w-screen overflow-hidden bg-void-950 flex flex-col">
          {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
          {screen === 'battle' && <BattleScreen onNavigate={setScreen} />}
          {screen === 'collection' && <CollectionScreen onNavigate={setScreen} />}
          {screen === 'deck-builder' && <DeckBuilderScreen onNavigate={setScreen} />}
          {screen === 'lobby' && <LobbyScreen onNavigate={setScreen} />}
        </div>
      )}
    </>
  );
}
