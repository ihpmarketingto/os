-- IHP OS — Phase 4 follow-up: reusable component payloads and source links.
--
-- The original reusable_components table stored review metadata only. To
-- actually build native templates from approved sections, the library also
-- needs the exact section payload and the landing page version it came from.

alter table public.reusable_components
  add column source_landing_page_version_id uuid references public.landing_page_versions (id) on delete set null,
  add column source_section_id text,
  add column section_payload jsonb not null default '{}'::jsonb;

comment on column public.reusable_components.source_landing_page_version_id is
  'Exact landing page version this reusable component was promoted from, when the component came from a native IHP landing page draft.';
comment on column public.reusable_components.source_section_id is
  'Stable section id inside the source landing page version.';
comment on column public.reusable_components.section_payload is
  'Normalized landing page section JSON payload used to assemble reusable native templates.';

alter table public.reusable_components drop constraint if exists reusable_components_category_check;
alter table public.reusable_components add constraint reusable_components_category_check check (category in (
  'hero', 'navigation', 'results', 'offer', 'promise', 'pricing', 'reviews', 'testimonials', 'before_after',
  'product', 'booking', 'event', 'speaker', 'faq', 'form', 'trust_bar', 'process', 'cta',
  'final_cta', 'countdown', 'location', 'video', 'footer'
));
