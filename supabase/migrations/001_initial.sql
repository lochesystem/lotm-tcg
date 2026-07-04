-- LOTM TCG — initial schema

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  preferred_pathway text not null default 'fool',
  created_at timestamptz default now() not null
);

create table if not exists public.player_progress (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  owned_cards jsonb not null default '{}',
  win_streak int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Default',
  pathway text not null,
  cards jsonb not null default '[]',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  opponent_type text not null check (opponent_type in ('npc', 'pvp')),
  npc_tier int,
  won boolean not null default false,
  is_draw boolean not null default false,
  duration_turns int not null default 0,
  played_at timestamptz not null default now()
);

create index if not exists idx_decks_owner on public.decks(owner_id);
create index if not exists idx_match_history_player on public.match_history(player_id);

alter table public.profiles enable row level security;
alter table public.player_progress enable row level security;
alter table public.decks enable row level security;
alter table public.match_history enable row level security;

create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

create policy "player_progress read own" on public.player_progress
  for select using (auth.uid() = owner_id);

create policy "player_progress insert own" on public.player_progress
  for insert with check (auth.uid() = owner_id);

create policy "player_progress update own" on public.player_progress
  for update using (auth.uid() = owner_id);

create policy "decks read own" on public.decks
  for select using (auth.uid() = owner_id);

create policy "decks insert own" on public.decks
  for insert with check (auth.uid() = owner_id);

create policy "decks update own" on public.decks
  for update using (auth.uid() = owner_id);

create policy "decks delete own" on public.decks
  for delete using (auth.uid() = owner_id);

create policy "match_history read own" on public.match_history
  for select using (auth.uid() = player_id);

create policy "match_history insert own" on public.match_history
  for insert with check (auth.uid() = player_id);

-- Auto-create profile + progress on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, preferred_pathway)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'preferred_pathway', 'fool')
  )
  on conflict (id) do nothing;

  insert into public.player_progress (owner_id)
  values (new.id)
  on conflict (owner_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
