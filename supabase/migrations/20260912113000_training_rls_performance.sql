drop policy if exists dataset_versions_select on public.dataset_versions;
drop policy if exists dataset_versions_insert on public.dataset_versions;
drop policy if exists dataset_versions_update on public.dataset_versions;
drop policy if exists dataset_versions_delete on public.dataset_versions;
drop policy if exists training_jobs_select on public.training_jobs;
drop policy if exists training_jobs_insert on public.training_jobs;
drop policy if exists training_jobs_update on public.training_jobs;
drop policy if exists training_jobs_delete on public.training_jobs;

create policy dataset_versions_select on public.dataset_versions for select to authenticated using ((select auth.uid()) = user_id);
create policy dataset_versions_insert on public.dataset_versions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dataset_versions_update on public.dataset_versions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dataset_versions_delete on public.dataset_versions for delete to authenticated using ((select auth.uid()) = user_id);
create policy training_jobs_select on public.training_jobs for select to authenticated using ((select auth.uid()) = user_id);
create policy training_jobs_insert on public.training_jobs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy training_jobs_update on public.training_jobs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy training_jobs_delete on public.training_jobs for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists training_jobs_dataset_version_idx on public.training_jobs(dataset_version_id);
