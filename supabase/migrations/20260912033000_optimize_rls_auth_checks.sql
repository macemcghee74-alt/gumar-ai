-- Evaluate the authenticated user once per statement instead of once per row.
do $$
declare
  policy_row record;
  using_expression text;
  check_expression text;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%')
  loop
    using_expression := replace(policy_row.qual, 'auth.uid()', '(select auth.uid())');
    check_expression := replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())');

    if policy_row.qual is not null and policy_row.with_check is not null then
      execute format(
        'alter policy %I on %I.%I using (%s) with check (%s)',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        using_expression,
        check_expression
      );
    elsif policy_row.qual is not null then
      execute format(
        'alter policy %I on %I.%I using (%s)',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        using_expression
      );
    elsif policy_row.with_check is not null then
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        check_expression
      );
    end if;
  end loop;
end $$;
