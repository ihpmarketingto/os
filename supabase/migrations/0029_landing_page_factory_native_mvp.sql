-- IHP OS — Phase 4 native Landing Page Factory MVP.
--
-- Extends the existing governance workflow with reusable native templates,
-- exact version tracking, client-safe source references, performance
-- records, and version-aware approvals / QA / deployments.

create table public.landing_page_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  category text not null default 'offer_landing_page' check (category in ('offer_landing_page', 'lead_gen', 'event_registration', 'product_launch')),
  source text not null default 'native' check (source in ('native', 'cloned', 'imported')),
  cloned_from_template_id uuid references public.landing_page_templates (id) on delete set null,
  template_key text not null,
  structure jsonb not null default '[]'::jsonb,
  defaults jsonb not null default '{}'::jsonb,
  preview_config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index landing_page_templates_org_slug_idx
  on public.landing_page_templates (organisation_id, slug)
  where deleted_at is null;

create table public.landing_page_versions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  landing_page_project_id uuid not null references public.landing_page_projects (id) on delete cascade,
  template_id uuid references public.landing_page_templates (id) on delete set null,
  template_key text not null,
  template_name text not null,
  version_number integer not null check (version_number > 0),
  version_name text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'published', 'changes_requested', 'archived')),
  title text not null,
  slug text not null,
  subdomain text,
  domain text,
  theme_settings jsonb not null default '{}'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  form_settings jsonb not null default '{}'::jsonb,
  tracking_settings jsonb not null default '{}'::jsonb,
  seo_settings jsonb not null default '{}'::jsonb,
  social_settings jsonb not null default '{}'::jsonb,
  asset_slots jsonb not null default '[]'::jsonb,
  source_context jsonb not null default '{}'::jsonb,
  validation_results jsonb not null default '[]'::jsonb,
  leakage_check_passed boolean not null default false,
  source_ai_run_id uuid references public.ai_runs (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on column public.landing_page_versions.validation_results is 'Array of {scope, severity, message}. Used for leakage, QA and publish readiness checks.';
comment on column public.landing_page_versions.asset_slots is 'Array of selected image slots. Each slot stores document and/or creative asset IDs for version-safe previews.';
comment on column public.landing_page_versions.source_context is 'JSON payload of selected client-safe claims, audiences, restrictions and proof references used to generate this exact version.';

create unique index landing_page_versions_project_version_idx
  on public.landing_page_versions (landing_page_project_id, version_number)
  where deleted_at is null;

create table public.landing_page_performance_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  landing_page_project_id uuid not null references public.landing_page_projects (id) on delete cascade,
  landing_page_version_id uuid references public.landing_page_versions (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  experiment_id uuid references public.experiments (id) on delete set null,
  metric_date date not null,
  visits integer not null default 0 check (visits >= 0),
  leads integer not null default 0 check (leads >= 0),
  qualified_leads integer not null default 0 check (qualified_leads >= 0),
  bookings integer not null default 0 check (bookings >= 0),
  conversion_rate numeric(6, 4),
  revenue numeric(10, 2) not null default 0,
  verified_learning text,
  source text not null default 'manual' check (source in ('manual', 'campaign_metrics', 'experiment', 'import')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.landing_page_projects
  add column project_id uuid references public.projects (id) on delete set null,
  add column draft_version_id uuid,
  add column submitted_version_id uuid,
  add column published_version_id uuid;

alter table public.landing_page_projects
  add constraint landing_page_projects_draft_version_id_fkey
    foreign key (draft_version_id) references public.landing_page_versions (id) on delete set null,
  add constraint landing_page_projects_submitted_version_id_fkey
    foreign key (submitted_version_id) references public.landing_page_versions (id) on delete set null,
  add constraint landing_page_projects_published_version_id_fkey
    foreign key (published_version_id) references public.landing_page_versions (id) on delete set null;

alter table public.approvals
  add column landing_page_version_id uuid references public.landing_page_versions (id) on delete set null;

alter table public.qa_runs
  add column landing_page_version_id uuid references public.landing_page_versions (id) on delete set null;

alter table public.deployments
  add column landing_page_version_id uuid references public.landing_page_versions (id) on delete set null,
  add column deployment_kind text not null default 'publish' check (deployment_kind in ('publish', 'rollback'));

alter table public.landing_page_templates enable row level security;
alter table public.landing_page_versions enable row level security;
alter table public.landing_page_performance_records enable row level security;

create policy "lpf.read governs templates"
  on public.landing_page_templates for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'read'));

create policy "lpf.update manages templates"
  on public.landing_page_templates for all
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update'))
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update'));

create policy "lpf.read governs versions"
  on public.landing_page_versions for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'read', client_id));

create policy "lpf.update manages versions"
  on public.landing_page_versions for all
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update', client_id))
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update', client_id));

create policy "lpf.read governs performance records"
  on public.landing_page_performance_records for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'read', client_id));

create policy "lpf.update manages performance records"
  on public.landing_page_performance_records for all
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update', client_id))
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'landing_page_factory', 'update', client_id));
