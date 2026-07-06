-- Enrich match history with mode and opponent display label

alter table public.match_history
  add column if not exists match_mode text check (match_mode in ('story', 'npc', 'pvp')),
  add column if not exists opponent_label text;

update public.match_history
set
  match_mode = case when opponent_type = 'pvp' then 'pvp' else 'npc' end,
  opponent_label = case when opponent_type = 'pvp' then 'Player' else 'NPC' end
where match_mode is null;
