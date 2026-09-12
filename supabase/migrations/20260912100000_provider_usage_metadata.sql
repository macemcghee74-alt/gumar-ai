alter table public.provider_usage
  add column if not exists model text,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists total_tokens integer,
  add column if not exists latency_ms integer,
  add column if not exists request_status text not null default 'completed'
    check (request_status in ('completed', 'failed', 'cancelled'));
