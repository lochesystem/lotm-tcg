import { io, Socket } from 'socket.io-client';
import { GameState, GameAction, Deck, deserializeState } from 'game-engine';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export type OnlineRole = 'host' | 'guest';

export interface RoomUpdatePayload {
  status: string;
  players?: number;
  hostReady?: boolean;
  guestReady?: boolean;
}

type GameStartListener = (state: GameState, role: OnlineRole) => void;
type GameStateListener = (state: GameState) => void;
type RoomUpdateListener = (data: RoomUpdatePayload) => void;
type ConnectionListener = (connected: boolean) => void;

let socket: Socket | null = null;
let onlineRole: OnlineRole | null = null;
let roomCode: string | null = null;

const gameStartListeners = new Set<GameStartListener>();
const gameStateListeners = new Set<GameStateListener>();
const roomUpdateListeners = new Set<RoomUpdateListener>();
const connectionListeners = new Set<ConnectionListener>();

function emitConnection(connected: boolean) {
  for (const listener of connectionListeners) listener(connected);
}

function ensureSocket(): Socket {
  if (socket) return socket;

  socket = io(SERVER_URL, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => emitConnection(true));
  socket.on('disconnect', () => emitConnection(false));

  socket.on('game-start', (raw: unknown) => {
    const state = deserializeState(raw);
    const role = onlineRole ?? 'host';
    for (const listener of gameStartListeners) listener(state, role);
  });

  socket.on('game-state', (raw: unknown) => {
    const state = deserializeState(raw);
    for (const listener of gameStateListeners) listener(state);
  });

  socket.on('room-update', (data: RoomUpdatePayload) => {
    for (const listener of roomUpdateListeners) listener(data);
  });

  return socket;
}

export function getMultiplayerServerUrl(): string {
  return SERVER_URL;
}

export function getOnlineRoomCode(): string | null {
  return roomCode;
}

export function getOnlineRole(): OnlineRole | null {
  return onlineRole;
}

export function subscribeConnection(listener: ConnectionListener): () => void {
  connectionListeners.add(listener);
  const s = ensureSocket();
  listener(s.connected);
  return () => connectionListeners.delete(listener);
}

export function subscribeGameStart(listener: GameStartListener): () => void {
  gameStartListeners.add(listener);
  return () => gameStartListeners.delete(listener);
}

export function subscribeGameState(listener: GameStateListener): () => void {
  gameStateListeners.add(listener);
  return () => gameStateListeners.delete(listener);
}

export function subscribeRoomUpdate(listener: RoomUpdateListener): () => void {
  roomUpdateListeners.add(listener);
  return () => roomUpdateListeners.delete(listener);
}

export function connectMultiplayer(): Socket {
  const s = ensureSocket();
  if (!s.connected) s.connect();
  return s;
}

export function waitForConnection(timeoutMs = 20_000): Promise<void> {
  const s = connectMultiplayer();
  if (s.connected) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      s.off('connect', onConnect);
      reject(new Error('Não foi possível conectar ao servidor'));
    }, timeoutMs);

    const onConnect = () => {
      clearTimeout(timer);
      resolve();
    };

    s.once('connect', onConnect);
  });
}

export function createMultiplayerRoom(): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = connectMultiplayer();

    const emitCreate = () => {
      s.emit('create-room', (data: { code: string }) => {
        onlineRole = 'host';
        roomCode = data.code;
        resolve(data.code);
      });
    };

    if (s.connected) emitCreate();
    else s.once('connect', emitCreate);

    s.once('connect_error', () => reject(new Error('Falha na conexão com o servidor')));
  });
}

export function joinMultiplayerRoom(code: string): Promise<boolean> {
  return new Promise((resolve) => {
    const s = connectMultiplayer();
    const normalized = code.trim().toUpperCase();

    const emitJoin = () => {
      s.emit('join-room', normalized, (data: { success: boolean }) => {
        if (data.success) {
          onlineRole = 'guest';
          roomCode = normalized;
        }
        resolve(data.success);
      });
    };

    if (s.connected) emitJoin();
    else s.once('connect', emitJoin);
  });
}

export function submitMultiplayerDeck(deck: Deck): void {
  connectMultiplayer().emit('select-deck', deck);
}

export function sendMultiplayerAction(action: GameAction): Promise<boolean> {
  return new Promise((resolve) => {
    const s = connectMultiplayer();
    if (!s.connected) return resolve(false);

    s.emit('game-action', action, (data: { success: boolean }) => {
      resolve(data.success);
    });
  });
}

export function clearMultiplayerSession(): void {
  onlineRole = null;
  roomCode = null;
}
