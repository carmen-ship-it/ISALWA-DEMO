-- ISALWA Architect — Real Document Uploads: Supabase Storage bucket + RLS
--
-- Run AFTER 001_pilot_persistence.sql (needs public.architect_is_member()).
-- Safe to re-run.
--
-- Storage layout: {workspaceId}/{assetId}/{fileName}
-- RLS mirrors the existing architect_workspaces pattern — a user may only
-- read/write objects whose first path segment is a workspace they belong to.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'architect-documents',
  'architect-documents',
  false,
  26214400, -- 25MB — matches KNOWLEDGE_UPLOAD_MAX_BYTES client-side guardrail
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/heic',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- RLS — members of a workspace may read/write/delete objects under
-- that workspace's folder prefix only.
-- ---------------------------------------------------------------------------
drop policy if exists architect_documents_select on storage.objects;
create policy architect_documents_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'architect-documents'
    and public.architect_is_member((storage.foldername(name))[1])
  );

drop policy if exists architect_documents_insert on storage.objects;
create policy architect_documents_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'architect-documents'
    and public.architect_is_member((storage.foldername(name))[1])
  );

drop policy if exists architect_documents_update on storage.objects;
create policy architect_documents_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'architect-documents'
    and public.architect_is_member((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'architect-documents'
    and public.architect_is_member((storage.foldername(name))[1])
  );

drop policy if exists architect_documents_delete on storage.objects;
create policy architect_documents_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'architect-documents'
    and public.architect_is_member((storage.foldername(name))[1])
  );
