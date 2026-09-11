-- IHP OS — ads depth. Creative variants as first-class records, per-creative
-- performance, the testing matrix, and the optimisation log.
--
-- Design note: creative-level performance reuses campaign_metrics with a
-- nullable ad_creative_id rather than a parallel table. Channel rollups keep
-- working unchanged, and the same tested summary function serves both the
-- channel dashboard and per-creative ranking.

create table public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  /* Variants that test the same idea share a concept, so results can be read
     per concept as well as per variant. */
  concept text not null,
  variant_label text not null default 'A',
  name text not null,
  channel text not null default 'meta_ads' check (channel in ('meta_ads', 'google_ads', 'social', 'other')),
  format text not null default 'static' check (format in ('static', 'image', 'carousel', 'video', 'ugc_video', 'story')),
  /* The audience this variant is being tested against: the other axis of the
     testing matrix. */
  audience text,
  primary_text text,
  headline text,
  description text,
  cta text,
  /* The produced asset, and the Content Studio item that carries its approval
     trail. Creative should not go live without a human review. */
  asset_document_id uuid references public.documents (id) on delete set null,
  content_item_id uuid references public.content_items (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'live', 'paused', 'retired')),
  launched_at timestamptz,
  retired_at timestamptz,
  fatigue_flagged_at timestamptz,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index ad_creatives_org_client_idx on public.ad_creatives (organisation_id, client_id);
create index ad_creatives_concept_idx on public.ad_creatives (organisation_id, concept);

-- Per-creative metrics ride on the existing channel metrics table.
alter table public.campaign_metrics
  add column ad_creative_id uuid references public.ad_creatives (id) on delete cascade;

create index campaign_metrics_creative_idx on public.campaign_metrics (ad_creative_id) where ad_creative_id is not null;

-- What changed, why, and what happened — the record that makes paid media
-- reporting defensible and stops the same experiment being run twice.
create table public.optimisation_log (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  ad_creative_id uuid references public.ad_creatives (id) on delete set null,
  change_type text not null check (change_type in (
    'budget', 'audience', 'creative', 'bid', 'targeting', 'placement', 'pause', 'scale', 'other'
  )),
  description text not null,
  rationale text,
  expected_outcome text,
  observed_outcome text,
  decision text check (decision in ('scale', 'iterate', 'kill', 'hold')),
  changed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  changed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index optimisation_log_org_client_idx on public.optimisation_log (organisation_id, client_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- RLS: both ride on the campaigns permission, consistent with paid media.
-- ---------------------------------------------------------------------------
alter table public.ad_creatives enable row level security;
alter table public.optimisation_log enable row level security;

create policy "internal members with campaigns.read see ad creatives"
  on public.ad_creatives for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'read', client_id));

create policy "campaigns.create required to add ad creatives"
  on public.ad_creatives for insert
  with check (private.has_permission(organisation_id, 'campaigns', 'create', client_id));

create policy "campaigns.update required to edit ad creatives"
  on public.ad_creatives for update
  using (private.has_permission(organisation_id, 'campaigns', 'update', client_id));

create policy "internal members with campaigns.read see the optimisation log"
  on public.optimisation_log for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'read', client_id));

create policy "campaigns.update required to log optimisations"
  on public.optimisation_log for insert
  with check (private.has_permission(organisation_id, 'campaigns', 'update', client_id));

create policy "campaigns.update required to record outcomes"
  on public.optimisation_log for update
  using (private.has_permission(organisation_id, 'campaigns', 'update', client_id));
