-- Story mode progression (bosses beaten in sequence)

alter table public.player_progress
  add column if not exists story_progress int not null default 0;
