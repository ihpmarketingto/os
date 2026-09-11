-- IHP OS — SEO depth. Keywords, their rank history, and Google Business
-- Profile performance for local clients.
--
-- Rankings are stored as one reading per keyword per day rather than a
-- current-position column, because the question worth answering is never
-- "where does this rank" but "which way is it moving". A not-ranking reading
-- is stored with a null position, which is different from position 0 and
-- different from having no reading at all.

create table public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  keyword text not null,
  /* Local intent needs the place it is measured from: "botox brampton"
     ranks differently in Brampton than in Mississauga. */
  location text,
  intent text check (intent in ('informational', 'commercial', 'transactional', 'navigational', 'local')),
  target_url text,
  search_volume integer,
  difficulty integer check (difficulty between 0 and 100),
  is_priority boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- One row per keyword per place. Coalesced so two national rows for the same
-- keyword collide, which is the duplicate we actually want to stop.
create unique index seo_keywords_unique_idx
  on public.seo_keywords (organisation_id, client_id, lower(keyword), coalesce(lower(location), ''))
  where deleted_at is null;

create index seo_keywords_client_idx on public.seo_keywords (organisation_id, client_id);

create table public.seo_rankings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  keyword_id uuid not null references public.seo_keywords (id) on delete cascade,
  recorded_on date not null,
  /* Null means measured and not ranking, which is not the same as position 0
     and not the same as no reading for that day. */
  position integer check (position > 0),
  /* Which page actually ranked, which is how you catch the wrong URL winning. */
  ranking_url text,
  created_at timestamptz not null default now()
);

comment on column public.seo_rankings.position is
  'Null means measured and not ranking. Never store 0 or a sentinel like 100 for "not found": it corrupts every average taken over this column.';

-- One reading per keyword per day. Re-importing a file must correct the day,
-- not append a second reading for it.
create unique index seo_rankings_daily_idx on public.seo_rankings (keyword_id, recorded_on);
create index seo_rankings_lookup_idx on public.seo_rankings (organisation_id, recorded_on desc);

create table public.gbp_metrics (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  profile_views integer not null default 0,
  search_impressions integer not null default 0,
  calls integer not null default 0,
  direction_requests integer not null default 0,
  website_clicks integer not null default 0,
  bookings integer not null default 0,
  reviews_total integer,
  new_reviews integer,
  average_rating numeric(2, 1) check (average_rating between 0 and 5),
  created_at timestamptz not null default now(),
  constraint gbp_period_is_ordered check (period_end >= period_start)
);

create unique index gbp_metrics_period_idx on public.gbp_metrics (client_id, period_start, period_end);

-- ---------------------------------------------------------------------------
-- RLS. SEO work rides on the campaigns permission, consistent with the other
-- channel modules.
-- ---------------------------------------------------------------------------
alter table public.seo_keywords enable row level security;
alter table public.seo_rankings enable row level security;
alter table public.gbp_metrics enable row level security;

create policy "campaigns.read required to see keywords"
  on public.seo_keywords for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'read', client_id));

create policy "campaigns.create required to add keywords"
  on public.seo_keywords for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'create', client_id));

create policy "campaigns.update required to edit keywords"
  on public.seo_keywords for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'update', client_id));

-- Rankings inherit their keyword's client, so the policies join through it
-- rather than duplicating client_id onto every reading.
create policy "readings follow their keyword"
  on public.seo_rankings for select
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.seo_keywords k
      where k.id = keyword_id and private.has_permission(k.organisation_id, 'campaigns', 'read', k.client_id)
    )
  );

create policy "campaigns.create required to import readings"
  on public.seo_rankings for insert
  with check (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.seo_keywords k
      where k.id = keyword_id and private.has_permission(k.organisation_id, 'campaigns', 'create', k.client_id)
    )
  );

create policy "campaigns.update required to correct readings"
  on public.seo_rankings for update
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.seo_keywords k
      where k.id = keyword_id and private.has_permission(k.organisation_id, 'campaigns', 'update', k.client_id)
    )
  );

create policy "campaigns.read required to see GBP metrics"
  on public.gbp_metrics for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'read', client_id));

create policy "campaigns.create required to add GBP metrics"
  on public.gbp_metrics for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'create', client_id));

create policy "campaigns.update required to edit GBP metrics"
  on public.gbp_metrics for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'update', client_id));
