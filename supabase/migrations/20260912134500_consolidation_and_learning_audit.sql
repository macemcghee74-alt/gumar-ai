alter table public.personality_traits
  add column if not exists evidence_count integer not null default 0 check (evidence_count >= 0),
  add column if not exists minimum_value numeric not null default 0 check (minimum_value between 0 and 1),
  add column if not exists maximum_value numeric not null default 1 check (maximum_value between 0 and 1);

alter table public.personality_history
  add column if not exists delta numeric not null default 0,
  add column if not exists source_interaction_ids jsonb not null default '[]'::jsonb;

alter table public.relationships
  add column if not exists communication_preferences jsonb not null default '{}'::jsonb,
  add column if not exists important_shared_events jsonb not null default '[]'::jsonb,
  add column if not exists reliability numeric not null default 0.5 check (reliability between 0 and 1);

create table if not exists public.consolidation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source_start timestamptz,
  source_end timestamptz,
  messages_examined integer not null default 0,
  memories_examined integer not null default 0,
  memories_created integer not null default 0,
  memories_updated integer not null default 0,
  memories_superseded integer not null default 0,
  personality_changes integer not null default 0,
  relationship_changes integer not null default 0,
  journal_entries_created integer not null default 0,
  training_candidates_created integer not null default 0,
  provider text,
  model text,
  model text,
  error_class text,
  created_at timestamptz not null default now()
);

alter table public.consolidation_runs enable row level security;
create policy consolidation_runs_owner on public.consolidation_runs
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists consolidation_runs_user_created_idx on public.consolidation_runs (user_id, created_at desc);
