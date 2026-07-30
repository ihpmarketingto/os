-- IHP OS — Creative Studio, stage 3. Reusable templates, carousels, and the
-- schema support for resizing one design into every placement.
--
-- Two changes drive the rest:
--   1. A template is a starting point, not client work, so it can sit in a
--      shared library with no client attached. Client work still must name
--      its client, enforced by a check rather than left to the application.
--   2. A carousel is a set of sibling designs sharing a group id, so every
--      slide reuses the editor, the export path and the RLS already in place.

alter table public.designs
  alter column client_id drop not null;

alter table public.designs
  add constraint client_work_names_its_client
    check (is_template or client_id is not null);

comment on constraint client_work_names_its_client on public.designs is
  'Only templates may sit in the shared library. Anything that is real client work carries its client_id.';

alter table public.designs
  /* Groups the slides of one carousel. Null for a single-frame design. */
  add column carousel_group_id uuid,
  add column slide_index integer,
  /* Free-text grouping for the template library, e.g. "Offer", "Testimonial". */
  add column template_category text,
  /* Where a design came from, so a template's usage is visible. */
  add column source_design_id uuid references public.designs (id) on delete set null;

alter table public.designs
  add constraint carousel_slides_are_ordered
    check ((carousel_group_id is null) = (slide_index is null));

comment on constraint carousel_slides_are_ordered on public.designs is
  'A slide belongs to a carousel and has a position, or it is neither.';

create unique index designs_carousel_slide_idx
  on public.designs (carousel_group_id, slide_index)
  where carousel_group_id is not null and deleted_at is null;

create index designs_source_idx on public.designs (source_design_id) where source_design_id is not null;

-- ---------------------------------------------------------------------------
-- RLS: the existing policies assumed client_id was always present. Shared
-- templates have none, so fall back to internal membership for those, the
-- same shape creative_assets already uses for its shared library.
-- ---------------------------------------------------------------------------
drop policy "internal members with content.read see designs" on public.designs;
drop policy "content.create required to add designs" on public.designs;
drop policy "content.update required to edit designs" on public.designs;

create policy "internal members with content.read see designs"
  on public.designs for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'content', 'read', client_id))
  );

create policy "content.create required to add designs"
  on public.designs for insert
  with check (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'content', 'create', client_id))
  );

create policy "content.update required to edit designs"
  on public.designs for update
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'content', 'update', client_id))
  );
