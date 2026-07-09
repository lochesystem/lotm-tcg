import type { Deck } from 'game-engine';

export interface QueueEntry {
  socketId: string;
  userId: string;
  displayName: string;
  deck: Deck;
  joinedAt: number;
}

export interface RankedMatch {
  host: QueueEntry;
  guest: QueueEntry;
}

export class MatchmakingQueue {
  private static instance: MatchmakingQueue;
  private queue: QueueEntry[] = [];

  static getInstance(): MatchmakingQueue {
    if (!MatchmakingQueue.instance) {
      MatchmakingQueue.instance = new MatchmakingQueue();
    }
    return MatchmakingQueue.instance;
  }

  enqueue(entry: QueueEntry): RankedMatch | null {
    this.removeBySocket(entry.socketId);
    this.queue.push(entry);

    if (this.queue.length < 2) {
      return null;
    }

    const host = this.queue.shift()!;
    const guest = this.queue.shift()!;
    return { host, guest };
  }

  removeBySocket(socketId: string): void {
    this.queue = this.queue.filter((entry) => entry.socketId !== socketId);
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}
