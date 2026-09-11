-- IHP OS — Section 27A foundation: lead attribution fields, bookings, and
-- the expanded integration provider list. The full nurture/SMS/Meta-funnel
-- workflow engine ships with Phase 3/6; these columns exist now so every
-- lead captured from day one carries first-touch attribution and no
-- backfill is needed later.

-- ---------------------------------------------------------------------------
-- Lead attribution (spec 27A: track every lead from first touch to revenue)
-- ---------------------------------------------------------------------------
alter table public.leads
  add column utm_source text,
  add column utm_medium text,
  add column utm_campaign text,
  add column utm_content text,
  add column utm_term text,
  add column meta_campaign text,
  add column meta_ad_set text,
  add column meta_ad text,
  add column click_id text,
  add column landing_page text,
  add column form_submitted text,
  add column lead_magnet text,
  add column first_response_at timestamptz,
  add column sms_consent boolean not null default false,
  add column sms_consent_captured_at timestamptz,
  add column sms_opted_out_at timestamptz;

comment on column public.leads.sms_consent is 'SMS workflows (27A) may never message a lead without this. Opt-out timestamp wins over consent.';

create index leads_org_utm_source_idx on public.leads (organisation_id, utm_source) where utm_source is not null;

-- ---------------------------------------------------------------------------
-- Bookings (spec 27A: booking and show-up workflows)
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  source text not null default 'internal' check (source in ('calendly', 'google_calendar', 'gohighlevel', 'internal')),
  external_ref text,
  title text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer,
  status text not null default 'booked' check (status in (
    'booked', 'confirmed', 'attended', 'rescheduled', 'cancelled', 'no_show'
  )),
  deposit_status text not null default 'not_required' check (deposit_status in ('not_required', 'pending', 'paid', 'refunded')),
  deposit_amount numeric(10, 2),
  deposit_provider text check (deposit_provider in ('stripe', 'square')),
  outcome text check (outcome in ('closed_won', 'closed_lost')),
  revenue numeric(10, 2),
  owner_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index bookings_org_scheduled_idx on public.bookings (organisation_id, scheduled_at);

alter table public.bookings enable row level security;

create policy "internal members with crm.read can view bookings for accessible clients"
  on public.bookings for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members with crm.create can add bookings"
  on public.bookings for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'create'));

create policy "internal members with crm.update can edit bookings"
  on public.bookings for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'update'));

-- ---------------------------------------------------------------------------
-- Expanded integration provider list (spec 27A required integrations)
-- ---------------------------------------------------------------------------
alter table public.integration_connections drop constraint integration_connections_provider_check;
alter table public.integration_connections add constraint integration_connections_provider_check check (provider in (
  'openai', 'gemini', 'anthropic', 'google_workspace', 'github', 'stripe',
  'resend', 'sendgrid', 'meta_ads', 'google_ads', 'klaviyo',
  'vercel', 'netlify', 'cloudflare_pages',
  'gohighlevel', 'meta_pixel', 'meta_conversions_api', 'ga4', 'gtm',
  'calendly', 'square', 'twilio', 'discord', 'zapier', 'n8n', 'quickbooks'
));

-- Per-client GoHighLevel role (spec 27A: Agency Owner decides per client).
alter table public.clients
  add column gohighlevel_mode text not null default 'not_used' check (gohighlevel_mode in (
    'source_of_truth', 'automation_engine', 'booking_layer', 'migration_source', 'not_used'
  ));
