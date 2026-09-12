-- ============================================================================
-- TARGET PROJECT: spzedizgazoyfovzdgjb
-- GUNMAR ONLY - DO NOT RUN ON MORT OR LOOP
-- ============================================================================
create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.gunmar_identity (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Gunmar',
  created_at timestamptz not null default now(),
  identity_version integer not null default 1 check (identity_version > 0),
  current_model_version text
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (conversation_id, user_id) references public.conversations(id, user_id) on delete cascade
);
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  memory_type text not null check (memory_type in ('semantic', 'episodic', 'preference', 'relationship', 'project')),
  importance numeric not null default 0.5 check (importance between 0 and 1),
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  embedding vector(1536),
  source_message_id uuid,
  superseded_by uuid references public.memories(id),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  access_count integer not null default 0 check (access_count >= 0)
);
create table if not exists public.personality_traits (
  user_id uuid not null references auth.users(id) on delete cascade,
  trait text not null,
  value numeric not null check (value between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, trait)
);
create table if not exists public.personality_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trait text not null,
  previous_value numeric check (previous_value between 0 and 1),
  new_value numeric not null check (new_value between 0 and 1),
  reason text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.relationships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  familiarity numeric not null default 0 check (familiarity between 0 and 1),
  trust numeric not null default 0 check (trust between 0 and 1),
  interaction_count integer not null default 0 check (interaction_count >= 0),
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.relationship_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  learned text,
  uncertainty text,
  created_at timestamptz not null default now()
);
create table if not exists public.learned_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact text not null,
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  strength numeric not null default 0.5 check (strength between 0 and 1),
  unique (user_id, name)
);
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  proficiency numeric not null default 0 check (proficiency between 0 and 1),
  unique (user_id, name)
);
create table if not exists public.tool_definitions (
  name text primary key,
  description text not null,
  risk_level text not null check (risk_level in ('safe_read', 'internal_write', 'external_action', 'high_impact')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.tool_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_name text not null references public.tool_definitions(name),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null check (status in ('pending', 'approved', 'completed', 'failed', 'denied')),
  created_at timestamptz not null default now()
);
create table if not exists public.autonomy_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  enabled boolean not null default false,
  max_steps integer not null default 5 check (max_steps between 1 and 50),
  token_budget integer not null default 4000 check (token_budget > 0),
  created_at timestamptz not null default now()
);
create table if not exists public.autonomy_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.autonomy_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  steps integer not null default 0 check (steps >= 0),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.training_examples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input text not null,
  output text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.training_datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  version integer not null default 1 check (version > 0),
  status text not null check (status in ('draft', 'approved', 'submitted', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  unique (user_id, name, version)
);
create table if not exists public.model_versions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_name text not null,
  version text not null,
  status text not null check (status in ('candidate', 'active', 'rejected', 'retired')),
  created_at timestamptz not null default now(),
  unique (provider, model_name, version)
);
create table if not exists public.model_evaluations (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.model_versions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  score numeric not null check (score between 0 and 1),
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.generated_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  storage_path text not null,
  asset_type text not null check (asset_type in ('image', 'audio', 'file')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  provider text not null,
  status text not null check (status in ('active', 'completed', 'failed')),
  created_at timestamptz not null default now()
);
create table if not exists public.web_research_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.provider_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  operation text not null,
  units numeric not null default 0,
  cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists memories_user_type_idx on public.memories(user_id, memory_type);
create index if not exists memories_embedding_idx on public.memories using hnsw (embedding vector_cosine_ops);
create index if not exists conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists audit_events_user_created_idx on public.audit_events(user_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'gunmar_identity','profiles','conversations','messages','memories','personality_traits','personality_history',
    'relationships','relationship_events','journal_entries','learned_facts','interests','skills',
    'tool_definitions','tool_executions','autonomy_tasks','autonomy_runs','training_examples',
    'training_datasets','model_versions','model_evaluations','generated_assets','voice_sessions',
    'web_research_sessions','audit_events','provider_usage'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy gunmar_identity_select on public.gunmar_identity for select to authenticated using (true);
create policy profiles_select on public.profiles for select to authenticated using (auth.uid() = id);
create policy profiles_insert on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_update on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy conversations_select on public.conversations for select to authenticated using (auth.uid() = user_id);
create policy conversations_insert on public.conversations for insert to authenticated with check (auth.uid() = user_id);
create policy conversations_update on public.conversations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy conversations_delete on public.conversations for delete to authenticated using (auth.uid() = user_id);
create policy messages_select on public.messages for select to authenticated using (auth.uid() = user_id);
create policy messages_insert on public.messages for insert to authenticated with check (auth.uid() = user_id);
create policy messages_update on public.messages for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy messages_delete on public.messages for delete to authenticated using (auth.uid() = user_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'memories','personality_traits','personality_history','relationships','relationship_events',
    'journal_entries','learned_facts','interests','skills','tool_executions','autonomy_tasks',
    'autonomy_runs','training_examples','training_datasets','generated_assets','voice_sessions',
    'web_research_sessions'
  ] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (auth.uid() = user_id)', table_name, table_name);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (auth.uid() = user_id)', table_name, table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name, table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (auth.uid() = user_id)', table_name, table_name);
  end loop;
end $$;

create policy tool_definitions_select on public.tool_definitions for select to authenticated using (enabled = true);
create policy model_versions_select on public.model_versions for select to authenticated using (true);
create policy model_evaluations_select on public.model_evaluations for select to authenticated using (user_id is null or auth.uid() = user_id);
create policy audit_events_select on public.audit_events for select to authenticated using (auth.uid() = user_id);
create policy provider_usage_select on public.provider_usage for select to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
