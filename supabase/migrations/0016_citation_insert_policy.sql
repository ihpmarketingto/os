-- IHP OS — Phase 5 fix: ai_source_citations had a SELECT policy but no
-- INSERT policy, so citation writes were silently rejected by RLS. Users
-- may log citations only against their own runs in their own organisation.

create policy "org members can log citations for their own ai runs"
  on public.ai_source_citations for insert
  with check (
    exists (
      select 1
      from public.ai_runs r
      where r.id = ai_source_citations.ai_run_id
        and r.user_id = auth.uid()
        and private.is_org_member(r.organisation_id)
    )
  );
