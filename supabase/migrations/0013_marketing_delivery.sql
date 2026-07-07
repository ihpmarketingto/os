-- IHP OS — Phase 3: marketing delivery. Campaigns, channel metrics,
-- reports, CRO experiments, PR/influencer foundations, events.
--
-- campaign_metrics is deliberately channel-agnostic: one row per
-- (client, channel, date) slice with the universal counters, and an
-- `extras` jsonb for channel-specific values. CSV import is the supported
-- data path until the Meta/Google/Klaviyo API adapters activate.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  objective text,
  offer text,
  audience text,
  channels text[] not null default '{}',
  budget numeric(10, 2),
  kpis text,
  start_date date,
  end_date date,
  status text not null default 'planning' check (status in (
    'planning', 'awaiting_approval', 'ready_to_launch', 'live', 'optimising', 'paused', 'complete', 'archived'
  )),
  owner_id uuid references public.profiles (id),
  results text,
  learnings text,
  client_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index campaigns_org_status_idx on public.campaigns (organisation_id, status);

create table public.campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  channel text not null check (channel in ('meta_ads', 'google_ads', 'seo', 'email', 'social', 'other')),
  metric_date date not null,
  spend numeric(10, 2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  leads integer not null default 0,
  conversions integer not null default 0,
  revenue numeric(10, 2) not null default 0,
  extras jsonb not null default '{}'::jsonb,
  source text not null default 'csv_import' check (source in ('csv_import', 'manual', 'api')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index campaign_metrics_org_client_channel_date_idx
  on public.campaign_metrics (organisation_id, client_id, channel, metric_date);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  period_start date not null,
  period_end date not null,
  executive_summary text,
  key_wins text,
  risks text,
  next_month_plan text,
  status text not null default 'draft' check (status in ('draft', 'internal_review', 'client_review', 'published', 'archived')),
  created_by uuid references public.profiles (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  hypothesis text not null,
  page_url text,
  variant_description text,
  success_metric text,
  start_date date,
  end_date date,
  status text not null default 'planned' check (status in ('planned', 'running', 'complete', 'abandoned')),
  result text,
  statistical_confidence text,
  decision text check (decision in ('ship', 'revert', 'iterate')),
  learnings text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.influencers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  name text not null,
  handle text,
  platform text,
  followers integer,
  email text,
  status text not null default 'prospect' check (status in ('prospect', 'contacted', 'negotiating', 'active', 'past')),
  compensation text,
  usage_rights text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.media_contacts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  outlet text,
  beat text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.outreach (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  contact_type text not null check (contact_type in ('influencer', 'media')),
  influencer_id uuid references public.influencers (id) on delete cascade,
  media_contact_id uuid references public.media_contacts (id) on delete cascade,
  subject text not null,
  status text not null default 'drafted' check (status in ('drafted', 'sent', 'responded', 'declined', 'confirmed')),
  sent_at timestamptz,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  name text not null,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  ticket_link text,
  status text not null default 'planning' check (status in ('planning', 'on_sale', 'live', 'complete', 'cancelled')),
  target_attendance integer,
  tickets_sold integer not null default 0,
  ticket_revenue numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  email text,
  ticket_type text,
  checked_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.campaigns enable row level security;
alter table public.campaign_metrics enable row level security;
alter table public.reports enable row level security;
alter table public.experiments enable row level security;
alter table public.influencers enable row level security;
alter table public.media_contacts enable row level security;
alter table public.outreach enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;

create policy "internal members with campaigns.read see accessible campaigns"
  on public.campaigns for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'read', client_id));

create policy "client portal members see client-visible campaigns"
  on public.campaigns for select
  using (private.is_client_portal_member(organisation_id) and private.can_access_client(organisation_id, client_id) and client_visible = true);

create policy "campaigns.create required to add campaigns"
  on public.campaigns for insert
  with check (private.has_permission(organisation_id, 'campaigns', 'create', client_id));

create policy "campaigns.update required to edit campaigns"
  on public.campaigns for update
  using (private.has_permission(organisation_id, 'campaigns', 'update', client_id));

create policy "internal members with campaigns.read see metrics"
  on public.campaign_metrics for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'read', client_id));

create policy "campaigns.update required to import metrics"
  on public.campaign_metrics for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'update', client_id));

create policy "internal members with reports.read see reports"
  on public.reports for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'reports', 'read', client_id));

create policy "client portal members read their published reports"
  on public.reports for select
  using (
    private.is_client_portal_member(organisation_id)
    and private.can_access_client(organisation_id, client_id)
    and status = 'published'
  );

create policy "reports.create required to draft reports"
  on public.reports for insert
  with check (private.has_permission(organisation_id, 'reports', 'create', client_id));

create policy "internal members with reports.read can progress reports"
  on public.reports for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'reports', 'read', client_id));

create policy "campaigns permission governs experiments"
  on public.experiments for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'read', client_id));

create policy "campaigns.create required to add experiments"
  on public.experiments for insert
  with check (private.has_permission(organisation_id, 'campaigns', 'create', client_id));

create policy "campaigns.update required to edit experiments"
  on public.experiments for update
  using (private.has_permission(organisation_id, 'campaigns', 'update', client_id));

create policy "crm.read governs influencers"
  on public.influencers for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'read'));

create policy "crm.create required to add influencers"
  on public.influencers for insert
  with check (private.has_permission(organisation_id, 'crm', 'create'));

create policy "crm.update required to edit influencers"
  on public.influencers for update
  using (private.has_permission(organisation_id, 'crm', 'update'));

create policy "crm.read governs media contacts"
  on public.media_contacts for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'read'));

create policy "crm.create required to add media contacts"
  on public.media_contacts for insert
  with check (private.has_permission(organisation_id, 'crm', 'create'));

create policy "crm.update required to edit media contacts"
  on public.media_contacts for update
  using (private.has_permission(organisation_id, 'crm', 'update'));

create policy "crm.read governs outreach"
  on public.outreach for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'read'));

create policy "crm.create required to log outreach"
  on public.outreach for insert
  with check (private.has_permission(organisation_id, 'crm', 'create'));

create policy "crm.update required to edit outreach"
  on public.outreach for update
  using (private.has_permission(organisation_id, 'crm', 'update'));

create policy "campaigns permission governs events"
  on public.events for select
  using (private.is_internal_member(organisation_id) and (client_id is null or private.has_permission(organisation_id, 'campaigns', 'read', client_id)));

create policy "campaigns.create required to add events"
  on public.events for insert
  with check (private.is_internal_member(organisation_id) and (client_id is null or private.has_permission(organisation_id, 'campaigns', 'create', client_id)));

create policy "campaigns.update required to edit events"
  on public.events for update
  using (private.is_internal_member(organisation_id) and (client_id is null or private.has_permission(organisation_id, 'campaigns', 'update', client_id)));

create policy "event attendees follow their event's access"
  on public.event_attendees for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_attendees.event_id
        and private.is_internal_member(e.organisation_id)
        and (e.client_id is null or private.has_permission(e.organisation_id, 'campaigns', 'read', e.client_id))
    )
  );

create policy "campaigns.update required to manage attendees"
  on public.event_attendees for insert
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_attendees.event_id
        and private.is_internal_member(e.organisation_id)
        and (e.client_id is null or private.has_permission(e.organisation_id, 'campaigns', 'update', e.client_id))
    )
  );
