-- Deck slots (3 per player)

alter table public.decks add column if not exists slot_index smallint;

with ranked as (
  select
    id,
    row_number() over (
      partition by owner_id
      order by is_active desc, updated_at desc
    ) - 1 as rn
  from public.decks
  where slot_index is null
)
update public.decks d
set slot_index = ranked.rn
from ranked
where d.id = ranked.id and ranked.rn < 3;

alter table public.decks drop constraint if exists decks_slot_index_range;
alter table public.decks add constraint decks_slot_index_range
  check (slot_index is null or (slot_index >= 0 and slot_index <= 2));

create unique index if not exists idx_decks_owner_slot
  on public.decks (owner_id, slot_index)
  where slot_index is not null;
