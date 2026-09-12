insert into storage.buckets (id, name, public)
values
  ('uploads', 'uploads', false),
  ('generated-images', 'generated-images', false),
  ('audio', 'audio', false)
on conflict (id) do update set public = excluded.public;

create policy gunmar_storage_select on storage.objects
  for select to authenticated
  using (bucket_id in ('uploads', 'generated-images', 'audio') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy gunmar_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('uploads', 'generated-images', 'audio') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy gunmar_storage_update on storage.objects
  for update to authenticated
  using (bucket_id in ('uploads', 'generated-images', 'audio') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('uploads', 'generated-images', 'audio') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy gunmar_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('uploads', 'generated-images', 'audio') and (storage.foldername(name))[1] = (select auth.uid())::text);
