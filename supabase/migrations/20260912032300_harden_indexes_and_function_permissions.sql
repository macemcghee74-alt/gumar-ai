-- Keep foreign-key lookups and cascades efficient.
do $$
declare
  fk record;
  index_name text;
begin
  for fk in
    select
      n.nspname as schema_name,
      child.relname as table_name,
      string_agg(quote_ident(child_col.attname), ', ' order by key.ord) as columns,
      string_agg(child_col.attname, '_' order by key.ord) as column_names
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_namespace n on n.oid = child.relnamespace
    join lateral unnest(con.conkey) with ordinality as key(attnum, ord) on true
    join pg_attribute child_col on child_col.attrelid = child.oid and child_col.attnum = key.attnum
    where con.contype = 'f' and n.nspname = 'public'
    group by n.nspname, child.relname, con.conname
  loop
    index_name := format('%s_%s_fk_idx', fk.table_name, fk.column_names);
    execute format('create index if not exists %I on %I.%I (%s)', index_name, fk.schema_name, fk.table_name, fk.columns);
  end loop;
end $$;

-- This platform helper is not an application RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
