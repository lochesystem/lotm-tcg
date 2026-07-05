import { useEffect, useState } from 'react';
import { createStarterDeck } from 'game-engine';
import { Screen } from '../App';
import { useGameStore } from '../stores/gameStore';
import {
  clearMultiplayerSession,
  createMultiplayerRoom,
  getMultiplayerServerUrl,
  joinMultiplayerRoom,
  submitMultiplayerDeck,
  subscribeConnection,
  subscribeRoomUpdate,
  waitForConnection,
} from '../lib/multiplayerSocket';

interface Props {
  onNavigate: (screen: Screen) => void;
}

function resolvePlayerDeck() {
  const { deck, selectedPathway } = useGameStore.getState();
  if (deck && deck.cards.length === 30 && deck.pathway === selectedPathway) {
    return deck;
  }
  return createStarterDeck(selectedPathway);
}

export function LobbyScreen({ onNavigate }: Props) {
  const [roomCode, setRoomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => subscribeConnection(setConnected), []);

  useEffect(() => {
    return subscribeRoomUpdate((data) => {
      if (data.players === 2) {
        setStatus('Oponente entrou! Preparando partida...');
      } else if (data.status === 'waiting-deck') {
        setStatus('Aguardando decks...');
      }
    });
  }, []);

  const handleCreate = async () => {
    setError('');
    setBusy(true);
    try {
      setStatus('Conectando ao servidor...');
      await waitForConnection();
      setStatus('Criando sala...');
      const code = await createMultiplayerRoom();
      setGeneratedCode(code);
      setCreating(true);
      setStatus('Aguardando oponente...');
      submitMultiplayerDeck(resolvePlayerDeck());
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
      setStatus('Preparando partida...');
      submitMultiplayerDeck(resolvePlayerDeck());
    } catch (e) {
      setError((e as Error).message || 'Falha ao entrar na sala');
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    clearMultiplayerSession();
    setCreating(false);
    setGeneratedCode(null);
    setStatus('');
    setError('');
  };

  return (
    <div className="flex-1 min-h-0 screen-scroll safe-bottom flex flex-col items-center p-4 sm:p-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950" />

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

        {!creating ? (
          <>
            <button
              onClick={handleCreate}
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
                onClick={() => void handleJoin()}
                disabled={roomCode.length !== 4 || busy}
                className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:bg-void-700 disabled:text-void-500 rounded-xl font-bold transition-all"
              >
                Entrar
              </button>
            </div>
          </>
        ) : (
          <div className="text-center w-full">
            <p className="text-void-400 mb-4">Compartilhe este código com seu amigo:</p>
            <div className="text-5xl font-mono font-bold text-purple-300 tracking-widest mb-4">
              {generatedCode}
            </div>
            <p className="text-void-500 text-sm animate-pulse">
              {status || 'Aguardando oponente...'}
            </p>
            <button
              onClick={handleCancel}
              disabled={busy}
              className="mt-6 px-4 py-2 text-sm text-void-400 hover:text-void-200 transition-all"
            >
              Cancelar
            </button>
          </div>
        )}

        {status && !creating && (
          <p className="text-xs text-purple-300/90 text-center">{status}</p>
        )}

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        <button
          onClick={() => onNavigate('home')}
          className="text-sm text-void-500 hover:text-void-300 transition-all"
        >
          Voltar ao menu
        </button>
      </div>
    </div>
  );
}
