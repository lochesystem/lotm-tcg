import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DATABASE_PATH ??
  path.resolve(__dirname, '../../data/lotm-tcg.db');

export function initDatabase(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      pathway TEXT NOT NULL DEFAULT 'fool',
      collection TEXT NOT NULL DEFAULT '[]',
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      rank_points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      pathway TEXT NOT NULL,
      cards TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Default',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS match_history (
      id TEXT PRIMARY KEY,
      player1_id TEXT NOT NULL,
      player2_id TEXT,
      npc_tier INTEGER,
      winner_id TEXT,
      is_draw INTEGER NOT NULL DEFAULT 0,
      duration_turns INTEGER NOT NULL DEFAULT 0,
      played_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export function createPlayer(db: Database.Database, username: string): string {
  const id = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare('INSERT INTO players (id, username) VALUES (?, ?)').run(id, username);
  return id;
}

export function getPlayer(db: Database.Database, username: string) {
  return db.prepare('SELECT * FROM players WHERE username = ?').get(username) as any;
}

export function updatePlayerStats(db: Database.Database, playerId: string, won: boolean): void {
  if (won) {
    db.prepare('UPDATE players SET wins = wins + 1, rank_points = rank_points + 10 WHERE id = ?').run(playerId);
  } else {
    db.prepare('UPDATE players SET losses = losses + 1 WHERE id = ?').run(playerId);
  }
}

export function addToCollection(db: Database.Database, playerId: string, cardIds: string[]): void {
  const player = db.prepare('SELECT collection FROM players WHERE id = ?').get(playerId) as any;
  if (!player) return;

  const collection: string[] = JSON.parse(player.collection);
  for (const id of cardIds) {
    if (!collection.includes(id)) {
      collection.push(id);
    }
  }
  db.prepare('UPDATE players SET collection = ? WHERE id = ?').run(JSON.stringify(collection), playerId);
}
