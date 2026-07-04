import { useState } from 'react';
import { Screen } from '../App';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function LobbyScreen({ onNavigate }: Props) {
  const [roomCode, setRoomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleCreate = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setGeneratedCode(code);
    setCreating(true);
    // TODO: connect to server and create room
  };

  const handleJoin = () => {
    if (roomCode.length !== 4) return;
    // TODO: connect to server and join room
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/50 via-void-950 to-void-950" />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full">
        <h2 className="text-2xl font-bold">Multiplayer</h2>

        {!creating ? (
          <>
            <button
              onClick={handleCreate}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 rounded-xl font-bold text-lg transition-all"
            >
              Create Room
            </button>

            <div className="text-void-500 text-sm">or</div>

            <div className="w-full flex gap-2">
              <input
                type="text"
                maxLength={4}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                className="flex-1 px-4 py-3 bg-void-800 border border-void-600 rounded-xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleJoin}
                disabled={roomCode.length !== 4}
                className="px-6 py-3 bg-green-700 hover:bg-green-600 disabled:bg-void-700 disabled:text-void-500 rounded-xl font-bold transition-all"
              >
                Join
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-void-400 mb-4">Share this code with your friend:</p>
            <div className="text-5xl font-mono font-bold text-purple-300 tracking-widest mb-4">
              {generatedCode}
            </div>
            <p className="text-void-500 text-sm animate-pulse">Waiting for opponent...</p>
            <button
              onClick={() => { setCreating(false); setGeneratedCode(null); }}
              className="mt-6 px-4 py-2 text-sm text-void-400 hover:text-void-200 transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        <button
          onClick={() => onNavigate('home')}
          className="text-sm text-void-500 hover:text-void-300 transition-all mt-4"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
