-- Roguelike meta currency
ALTER TABLE player_progress
  ADD COLUMN IF NOT EXISTS essence_balance INTEGER NOT NULL DEFAULT 0;
