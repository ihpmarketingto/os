-- IHP OS — Phase 4: Landing Page Factory. Build Library, reusable
-- components, brief builder, page projects, QA runs, deployments.
--
-- Code isolation rule (spec section 22): generated page code never lives in
-- this repository — these tables track external repositories, branches and
-- deployment URLs. Production publishing is blocked unless the latest QA
-- run passes and the client approval is recorded; both gates are enforced
-- in the application actions and mirrored by the status constraints here.

create table public.build_library_projects (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  project_name text not null,
  repository_url text,
  branch text,
  deployment_url text,
  replit_url text,
  source_provider text not null default 'manual' check (source_provider in ('github', 'replit', 'manual')),
  technology_stack text[] not null default '{}',
  page_type text,
  offer_type text,
  funnel_type text,
  industry text,
  target_audience text,
  conversion_goal text,
  traffic_source text,
  screenshot_document_id uuid references public.documents (id) on delete set null,
  design_style_tags text[] not null default '{}',
  components_detected text[] not null default '{}',
  tracking_detected text[] not null default '{}',
  form_system text,
  conversion_rate numeric(6, 4),
  leads integer,
  revenue numeric(10, 2),
  roas numeric(8, 2),
  learnings text,
  status text not null default 'imported' check (status in ('imported', 'reviewed', 'approved_for_reuse', 'restricted')),
  reuse_permitted boolean not null default false,
  client_restrictions text,
  asset_rights text,
  source_ownership text not null default 'IHP Marketing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.reusable_components (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  source_project_id uuid references public.build_library_projects (id) on delete set null,
  name text not null,
  category text not null check (category in (
    'hero', 'navigation', 'offer', 'pricing', 'reviews', 'testimonials', 'before_after',
    'product', 'booking', 'event', 'speaker', 'faq', 'form', 'trust_bar', 'cta',
    'countdown', 'location', 'video', 'footer'
  )),
  code_reference text,
  props_notes text,
  dependencies text,
  editable_fields text,
  preview_document_id uuid references public.documents (id) on delete set null,
  accessibility_notes text,
  analytics_events text,
  conversion_purpose text,
  client_restrictions text,
  approval_status text not null default 'pending_review' check (approval_status in ('pending_review', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.landing_page_briefs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  title text not null,
  offer text not null,
  product_service text,
  audience text,
  goal text,
  conversion_action text not null,
  main_cta text not null,
  secondary_cta text,
  traffic_source text,
  price text,
  promotion text,
  deadline date,
  location text,
  booking_link text,
  product_link text,
  ticket_link text,
  testimonials text,
  objections text,
  proof_points text,
  differentiators text,
  required_claims text,
  forbidden_claims text,
  required_disclaimer text,
  brand_direction text,
  reference_projects text,
  required_tracking text,
  required_integrations text,
  launch_date date,
  stakeholders text,
  approval_owner_id uuid references public.profiles (id),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.landing_page_projects (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  brief_id uuid not null references public.landing_page_briefs (id),
  name text not null,
  generation_mode text not null check (generation_mode in (
    'clone_and_adapt', 'build_from_components', 'build_from_strategy', 'improve_existing'
  )),
  reference_build_project_id uuid references public.build_library_projects (id) on delete set null,
  repository_url text,
  branch text,
  preview_url text,
  production_url text,
  status text not null default 'planning' check (status in (
    'planning', 'generating', 'preview', 'qa', 'internal_approval', 'client_approval',
    'approved_to_publish', 'published', 'archived'
  )),
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.qa_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  landing_page_project_id uuid not null references public.landing_page_projects (id) on delete cascade,
  run_by uuid references public.profiles (id),
  overall text not null check (overall in ('pass', 'warning', 'fail')),
  items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
comment on column public.qa_runs.items is 'Array of {check, result: pass|warning|fail, note}. The publish gate uses the latest run''s overall.';

create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  landing_page_project_id uuid not null references public.landing_page_projects (id) on delete cascade,
  environment text not null check (environment in ('preview', 'production')),
  provider text not null default 'manual' check (provider in ('vercel', 'netlify', 'cloudflare_pages', 'replit', 'manual')),
  url text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  triggered_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Landing pages join the approvals workflow (client sign-off in the portal).
alter table public.approvals drop constraint approvals_subject_type_check;
alter table public.approvals add constraint approvals_subject_type_check
  check (subject_type in ('content_item', 'document', 'report', 'landing_page'));

-- ---------------------------------------------------------------------------
-- RLS — everything rides on the landing_page_factory permission.
-- ---------------------------------------------------------------------------
alter table public.build_library_projects enable row level security;
alter table public.reusable_components enable row level security;
alter table public.landing_page_briefs enable row level security;
alter table public.landing_page_projects enable row level security;
alter table public.qa_runs enable row level security;
alter table public.deployments enable row level security;

create policy "lpf.read governs build library"
  on public.build_library_projects for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'read'));

create policy "lpf.update manages build library"
  on public.build_library_projects for all
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update'))
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update'));

create policy "lpf.read governs reusable components"
  on public.reusable_components for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'read'));

create policy "lpf.update manages reusable components"
  on public.reusable_components for all
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update'))
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update'));

create policy "lpf.read governs briefs for accessible clients"
  on public.landing_page_briefs for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'read', client_id));

create policy "lpf.update manages briefs"
  on public.landing_page_briefs for all
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update', client_id))
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update', client_id));

create policy "lpf.read governs page projects"
  on public.landing_page_projects for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'read', client_id));

create policy "lpf.update manages page projects"
  on public.landing_page_projects for all
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update', client_id))
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update', client_id));

create policy "lpf.read governs qa runs"
  on public.qa_runs for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'read'));

create policy "lpf.update records qa runs"
  on public.qa_runs for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update'));

create policy "lpf.read governs deployments"
  on public.deployments for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'read'));

create policy "lpf.update records deployments"
  on public.deployments for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update'));
