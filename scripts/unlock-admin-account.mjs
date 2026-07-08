#!/usr/bin/env node
/**
 * One-off admin unlock for a player account.
 * Usage: node scripts/unlock-admin-account.mjs <user-uuid>
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/unlock-admin-account.mjs <user-uuid>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { getAllCards } = await import(pathToFileURL(join(root, 'packages/game-engine/dist/index.js')).href);

const ownedCards = {};
for (const card of getAllCards()) {
  ownedCards[card.id] = card.rarity === 'legendary' ? 1 : 2;
}

const ownedJson = JSON.stringify(ownedCards).replace(/'/g, "''");
const storyProgress = 5; // all bosses beaten

const sql = `DO $$
DECLARE
  uid uuid := '${userId}'::uuid;
BEGIN
  insert into public.profiles (id, username, display_name, preferred_pathway)
  select
    uid,
    coalesce(u.raw_user_meta_data->>'username', 'admin'),
    coalesce(u.raw_user_meta_data->>'display_name', 'Admin'),
    'fool'
  from auth.users u
  where u.id = uid
  on conflict (id) do nothing;

  insert into public.player_progress (
    owner_id,
    owned_cards,
    story_progress,
    win_streak,
    wins,
    losses,
    updated_at
  ) values (
    uid,
    '${ownedJson}'::jsonb,
    ${storyProgress},
    99,
    999,
    0,
    now()
  )
  on conflict (owner_id) do update set
    owned_cards = excluded.owned_cards,
    story_progress = excluded.story_progress,
    win_streak = excluded.win_streak,
    wins = excluded.wins,
    losses = excluded.losses,
    updated_at = now();
END $$;`;

const sqlPath = join(root, '.tmp-unlock-admin.sql');
writeFileSync(sqlPath, sql, 'utf8');

try {
  const password = readFileSync(join(root, '.supabase-db-password.local'), 'utf8').trim();
  const encoded = encodeURIComponent(password);
  const dbUrl = `postgresql://postgres:${encoded}@db.mtppkhoyflsulbpwsdit.supabase.co:5432/postgres`;
  execSync(`npx supabase db query --db-url "${dbUrl}" -f "${sqlPath}"`, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
} finally {
  try {
    unlinkSync(sqlPath);
  } catch {
    /* ignore */
  }
}
