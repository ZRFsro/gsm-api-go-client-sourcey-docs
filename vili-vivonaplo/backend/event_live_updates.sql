-- Applied to production on 2026-11-15. Adds only the separate venue-news log.
create table if not exists public.event_live_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  phase text not null check (phase in ('waiting','pool','break','tableau','finished')),
  current_text text not null default '',
  next_text text not null default '',
  opponent text not null default '',
  my_score integer check (my_score between 0 and 99),
  their_score integer check (their_score between 0 and 99),
  strip text not null default '',
  created_at timestamptz not null default now()
);
alter table public.event_live_updates enable row level security;
revoke all on public.event_live_updates from anon, authenticated;
grant all on public.event_live_updates to service_role;
create index if not exists event_live_updates_event_time_idx on public.event_live_updates(event_id, created_at desc);
