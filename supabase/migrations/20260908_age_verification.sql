-- Age verification workflow. The identity document itself stays in a private bucket.
alter table public.users
  drop constraint if exists users_status_check;

alter table public.users
  add constraint users_status_check check (
    status = any (array['pending_verification'::text, 'active'::text, 'blocked'::text, 'rejected'::text])
  );

alter table public.users
  add column if not exists verification_document_path text,
  add column if not exists verification_submitted_at timestamp with time zone,
  add column if not exists verification_reviewed_at timestamp with time zone,
  add column if not exists verification_reviewed_by uuid references auth.users(id),
  add column if not exists verification_rejection_reason text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity-documents', 'identity-documents', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own identity document" on storage.objects;
create policy "Users can upload their own identity document" on storage.objects for insert to authenticated
with check (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users and staff can read identity documents" on storage.objects;
create policy "Users and staff can read identity documents" on storage.objects for select to authenticated
using (bucket_id = 'identity-documents' and ((storage.foldername(name))[1] = auth.uid()::text or exists (select 1 from public.users where users.id = auth.uid() and users.role in ('ADMIN', 'MODERATOR'))));

drop policy if exists "Staff can delete identity documents" on storage.objects;
create policy "Staff can delete identity documents" on storage.objects for delete to authenticated
using (bucket_id = 'identity-documents' and exists (select 1 from public.users where users.id = auth.uid() and users.role in ('ADMIN', 'MODERATOR')));