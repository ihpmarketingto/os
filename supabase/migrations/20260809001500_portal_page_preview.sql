-- IHP OS — Phase 4 follow-up: client portal members may read a landing page
-- project's name and preview link ONLY while it is waiting on their
-- approval decision (or after they approved it). Internal states
-- (planning/generating/qa/internal_approval) stay invisible to clients.

create policy "client portal members see pages awaiting or past their approval"
  on public.landing_page_projects for select
  using (
    private.is_client_portal_member(organisation_id)
    and private.can_access_client(organisation_id, client_id)
    and status in ('client_approval', 'approved_to_publish', 'published')
  );
