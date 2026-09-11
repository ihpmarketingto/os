-- IHP OS — Phase 1: Supabase Storage bucket + RLS for client documents.
-- Path convention: {organisation_id}/{client_id | 'general'}/{uuid}-{filename}
-- so storage RLS can be checked from the path alone without a join back to
-- the documents table (storage.objects has no FK to app tables).

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Direct bucket reads are internal-only. Client portal downloads never hit
-- storage.objects RLS directly — the /api/documents/[id]/download route
-- checks the `documents` table (which enforces the client_visible flag)
-- with the requester's own session first, then mints a signed URL with the
-- service-role client only after that check passes.
create policy "internal org members can read their org's documents bucket objects"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and private.is_internal_member((split_part(name, '/', 1))::uuid)
  );

create policy "internal org members can upload into their org's documents bucket path"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and private.is_internal_member((split_part(name, '/', 1))::uuid)
  );

create policy "internal org members can delete their org's documents bucket objects"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and private.is_internal_member((split_part(name, '/', 1))::uuid)
  );
