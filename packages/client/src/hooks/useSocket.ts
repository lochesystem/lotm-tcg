import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, GameAction, Deck, deserializeState } from 'game-engine';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface UseSocketReturn {
  connected: boolean;
  roomCode: string | null;
  gameState: GameState | null;
  gameOver: { winner: string | null } | null;
  createRoom: () => Promise<string>;
  joinRoom: (code: string) => Promise<boolean>;
  selectDeck: (deck: Deck) => void;
  sendAction: (action: GameAction) => Promise<boolean>;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState<{ winner: string | null } | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: false });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('game-state', (raw: unknown) => {
      setGameState(deserializeState(raw));
    });

    socket.on('game-start', (raw: unknown) => {
      setGameState(deserializeState(raw));
    });

    socket.on('game-over', (data: { winner: string | null }) => {
      setGameOver(data);
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) return reject('Not connected');

      socket.emit('create-room', (data: { code: string }) => {
        setRoomCode(data.code);
        resolve(data.code);
      });
    });
  };

  const joinRoom = (code: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) return resolve(false);

      socket.emit('join-room', code, (data: { success: boolean }) => {
        if (data.success) setRoomCode(code);
        resolve(data.success);
      });
    });
  };

  const selectDeck = (deck: Deck) => {
    socketRef.current?.emit('select-deck', deck);
  };

  const sendAction = (action: GameAction): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) return resolve(false);

      socket.emit('game-action', action, (data: { success: boolean }) => {
        resolve(data.success);
      });
    });
  };

  return { connected, roomCode, gameState, gameOver, createRoom, joinRoom, selectDeck, sendAction };
}
