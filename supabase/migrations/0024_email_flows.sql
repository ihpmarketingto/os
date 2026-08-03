-- IHP OS — Email lifecycle flows.
--
-- A flow is a named sequence a contact walks through: welcome, nurture,
-- win-back, booking reminders. Steps are ordered and carry the delay since
-- the previous step, so the whole sequence can be read as a timeline rather
-- than a list.
--
-- Per-step figures are stored as an "as at" snapshot with the window they
-- cover, not as counters that get incremented. Re-importing a window
-- overwrites it, which means the numbers on screen always state the period
-- they describe instead of being an unlabelled running total.

create table public.email_flows (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  flow_type text not null default 'other' check (flow_type in (
    'welcome', 'nurture', 'win_back', 'post_purchase', 'abandoned_cart',
    're_engagement', 'booking_reminder', 'other'
  )),
  status text not null default 'draft' check (status in ('draft', 'live', 'paused', 'archived')),
  /* What puts someone into the flow, in plain words. */
  trigger_description text,
  /* What the flow is for, so a step can be judged against it. */
  goal text,
  /* Where it actually runs. The flow map documents it; it does not send it. */
  platform text,
  external_ref text,
  entered integer not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index email_flows_client_idx on public.email_flows (organisation_id, client_id);

create table public.email_flow_steps (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  flow_id uuid not null references public.email_flows (id) on delete cascade,
  step_index integer not null,
  name text not null,
  channel text not null default 'email' check (channel in ('email', 'sms')),
  /* Hours to wait after the previous step. Zero on the first step means it
     goes out immediately on entry. */
  delay_hours integer not null default 0 check (delay_hours >= 0),
  subject text,
  purpose text,
  /* Performance as at a stated window, overwritten on re-import. */
  stats_period_start date,
  stats_period_end date,
  sent integer not null default 0,
  delivered integer not null default 0,
  opens integer not null default 0,
  clicks integer not null default 0,
  unsubscribes integer not null default 0,
  conversions integer not null default 0,
  revenue numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Steps are ordered within their flow and the order is unique, so two steps
-- cannot silently occupy the same position in the sequence.
create unique index email_flow_steps_order_idx on public.email_flow_steps (flow_id, step_index);

comment on column public.email_flow_steps.delay_hours is
  'Wait since the previous step, not since flow entry. Cumulative timing is derived, so reordering steps does not require rewriting every delay.';

-- ---------------------------------------------------------------------------
-- RLS. Email work rides on the campaigns permission, as the other channels do.
-- ---------------------------------------------------------------------------
alter table public.email_flows enable row level security;
alter table public.email_flow_steps enable row level security;

create policy "campaigns.read required to see flows"
  on public.email_flows for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'read', client_id));

create policy "campaigns.create required to add flows"
  on public.email_flows for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'create', client_id));

create policy "campaigns.update required to edit flows"
  on public.email_flows for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'campaigns', 'update', client_id));

create policy "steps follow their flow"
  on public.email_flow_steps for select
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.email_flows f
      where f.id = flow_id and private.has_permission(f.organisation_id, 'campaigns', 'read', f.client_id)
    )
  );

create policy "campaigns.create required to add steps"
  on public.email_flow_steps for insert
  with check (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.email_flows f
      where f.id = flow_id and private.has_permission(f.organisation_id, 'campaigns', 'create', f.client_id)
    )
  );

create policy "campaigns.update required to edit steps"
  on public.email_flow_steps for update
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.email_flows f
      where f.id = flow_id and private.has_permission(f.organisation_id, 'campaigns', 'update', f.client_id)
    )
  );
