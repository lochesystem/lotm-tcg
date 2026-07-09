import { GameState, Deck } from 'game-engine';

export type RoomMode = 'friendly' | 'ranked';

export interface Room {
  code: string;
  mode: RoomMode;
  hostSocketId: string;
  guestSocketId: string | null;
  hostDeck: Deck | null;
  guestDeck: Deck | null;
  hostDisplayName: string | null;
  guestDisplayName: string | null;
  hostUserId: string | null;
  guestUserId: string | null;
  hostReady: boolean;
  guestReady: boolean;
  gameState: GameState | null;
  createdAt: number;
  status: 'waiting' | 'ready' | 'playing' | 'finished';
}

const ROOM_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes without guest
const RECONNECT_TIMEOUT_MS = 60 * 1000; // 60s to reconnect

export class RoomManager {
  private static instance: RoomManager;
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, string>();
  private disconnectedPlayers = new Map<string, { roomCode: string; playerId: string; deadline: number }>();

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId: string): Room {
    const code = this.generateCode();
    const room: Room = {
      code,
      mode: 'friendly',
      hostSocketId,
      guestSocketId: null,
      hostDeck: null,
      guestDeck: null,
      hostDisplayName: null,
      guestDisplayName: null,
      hostUserId: null,
      guestUserId: null,
      hostReady: false,
      guestReady: false,
      gameState: null,
      createdAt: Date.now(),
      status: 'waiting',
    };
    this.rooms.set(code, room);
    this.socketToRoom.set(hostSocketId, code);
    return room;
  }

  joinRoom(code: string, guestSocketId: string): Room | null {
    const room = this.rooms.get(code);
    if (!room || room.guestSocketId || room.status !== 'waiting') return null;
    room.guestSocketId = guestSocketId;
    room.status = 'ready';
    this.socketToRoom.set(guestSocketId, code);
    return room;
  }

  createRankedRoom(
    hostSocketId: string,
    guestSocketId: string,
    hostDeck: Deck,
    guestDeck: Deck,
    hostDisplayName: string,
    guestDisplayName: string,
    hostUserId: string,
    guestUserId: string
  ): Room {
    const code = this.generateCode();
    const room: Room = {
      code,
      mode: 'ranked',
      hostSocketId,
      guestSocketId,
      hostDeck,
      guestDeck,
      hostDisplayName,
      guestDisplayName,
      hostUserId: hostUserId || null,
      guestUserId: guestUserId || null,
      hostReady: true,
      guestReady: true,
      gameState: null,
      createdAt: Date.now(),
      status: 'ready',
    };
    this.rooms.set(code, room);
    this.socketToRoom.set(hostSocketId, code);
    this.socketToRoom.set(guestSocketId, code);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  setDeck(socketId: string, deck: Deck, displayName?: string): boolean {
    const room = this.getRoomBySocket(socketId);
    if (!room) return false;

    if (socketId === room.hostSocketId) {
      room.hostDeck = deck;
      room.hostReady = true;
      if (displayName) room.hostDisplayName = displayName;
    } else if (socketId === room.guestSocketId) {
      room.guestDeck = deck;
      room.guestReady = true;
      if (displayName) room.guestDisplayName = displayName;
    }
    return true;
  }

  isGameReady(room: Room): boolean {
    return room.hostReady && room.guestReady && !!room.hostDeck && !!room.guestDeck;
  }

  setGameState(code: string, state: GameState): void {
    const room = this.rooms.get(code);
    if (room) {
      room.gameState = state;
      room.status = 'playing';
    }
  }

  handleDisconnect(socketId: string): void {
    const code = this.socketToRoom.get(socketId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    if (room.status === 'playing') {
      this.disconnectedPlayers.set(socketId, {
        roomCode: code,
        playerId: socketId === room.hostSocketId ? 'host' : 'guest',
        deadline: Date.now() + RECONNECT_TIMEOUT_MS,
      });
    } else {
      this.removeRoom(code);
    }

    this.socketToRoom.delete(socketId);
  }

  removeRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      this.socketToRoom.delete(room.hostSocketId);
      if (room.guestSocketId) this.socketToRoom.delete(room.guestSocketId);
      this.rooms.delete(code);
    }
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.status === 'waiting' && now - room.createdAt > ROOM_EXPIRY_MS) {
        this.removeRoom(code);
      }
    }

    for (const [socketId, info] of this.disconnectedPlayers) {
      if (now > info.deadline) {
        this.disconnectedPlayers.delete(socketId);
        this.removeRoom(info.roomCode);
      }
    }
  }
}
