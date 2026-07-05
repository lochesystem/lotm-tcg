import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  createStarterDeck,
  PATHWAYS,
  PathwayDefinition,
  type Deck,
  type Pathway,
} from 'game-engine';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import { useCollectionStore } from '../stores/collectionStore';
import {
  clearMultiplayerSession,
  createMultiplayerRoom,
  getMultiplayerServerUrl,
  getOnlineRole,
  joinMultiplayerRoom,
  submitMultiplayerDeck,
  subscribeConnection,
  subscribeRoomUpdate,
  waitForConnection,
  type RoomUpdatePayload,
} from '../lib/multiplayerSocket';

interface Props {
  onNavigate: (screen: Screen) => void;
}

type LobbyPhase = 'menu' | 'room';

const PATHWAY_ICONS: Record<string, string> = {
  fool: '🎭',
  'red-priest': '🔥',
  tyrant: '⚡',
  sun: '☀️',
  door: '🚪',
  demoness: '🌙',
};

function resolveDeckForPathway(pathway: Pathway, savedDeck: Deck | null): Deck {
  if (savedDeck && savedDeck.pathway === pathway && savedDeck.cards.length === 30) {
    return savedDeck;
  }
  return createStarterDeck(pathway);
}

export function LobbyScreen({ onNavigate }: Props) {
  const { selectedPathway, setPathway, deck: savedDeck } = useGameStore();
  const isPathwayUnlocked = useCollectionStore((s) => s.isPathwayUnlocked);

  const [phase, setPhase] = useState<LobbyPhase>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [deckSubmitted, setDeckSubmitted] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);

  const isHost = getOnlineRole() === 'host';

  const chosenDeck = useMemo(
    () => resolveDeckForPathway(selectedPathway, savedDeck),
    [selectedPathway, savedDeck],
  );
  const usingSavedDeck =
    !!savedDeck && savedDeck.pathway === selectedPathway && savedDeck.cards.length === 30;

  useEffect(() => subscribeConnection(setConnected), []);

  useEffect(() => {
    return subscribeRoomUpdate((data: RoomUpdatePayload) => {
      if (data.players === 2) {
        setOpponentJoined(true);
        if (!deckSubmitted) {
          setStatus('Oponente na sala! Escolha seu deck e confirme.');
        }
      }

      if (data.hostReady !== undefined || data.guestReady !== undefined) {
        const role = getOnlineRole();
        const otherReady =
          role === 'host' ? !!data.guestReady : !!data.hostReady;
        setOpponentReady(otherReady);

        if (deckSubmitted && otherReady) {
          setStatus('Ambos prontos! Iniciando batalha...');
        } else if (deckSubmitted) {
          setStatus('Aguardando oponente confirmar deck...');
        }
      }
    });
  }, [deckSubmitted]);

  const resetRoomState = () => {
    clearMultiplayerSession();
    setPhase('menu');
    setActiveRoomCode(null);
    setOpponentJoined(false);
    setDeckSubmitted(false);
    setOpponentReady(false);
    setStatus('');
    setError('');
  };

  const handleCreate = async () => {
    setError('');
    setBusy(true);
    try {
      setStatus('Conectando ao servidor...');
      await waitForConnection();
      setStatus('Criando sala...');
      const code = await createMultiplayerRoom();
      setActiveRoomCode(code);
      setPhase('room');
      setStatus('Compartilhe o código e escolha seu deck.');
    } catch (e) {
      setError((e as Error).message || 'Falha ao criar sala');
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (roomCode.length !== 4) return;
    setError('');
    setBusy(true);
    try {
      setStatus('Conectando ao servidor...');
      await waitForConnection();
      setStatus('Entrando na sala...');
      const ok = await joinMultiplayerRoom(roomCode);
      if (!ok) {
        setError('Sala não encontrada ou já cheia');
        setStatus('');
        return;
      }
      setActiveRoomCode(roomCode.toUpperCase());
      setOpponentJoined(true);
      setPhase('room');
      setStatus('Escolha seu deck e confirme para jogar.');
    } catch (e) {
      setError((e as Error).message || 'Falha ao entrar na sala');
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDeck = () => {
    setError('');
    setPathway(selectedPathway);
    submitMultiplayerDeck(chosenDeck);
    setDeckSubmitted(true);
    if (!opponentJoined) {
      setStatus('Deck confirmado. Aguardando oponente entrar na sala...');
    } else {
      setStatus('Aguardando oponente confirmar deck...');
    }
  };

  const handleCancel = () => {
    resetRoomState();
  };

  if (phase === 'room') {
    return (
      <div className="flex-1 min-h-0 screen-scroll safe-bottom flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-4 p-4 sm:p-6 max-w-lg w-full mx-auto pb-10">
          <div className="text-center w-full">
            <h2 className="text-xl font-bold mb-1">Sala {activeRoomCode}</h2>
            {isHost && !opponentJoined && (
              <>
                <p className="text-[10px] text-void-500 uppercase tracking-wider mb-2">
                  Compartilhe com seu amigo
                </p>
                <div className="text-4xl sm:text-5xl font-mono font-bold text-purple-300 tracking-widest">
                  {activeRoomCode}
                </div>
                <p className="text-xs text-amber-400/90 mt-2 animate-pulse">
                  Aguardando oponente entrar...
                </p>
              </>
            )}
            {opponentJoined && (
              <p className="text-xs text-green-400/90 mt-1">● Oponente conectado</p>
            )}
          </div>

          <div className="w-full">
            <p className="text-[10px] text-void-400 uppercase tracking-widest mb-2 text-center font-medium">
              Escolha seu Pathway
            </p>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(PATHWAYS).map((pw: PathwayDefinition) => {
                const unlocked = isPathwayUnlocked(pw.id as Pathway);
                const selected = selectedPathway === pw.id;

                return (
                  <button
                    key={pw.id}
                    type="button"
                    onClick={() => unlocked && !deckSubmitted && setPathway(pw.id as Pathway)}
                    disabled={!unlocked || deckSubmitted}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                      !unlocked
                        ? 'border-void-800 bg-void-950/80 text-void-600 cursor-not-allowed'
                        : selected
                          ? 'border-purple-400/60 bg-purple-900/30 text-purple-100 shadow-lg shadow-purple-900/20'
                          : 'border-void-700 bg-void-900/50 text-void-300 hover:border-void-500 hover:bg-void-800/50'
                    } ${deckSubmitted ? 'opacity-70' : ''}`}
                  >
                    {!unlocked && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/65 backdrop-blur-[1px]">
                        <span className="text-base opacity-80">🔒</span>
                      </div>
                    )}
                    <div className={`relative flex items-center gap-1.5 ${!unlocked ? 'opacity-40' : ''}`}>
                      <span className="text-base">{PATHWAY_ICONS[pw.id]}</span>
                      <div>
                        <div className="font-bold text-xs">{pw.name}</div>
                        <div className="text-[9px] text-void-400">{pw.identity}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full bg-void-800/40 border border-void-700 rounded-xl p-3">
            <p className="text-xs text-void-300">
              <span className="text-purple-300 font-semibold">Deck:</span>{' '}
              {usingSavedDeck ? 'Seu deck salvo (30 cartas)' : 'Deck starter (30 cartas)'}
            </p>
            <p className="text-[10px] text-void-500 mt-1">
              Pathway Power: {PATHWAYS[selectedPathway].powerName}
            </p>
          </div>

          {deckSubmitted ? (
            <div className="w-full text-center space-y-2">
              <p className="text-sm text-purple-200">✓ Deck confirmado</p>
              <p className="text-xs text-void-400">
                {opponentReady
                  ? 'Iniciando partida...'
                  : 'Aguardando oponente confirmar deck...'}
              </p>
            </div>
          ) : (
            <motion.button
              type="button"
              onClick={handleConfirmDeck}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 rounded-xl font-bold text-lg transition-all"
            >
              Confirmar e jogar
            </motion.button>
          )}

          {status && <p className="text-xs text-purple-300/90 text-center">{status}</p>}
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-void-500 hover:text-void-300 transition-all"
          >
            Sair da sala
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 screen-scroll safe-bottom flex flex-col items-center p-4 sm:p-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm min-w-0 px-1">
        <h2 className="text-2xl font-bold">Multiplayer</h2>

        <p className="text-[10px] text-void-500 text-center">
          {connected ? (
            <span className="text-green-400/90">● Conectado</span>
          ) : (
            <span className="text-amber-400/90">○ Conectando...</span>
          )}
          <span className="text-void-600 mx-1">·</span>
          <span className="break-all">{getMultiplayerServerUrl()}</span>
        </p>

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={busy}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 disabled:opacity-60 rounded-xl font-bold text-lg transition-all"
        >
          {busy ? 'Aguarde...' : 'Criar sala'}
        </button>

        <div className="text-void-500 text-sm">ou</div>

        <div className="w-full min-w-0 flex flex-col gap-2">
          <input
            type="text"
            maxLength={4}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && roomCode.length === 4 && !busy) void handleJoin();
            }}
            placeholder="CÓDIGO"
            disabled={busy}
            className="w-full min-w-0 box-border px-4 py-3 bg-void-800 border border-void-600 rounded-xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-purple-500 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={roomCode.length !== 4 || busy}
            className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:bg-void-700 disabled:text-void-500 rounded-xl font-bold transition-all"
          >
            Entrar
          </button>
        </div>

        {status && <p className="text-xs text-purple-300/90 text-center">{status}</p>}
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-sm text-void-500 hover:text-void-300 transition-all"
        >
          Voltar ao menu
        </button>
      </div>
    </div>
  );
}
