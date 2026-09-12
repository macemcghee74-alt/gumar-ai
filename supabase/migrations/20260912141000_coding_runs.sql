create table if not exists public.coding_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repository_id text not null,
  task text not null,
  status text not null check (status in ('queued','planning','running','verifying','waiting_for_approval','completed','failed','cancelled')),
  phase text not null,
  max_steps integer not null default 30,
  steps_used integer not null default 0,
  max_provider_calls integer not null default 8,
  provider_calls_used integer not null default 0,
  token_budget integer,
  last_error text,
  result_summary text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.coding_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.coding_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  step_number integer not null,
  phase text not null,
  tool text not null,
  safe_arguments_summary text,
  result_status text not null,
  duration_ms integer,
  created_at timestamptz not null default now(),
  unique (run_id, step_number)
);

alter table public.coding_runs enable row level security;
alter table public.coding_steps enable row level security;
create policy coding_runs_owner on public.coding_runs for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy coding_steps_owner on public.coding_steps for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists coding_runs_user_created_idx on public.coding_runs (user_id, created_at desc);
create index if not exists coding_steps_run_idx on public.coding_steps (run_id, step_number);
