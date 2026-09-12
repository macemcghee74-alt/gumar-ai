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
  identity_version integer not null default 1,
  current_model_version text
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  memory_type text not null check (memory_type in ('semantic', 'episodic', 'preference', 'relationship', 'project')),
  importance numeric not null default 0.5 check (importance between 0 and 1),
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  embedding vector(1536),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  access_count integer not null default 0
);

create index if not exists conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists memories_user_type_idx on public.memories(user_id, memory_type);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.memories enable row level security;

create policy "profiles are owner readable" on public.profiles for select using (auth.uid() = id);
create policy "profiles are owner editable" on public.profiles for update using (auth.uid() = id);
create policy "conversations are owner accessible" on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages are owner accessible" on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "memories are owner accessible" on public.memories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
