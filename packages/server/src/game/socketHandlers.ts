import { Server, Socket } from 'socket.io';
import { RoomManager, type Room } from '../rooms/RoomManager.js';
import {
  createGame,
  applyAction,
  validateAction,
  serializeState,
  GameAction,
  Deck,
  createStarterDeck,
} from 'game-engine';
import { NpcEngine } from '../npc/NpcEngine.js';
import Database from 'better-sqlite3';

function emitRoomUpdate(io: Server, room: Room): void {
  io.to(room.code).emit('room-update', {
    status: room.guestSocketId ? 'in-room' : 'waiting',
    players: room.guestSocketId ? 2 : 1,
    hostReady: room.hostReady,
    guestReady: room.guestReady,
  });
}

export function setupSocketHandlers(
  io: Server,
  socket: Socket,
  roomManager: RoomManager,
  db: Database.Database
): void {
  // ─── Room management ─────────────────────────────────────────────────

  socket.on('create-room', (callback: (data: { code: string }) => void) => {
    const room = roomManager.createRoom(socket.id);
    socket.join(room.code);
    callback({ code: room.code });
  });

  socket.on('join-room', (code: string, callback: (data: { success: boolean; error?: string }) => void) => {
    const room = roomManager.joinRoom(code, socket.id);
    if (!room) {
      callback({ success: false, error: 'Room not found or full' });
      return;
    }
    socket.join(code);
    emitRoomUpdate(io, room);
    callback({ success: true });
  });

  socket.on('select-deck', (payload: Deck | { deck: Deck; displayName?: string }) => {
    const deck = payload && typeof payload === 'object' && 'deck' in payload ? payload.deck : payload;
    const displayName =
      payload && typeof payload === 'object' && 'displayName' in payload
        ? payload.displayName
        : undefined;
    roomManager.setDeck(socket.id, deck, displayName);
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;

    emitRoomUpdate(io, room);

    if (roomManager.isGameReady(room)) {
      startGame(io, room.code, roomManager);
    }
  });

  // ─── Game actions ────────────────────────────────────────────────────

  socket.on('game-action', (action: GameAction, callback: (data: { success: boolean; error?: string }) => void) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room || !room.gameState) {
      callback({ success: false, error: 'No active game' });
      return;
    }

    const playerId = socket.id === room.hostSocketId ? 'host' : 'guest';
    const error = validateAction(room.gameState, playerId, action);
    if (error) {
      callback({ success: false, error });
      return;
    }

    try {
      const newState = applyAction(room.gameState, playerId, action);
      room.gameState = newState;
      roomManager.setGameState(room.code, newState);

      const serialized = serializeState(newState);
      io.to(room.code).emit('game-state', serialized);
      callback({ success: true });

      if (newState.phase === 'ended') {
        io.to(room.code).emit('game-over', {
          winner: newState.winner,
          hostWon: newState.winner === 'host',
        });
        room.status = 'finished';
      }
    } catch (e) {
      callback({ success: false, error: (e as Error).message });
    }
  });

  // ─── NPC Battle ──────────────────────────────────────────────────────

  socket.on('start-npc-battle', (data: { pathway: string; tier: number }, callback: (resp: { success: boolean }) => void) => {
    const playerDeck = createStarterDeck(data.pathway as any);
    const npcDeck = NpcEngine.getDeckForTier(data.tier);

    const gameState = createGame(
      `npc-${Date.now()}`,
      { id: socket.id, deck: playerDeck },
      { id: 'npc', deck: npcDeck },
      Date.now()
    );

    // Auto-mulligan
    const s1 = applyAction(gameState, socket.id, { type: 'mulligan', indices: [] });
    const s2 = applyAction(s1, 'npc', { type: 'mulligan', indices: [] });

    socket.emit('game-state', serializeState(s2));
    callback({ success: true });

    // Store in temporary room for NPC
    const npcRoom = roomManager.createRoom(socket.id);
    npcRoom.gameState = s2;
    npcRoom.status = 'playing';
  });

  socket.on('npc-action', (action: GameAction, callback: (data: { success: boolean; error?: string }) => void) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room || !room.gameState) {
      callback({ success: false, error: 'No active game' });
      return;
    }

    const error = validateAction(room.gameState, socket.id, action);
    if (error) {
      callback({ success: false, error });
      return;
    }

    try {
      let state = applyAction(room.gameState, socket.id, action);

      // If player ended turn, NPC plays
      if (action.type === 'end-turn' && state.phase !== 'ended') {
        state = NpcEngine.playTurn(state, 'npc');
      }

      room.gameState = state;
      socket.emit('game-state', serializeState(state));
      callback({ success: true });

      if (state.phase === 'ended') {
        socket.emit('game-over', { winner: state.winner });
      }
    } catch (e) {
      callback({ success: false, error: (e as Error).message });
    }
  });
}

function startGame(io: Server, roomCode: string, roomManager: RoomManager): void {
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.hostDeck || !room.guestDeck) return;

  let gameState = createGame(
    `pvp-${Date.now()}`,
    { id: 'host', deck: room.hostDeck },
    { id: 'guest', deck: room.guestDeck },
    Date.now()
  );

  gameState = applyAction(gameState, 'host', { type: 'mulligan', indices: [] });
  gameState = applyAction(gameState, 'guest', { type: 'mulligan', indices: [] });

  roomManager.setGameState(roomCode, gameState);
  io.to(roomCode).emit('game-start', {
    state: serializeState(gameState),
    hostDisplayName: room.hostDisplayName ?? 'Host',
    guestDisplayName: room.guestDisplayName ?? 'Guest',
  });
}
