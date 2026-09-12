create table if not exists public.rate_limit_windows (
  subject_id uuid not null,
  scope text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (subject_id, scope, window_started_at)
);

alter table public.rate_limit_windows enable row level security;

revoke all on table public.rate_limit_windows from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_limit integer default 30,
  p_window_seconds integer default 60
)
returns table (
  allowed boolean,
  retry_after integer,
  request_count integer
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_subject uuid := auth.uid();
  window_start timestamptz;
  current_count integer;
begin
  if current_subject is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_scope is null or p_scope = '' or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit configuration' using errcode = '22023';
  end if;

  window_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limit_windows(subject_id, scope, window_started_at, request_count)
  values (current_subject, p_scope, window_start, 1)
  on conflict (subject_id, scope, window_started_at)
  do update set request_count = public.rate_limit_windows.request_count + 1
  returning public.rate_limit_windows.request_count into current_count;

  return query select
    current_count <= p_limit,
    greatest(1, ceil(extract(epoch from (window_start + make_interval(secs => p_window_seconds) - clock_timestamp())))::integer),
    current_count;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer) from anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

create index if not exists rate_limit_windows_expiry_idx
  on public.rate_limit_windows (window_started_at);
