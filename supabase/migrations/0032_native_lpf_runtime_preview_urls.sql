-- IHP OS — Phase 4 follow-up: native runtime preview URLs need a stable,
-- opaque share token so exact landing page versions can be reviewed without
-- exposing the authenticated app shell.

alter table public.landing_page_projects
  add column preview_share_token uuid not null default gen_random_uuid();

comment on column public.landing_page_projects.preview_share_token is
  'Opaque token used to share the current exact landing-page preview URL without exposing internal auth.';

create unique index landing_page_projects_preview_share_token_idx
  on public.landing_page_projects (preview_share_token)
  where deleted_at is null;
