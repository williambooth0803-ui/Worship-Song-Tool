-- Private file storage. File references live in the owner's workspace JSON.
insert into storage.buckets(id,name,public,file_size_limit)
values('song-files','song-files',false,10485760)
on conflict(id) do update set public=false,file_size_limit=10485760;
drop policy if exists song_files_read on storage.objects;
create policy song_files_read on storage.objects for select to authenticated
using(bucket_id='song-files' and (storage.foldername(name))[1]=auth.uid()::text and auth.jwt()->>'client_id' is null);
drop policy if exists song_files_insert on storage.objects;
create policy song_files_insert on storage.objects for insert to authenticated
with check(bucket_id='song-files' and (storage.foldername(name))[1]=auth.uid()::text and auth.jwt()->>'client_id' is null);
drop policy if exists song_files_delete on storage.objects;
create policy song_files_delete on storage.objects for delete to authenticated
using(bucket_id='song-files' and (storage.foldername(name))[1]=auth.uid()::text and auth.jwt()->>'client_id' is null);
