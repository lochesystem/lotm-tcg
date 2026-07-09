import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  createStarterDeck,
  PATHWAYS,
  type Deck,
  type Pathway,
} from 'game-engine';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { useCollectionStore } from '../stores/collectionStore';
import { useAuthStore } from '../stores/authStore';
import {
  clearMultiplayerSession,
  getMultiplayerServerUrl,
  joinRankedQueue,
  leaveRankedQueue,
  subscribeConnection,
  subscribeRankedMatchFound,
  waitForConnection,
} from '../lib/multiplayerSocket';
import { DeckSelectModal, type DeckChoice } from '../components/DeckSelectModal';
import { fetchRankedLeaderboard, type RankedLeaderboardEntry } from '../sync/player-sync';
import { getCurrentUserId } from '../lib/sessionContext';
import { formatPlayerHandle } from '../lib/playerDisplay';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTranslation } from '../i18n';

interface Props {
  onNavigate: (screen: Screen) => void;
}

type RankedPhase = 'menu' | 'searching';

function resolveDeckForPathway(pathway: Pathway, savedDeck: Deck | null): Deck {
  if (savedDeck && savedDeck.cards.length === 30) {
    return savedDeck;
  }
  return createStarterDeck(pathway);
}

export function RankedScreen({ onNavigate }: Props) {
  const { t } = useTranslation();
  const { selectedPathway, setPathway, deck: savedDeck } = useGameStore();
  const profile = useAuthStore((s) => s.profile);
  const rankedWins = useCollectionStore((s) => s.rankedWins);
  const rankedLosses = useCollectionStore((s) => s.rankedLosses);
  const isPathwayUnlocked = useCollectionStore((s) => s.isPathwayUnlocked);

  const [phase, setPhase] = useState<RankedPhase>('menu');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [queueSize, setQueueSize] = useState(0);
  const [showDeckSelect, setShowDeckSelect] = useState(false);
  const [pendingDeck, setPendingDeck] = useState<Deck | null>(null);
  const [leaderboard, setLeaderboard] = useState<RankedLeaderboardEntry[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);

  const chosenDeck = useMemo(
    () => (pendingDeck ? pendingDeck : resolveDeckForPathway(selectedPathway, savedDeck)),
    [selectedPathway, savedDeck, pendingDeck]
  );

  useEffect(() => subscribeConnection(setConnected), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingBoard(true);
      try {
        const rows = await fetchRankedLeaderboard(10);
        if (!cancelled) setLeaderboard(rows);
      } catch {
        if (!cancelled) setLeaderboard([]);
      } finally {
        if (!cancelled) setLoadingBoard(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [rankedWins]);

  useEffect(() => {
    return subscribeRankedMatchFound(() => {
      setPhase('menu');
      setBusy(false);
    });
  }, []);

  useEffect(() => {
    return () => {
      leaveRankedQueue();
    };
  }, []);

  const playerHandle = formatPlayerHandle(profile?.username);

  const handleFindMatch = () => {
    if (!isSupabaseConfigured || !getCurrentUserId()) {
      setError(t('ranked.loginRequired'));
      return;
    }
    setShowDeckSelect(true);
  };

  const handleDeckChosen = async (choice: DeckChoice) => {
    setShowDeckSelect(false);
    setPendingDeck(choice.deck);
    setError('');
    setBusy(true);
    setPhase('searching');

    try {
      await waitForConnection();
      const result = await joinRankedQueue(choice.deck, playerHandle, getCurrentUserId() ?? undefined);
      if (!result.success) {
        setPhase('menu');
        setError(result.error ?? t('ranked.queueError'));
        return;
      }
      setQueueSize(result.queueSize);
      if (!result.queued) {
        setPhase('menu');
      }
    } catch (e) {
      setPhase('menu');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelSearch = () => {
    leaveRankedQueue();
    setPhase('menu');
    setBusy(false);
  };

  const handleLeave = () => {
    leaveRankedQueue();
    clearMultiplayerSession();
    onNavigate('home');
  };

  return (
    <div className="flex-1 min-h-0 screen-scroll safe-bottom">
      <div className="relative flex flex-col items-center p-4 sm:p-6 py-6 pb-10 max-w-lg mx-auto w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/30 via-void-950 to-void-950 pointer-events-none" />

        <div className="relative z-10 w-full flex flex-col gap-5">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-red-300 to-amber-200">
              {t('ranked.title')}
            </h1>
            <p className="text-xs text-void-400 mt-1">{t('ranked.subtitle')}</p>
            <p className="text-[10px] text-void-500 mt-2">
              {connected ? t('ranked.connected') : t('ranked.connecting')}
              <span className="mx-2">·</span>
              {getMultiplayerServerUrl()}
            </p>
          </div>

          <div className="rounded-xl border border-void-700 bg-void-900/70 p-4">
            <p className="text-[10px] uppercase tracking-wider text-void-400 mb-2">{t('ranked.yourRecord')}</p>
            <p className="text-lg font-semibold text-amber-200">
              {t('ranked.record', { wins: rankedWins, losses: rankedLosses })}
            </p>
            <p className="text-xs text-void-500 mt-2">{t('ranked.rewardHint')}</p>
          </div>

          {phase === 'searching' ? (
            <motion.div
              className="rounded-xl border border-red-800/50 bg-red-950/20 p-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-red-200 mb-2">{t('ranked.searching')}</p>
              <p className="text-xs text-void-500 mb-4">
                {t('ranked.queueSize', { count: queueSize })}
              </p>
              <button
                type="button"
                onClick={handleCancelSearch}
                className="px-6 py-2 rounded-lg border border-void-600 text-sm text-void-300 hover:border-void-400"
              >
                {t('ranked.cancelSearch')}
              </button>
            </motion.div>
          ) : (
            <>
              <div className="rounded-xl border border-void-700 bg-void-900/50 p-4">
                <p className="text-[10px] uppercase tracking-wider text-void-400 mb-3">{t('ranked.choosePathway')}</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PATHWAYS) as Pathway[]).map((pathway) => {
                    const unlocked = isPathwayUnlocked(pathway);
                    const selected = selectedPathway === pathway;
                    return (
                      <button
                        key={pathway}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => setPathway(pathway)}
                        className={`px-3 py-2 rounded-lg text-xs border transition-all ${
                          selected
                            ? 'border-red-400 bg-red-900/40 text-red-100'
                            : unlocked
                              ? 'border-void-700 bg-void-900/60 text-void-300 hover:border-void-500'
                              : 'border-void-800 bg-void-950/40 text-void-600 cursor-not-allowed'
                        }`}
                      >
                        {PATHWAYS[pathway].name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-void-500 mt-3">
                  {t('ranked.deckLabel')}{' '}
                  <span className="text-void-300">
                    {chosenDeck.cards.length === 30
                      ? t('ranked.cardsCount', { count: chosenDeck.cards.length })
                      : t('ranked.starter')}
                  </span>
                </p>
              </div>

              {error && <p className="text-xs text-red-400 text-center">{error}</p>}

              <motion.button
                type="button"
                disabled={busy}
                onClick={handleFindMatch}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-red-700 to-amber-800 hover:from-red-600 hover:to-amber-700 rounded-xl font-bold text-lg disabled:opacity-50"
              >
                {t('ranked.findMatch')}
              </motion.button>
            </>
          )}

          <div className="rounded-xl border border-void-700 bg-void-900/50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-void-400 mb-3">{t('ranked.leaderboardTitle')}</p>
            {loadingBoard ? (
              <p className="text-xs text-void-500">{t('common.loading')}</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-xs text-void-500">{t('ranked.leaderboardEmpty')}</p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <li
                    key={entry.userId}
                    className="flex items-center justify-between text-sm border-b border-void-800/80 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-void-300">
                      <span className="text-amber-400 font-semibold mr-2">#{index + 1}</span>
                      {entry.displayName || entry.username}
                    </span>
                    <span className="text-xs text-void-400">
                      {t('ranked.leaderboardWins', { wins: entry.rankedWins })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <button
            type="button"
            onClick={handleLeave}
            className="text-xs text-void-500 hover:text-void-300 underline underline-offset-2"
          >
            {t('ranked.backToMenu')}
          </button>
        </div>
      </div>

      <DeckSelectModal
        show={showDeckSelect}
        title={t('ranked.deckSelectTitle')}
        starterPathway={selectedPathway}
        onClose={() => setShowDeckSelect(false)}
        onSelect={(choice) => void handleDeckChosen(choice)}
      />
    </div>
  );
}
