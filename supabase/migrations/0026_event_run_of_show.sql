-- IHP OS — Event run of show and sponsors.
--
-- An event needs two things the events table did not hold: a timed schedule
-- somebody can run the day from, and the sponsor commitments that have to be
-- delivered before the invoice is fair to send.

create table public.event_segments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  /* Minutes from the event's start time rather than a wall-clock timestamp,
     so moving the event by an hour does not mean rewriting every segment. */
  starts_after_minutes integer not null default 0 check (starts_after_minutes >= 0),
  duration_minutes integer not null default 15 check (duration_minutes > 0),
  title text not null,
  owner_name text,
  owner_id uuid references public.profiles (id),
  location text,
  notes text,
  /* Ticked off on the day. */
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.event_segments.starts_after_minutes is
  'Offset from the event start, not a timestamp. Shifting the event shifts the whole run of show for free.';

create index event_segments_order_idx on public.event_segments (event_id, starts_after_minutes);

create table public.event_sponsors (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  tier text not null default 'supporting' check (tier in ('title', 'presenting', 'supporting', 'in_kind', 'media')),
  contact_name text,
  contact_email text,
  /* Cash committed. In-kind sponsors carry zero here and describe what they
     gave in kind, so the two never get added together by accident. */
  cash_amount numeric(12, 2) not null default 0 check (cash_amount >= 0),
  in_kind_description text,
  status text not null default 'prospect' check (status in ('prospect', 'pitched', 'committed', 'paid', 'declined')),
  invoiced_at date,
  paid_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index event_sponsors_event_idx on public.event_sponsors (event_id);

create table public.event_sponsor_deliverables (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  sponsor_id uuid not null references public.event_sponsors (id) on delete cascade,
  description text not null,
  due_date date,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index event_sponsor_deliverables_sponsor_idx on public.event_sponsor_deliverables (sponsor_id);

-- ---------------------------------------------------------------------------
-- RLS. Events ride on the campaigns permission, so their children do too.
-- Each policy joins through to the event rather than duplicating client_id.
-- ---------------------------------------------------------------------------
alter table public.event_segments enable row level security;
alter table public.event_sponsors enable row level security;
alter table public.event_sponsor_deliverables enable row level security;

create policy "segments follow their event"
  on public.event_segments for select
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.events e
      where e.id = event_id and private.has_permission(e.organisation_id, 'campaigns', 'read', e.client_id)
    )
  );

create policy "campaigns.create required to add segments"
  on public.event_segments for insert
  with check (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.events e
      where e.id = event_id and private.has_permission(e.organisation_id, 'campaigns', 'create', e.client_id)
    )
  );

create policy "campaigns.update required to edit segments"
  on public.event_segments for update
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.events e
      where e.id = event_id and private.has_permission(e.organisation_id, 'campaigns', 'update', e.client_id)
    )
  );

create policy "sponsors follow their event"
  on public.event_sponsors for select
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.events e
      where e.id = event_id and private.has_permission(e.organisation_id, 'campaigns', 'read', e.client_id)
    )
  );

create policy "campaigns.create required to add sponsors"
  on public.event_sponsors for insert
  with check (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.events e
      where e.id = event_id and private.has_permission(e.organisation_id, 'campaigns', 'create', e.client_id)
    )
  );

create policy "campaigns.update required to edit sponsors"
  on public.event_sponsors for update
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.events e
      where e.id = event_id and private.has_permission(e.organisation_id, 'campaigns', 'update', e.client_id)
    )
  );

create policy "deliverables follow their sponsor"
  on public.event_sponsor_deliverables for select
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1
      from public.event_sponsors s
      join public.events e on e.id = s.event_id
      where s.id = sponsor_id and private.has_permission(e.organisation_id, 'campaigns', 'read', e.client_id)
    )
  );

create policy "campaigns.create required to add deliverables"
  on public.event_sponsor_deliverables for insert
  with check (
    private.is_internal_member(organisation_id)
    and exists (
      select 1
      from public.event_sponsors s
      join public.events e on e.id = s.event_id
      where s.id = sponsor_id and private.has_permission(e.organisation_id, 'campaigns', 'create', e.client_id)
    )
  );

create policy "campaigns.update required to edit deliverables"
  on public.event_sponsor_deliverables for update
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1
      from public.event_sponsors s
      join public.events e on e.id = s.event_id
      where s.id = sponsor_id and private.has_permission(e.organisation_id, 'campaigns', 'update', e.client_id)
    )
  );
