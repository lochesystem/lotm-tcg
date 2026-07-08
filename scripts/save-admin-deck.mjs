#!/usr/bin/env node
/**
 * Save a validated deck to slot 0 for an admin/test account.
 * Usage: node scripts/save-admin-deck.mjs <user-uuid>
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const userId = process.argv[2] ?? 'fe67a714-979e-44f1-a24f-f7f73ba99f5c';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const { validateDeck } = await import(pathToFileURL(join(root, 'packages/game-engine/dist/index.js')).href);

/** Red Priest burn aggro — low curve, haste/frenzy, face damage, late Calamity + Medici. */
const deck = {
  name: 'Pira Purificadora',
  pathway: 'red-priest',
  cards: [
    'rp-ember-acolyte', 'rp-ember-acolyte',
    'rp-fire-spark', 'rp-fire-spark',
    'rp-flame-tongue', 'rp-flame-tongue',
    'rp-kindling-servant',
    'rp-sacred-flame-bearer', 'rp-sacred-flame-bearer',
    'rp-burning-oil', 'rp-burning-oil',
    'rp-flame-dancer', 'rp-flame-dancer',
    'n-spirit-vision', 'n-spirit-vision',
    'rp-flame-trap', 'rp-flame-trap',
    'rp-inferno-priest', 'rp-inferno-priest',
    'rp-blood-sacrifice', 'rp-blood-sacrifice',
    'rp-burning-fanatic', 'rp-burning-fanatic',
    'rp-conflagration-knight', 'rp-conflagration-knight',
    'rp-scarlet-monarch', 'rp-scarlet-monarch',
    'rp-zealot-commander',
    'rp-calamity-incarnate',
    'rp-red-angel-medici',
  ],
};

const validation = validateDeck(deck);
if (!validation.valid) {
  console.error('Invalid deck:', validation.errors);
  process.exit(1);
}

const cardsJson = JSON.stringify(deck.cards).replace(/'/g, "''");

const sql = `DO $$
DECLARE
  uid uuid := '${userId}'::uuid;
  existing_id uuid;
BEGIN
  update public.decks set is_active = false where owner_id = uid;

  select id into existing_id
  from public.decks
  where owner_id = uid and slot_index = 0
  limit 1;

  if existing_id is null then
    insert into public.decks (
      owner_id,
      name,
      pathway,
      cards,
      slot_index,
      is_active,
      updated_at
    ) values (
      uid,
      '${deck.name}',
      '${deck.pathway}',
      '${cardsJson}'::jsonb,
      0,
      true,
      now()
    );
  else
    update public.decks set
      name = '${deck.name}',
      pathway = '${deck.pathway}',
      cards = '${cardsJson}'::jsonb,
      is_active = true,
      updated_at = now()
    where id = existing_id;
  end if;
END $$;`;

const sqlPath = join(root, '.tmp-save-deck.sql');
writeFileSync(sqlPath, sql, 'utf8');

try {
  const password = readFileSync(join(root, '.supabase-db-password.local'), 'utf8').trim();
  const dbUrl = `postgresql://postgres:${encodeURIComponent(password)}@db.mtppkhoyflsulbpwsdit.supabase.co:5432/postgres`;
  execSync(`npx supabase db query --db-url "${dbUrl}" -f "${sqlPath}"`, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  console.log(`Saved "${deck.name}" (${deck.cards.length} cards) to slot 0 for ${userId}`);
} finally {
  try {
    unlinkSync(sqlPath);
  } catch {
    /* ignore */
  }
}
