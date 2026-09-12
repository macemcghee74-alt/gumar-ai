alter table public.training_examples
  add column if not exists status text not null default 'candidate'
    check (status in ('candidate', 'approved', 'rejected', 'exported')),
  add column if not exists source text not null default 'conversation',
  add column if not exists correction text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dataset_id uuid not null references public.training_datasets(id) on delete cascade,
  version integer not null check (version > 0),
  example_count integer not null default 0 check (example_count >= 0),
  content_hash text not null,
  approval_state text not null default 'draft' check (approval_state in ('draft', 'approved', 'exported')),
  created_at timestamptz not null default now(),
  unique (dataset_id, version)
);

create table if not exists public.training_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dataset_version_id uuid not null references public.dataset_versions(id) on delete restrict,
  provider text not null,
  base_model text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  external_job_id text,
  result_model text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

alter table public.dataset_versions enable row level security;
alter table public.training_jobs enable row level security;

create policy dataset_versions_select on public.dataset_versions for select to authenticated using (auth.uid() = user_id);
create policy dataset_versions_insert on public.dataset_versions for insert to authenticated with check (auth.uid() = user_id);
create policy dataset_versions_update on public.dataset_versions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy dataset_versions_delete on public.dataset_versions for delete to authenticated using (auth.uid() = user_id);
create policy training_jobs_select on public.training_jobs for select to authenticated using (auth.uid() = user_id);
create policy training_jobs_insert on public.training_jobs for insert to authenticated with check (auth.uid() = user_id);
create policy training_jobs_update on public.training_jobs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy training_jobs_delete on public.training_jobs for delete to authenticated using (auth.uid() = user_id);

create index if not exists training_examples_user_status_idx on public.training_examples(user_id, status, created_at desc);
create index if not exists dataset_versions_user_created_idx on public.dataset_versions(user_id, created_at desc);
create index if not exists training_jobs_user_created_idx on public.training_jobs(user_id, created_at desc);

grant select, insert, update, delete on public.dataset_versions, public.training_jobs to authenticated;
