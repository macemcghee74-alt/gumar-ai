alter table public.memories
  add column if not exists embedding_provider text,
  add column if not exists embedding_model text,
  add column if not exists embedding_dimensions integer,
  add column if not exists embedded_at timestamptz,
  add column if not exists embedding_version integer;

alter table public.memories
  add constraint memories_embedding_metadata_check check (
    embedding is null
    or (
      embedding_provider is not null
      and embedding_model is not null
      and embedding_dimensions is not null
      and embedded_at is not null
      and embedding_version is not null
    )
  );
