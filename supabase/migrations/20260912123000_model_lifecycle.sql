alter table public.model_versions drop constraint if exists model_versions_status_check;
alter table public.model_versions
  add column if not exists base_model text,
  add column if not exists dataset_version_id uuid references public.dataset_versions(id) on delete set null,
  add column if not exists training_provider text,
  add column if not exists training_job_id uuid references public.training_jobs(id) on delete set null,
  add column if not exists promoted_at timestamptz,
  add column if not exists rollback_target uuid references public.model_versions(id) on delete set null;

update public.model_versions set base_model = model_name where base_model is null;
alter table public.model_versions alter column base_model set not null;
alter table public.model_versions add constraint model_versions_status_check check (status in ('training', 'candidate', 'active', 'rejected', 'retired'));

alter table public.model_evaluations
  add column if not exists suite text not null default 'general',
  add column if not exists category text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists model_versions_status_idx on public.model_versions(status, created_at desc);
create index if not exists model_evaluations_model_suite_idx on public.model_evaluations(model_version_id, suite);
create index if not exists model_versions_dataset_version_idx on public.model_versions(dataset_version_id);
create index if not exists model_versions_training_job_idx on public.model_versions(training_job_id);
create index if not exists model_versions_rollback_target_idx on public.model_versions(rollback_target);
