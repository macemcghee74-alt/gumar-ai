create or replace function public.search_memories(
  query_embedding vector(1536),
  match_count integer default 8
)
returns table (
  id uuid,
  content text,
  memory_type text,
  importance numeric,
  confidence numeric,
  similarity real,
  rank_score real
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.id,
    m.content,
    m.memory_type,
    m.importance,
    m.confidence,
    (1 - (m.embedding <=> query_embedding))::real as similarity,
    (
      (1 - (m.embedding <=> query_embedding)) * 0.55
      + m.importance * 0.25
      + m.confidence * 0.15
      + greatest(0, 1 - extract(epoch from (now() - coalesce(m.last_accessed_at, m.created_at))) / 31536000) * 0.05
    )::real as rank_score
  from public.memories m
  where m.user_id = (select auth.uid())
    and m.superseded_at is null
    and m.embedding is not null
    and query_embedding is not null
  order by rank_score desc
  limit least(greatest(match_count, 1), 50);
$$;

revoke execute on function public.search_memories(vector, integer) from anon;
grant execute on function public.search_memories(vector, integer) to authenticated;
