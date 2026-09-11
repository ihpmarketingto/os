-- IHP OS — repeatable fulfilment. A service catalogue (what IHP sells),
-- the SOPs each service triggers, and what each client has bought.
--
-- The point: selling a service should generate its delivery work, every
-- period, without anyone assembling it by hand. client_services rows are
-- the subscription; the delivery sweep turns them into projects and tasks
-- from the task_templates already in the system.

-- ---------------------------------------------------------------------------
-- Additional task templates for the workstreams that had no SOP yet:
-- booking/nurture (27A) and lifecycle email.
-- ---------------------------------------------------------------------------
insert into public.task_templates (organisation_id, name, category, description, default_tasks) values
(null, 'Booking and Reminder Flow', 'booking', 'Stand up or maintain the booking, confirmation and reminder sequence for an appointment-led client.', '[
  {"title": "Confirm booking sources and calendar setup", "category": "booking", "due_offset_days": 2},
  {"title": "Map deposit and cancellation policy into the flow", "category": "booking", "due_offset_days": 3},
  {"title": "Draft confirmation and reminder message copy", "category": "content", "due_offset_days": 5},
  {"title": "QA booking links, deposits and calendar invites", "category": "qa", "due_offset_days": 7},
  {"title": "Review no-show and reschedule handling", "category": "booking", "due_offset_days": 9},
  {"title": "Report on booked, attended and no-show rates", "category": "reporting", "due_offset_days": 25}
]'::jsonb),
(null, 'Lead Nurture Sequence', 'lifecycle', 'Build or refresh the cold-lead nurture sequence, including consent and opt-out handling.', '[
  {"title": "Confirm consent capture and opt-out handling", "category": "compliance", "due_offset_days": 2},
  {"title": "Draft sequence outline and timing", "category": "strategy", "due_offset_days": 4},
  {"title": "Write educational and objection-handling messages", "category": "content", "due_offset_days": 7},
  {"title": "Write social proof and offer reminder messages", "category": "content", "due_offset_days": 9},
  {"title": "Internal review of full sequence", "category": "review", "due_offset_days": 11},
  {"title": "Client approval before anything sends", "category": "approval", "due_offset_days": 13},
  {"title": "Review engagement and lead-status movement", "category": "reporting", "due_offset_days": 27}
]'::jsonb),
(null, 'No-show Recovery', 'booking', 'Recover missed appointments and abandoned bookings.', '[
  {"title": "Pull no-show and abandoned booking list", "category": "booking", "due_offset_days": 1},
  {"title": "Draft recovery messages for approval", "category": "content", "due_offset_days": 3},
  {"title": "Review rebooking results", "category": "reporting", "due_offset_days": 14}
]'::jsonb),
(null, 'Lifecycle Email Flow Build', 'email', 'Build one lifecycle flow end to end (welcome, abandoned cart, post-purchase, win-back).', '[
  {"title": "Confirm flow goal, trigger and exit conditions", "category": "strategy", "due_offset_days": 2},
  {"title": "Map segments and branching logic", "category": "email", "due_offset_days": 4},
  {"title": "Write email copy and subject lines", "category": "content", "due_offset_days": 7},
  {"title": "Build flow in the ESP", "category": "email", "due_offset_days": 10},
  {"title": "QA rendering, links and deliverability", "category": "qa", "due_offset_days": 12},
  {"title": "Client approval before activation", "category": "approval", "due_offset_days": 13},
  {"title": "Review flow revenue and engagement", "category": "reporting", "due_offset_days": 28}
]'::jsonb),
(null, 'Social Content Calendar', 'content', 'One month of planned, produced and scheduled social content.', '[
  {"title": "Plan the month against campaign priorities", "category": "content", "due_offset_days": 3},
  {"title": "Produce assets and captions", "category": "content", "due_offset_days": 12},
  {"title": "Internal review", "category": "review", "due_offset_days": 15},
  {"title": "Send to client for approval", "category": "approval", "due_offset_days": 17},
  {"title": "Schedule approved content", "category": "content", "due_offset_days": 20},
  {"title": "Report on published performance", "category": "reporting", "due_offset_days": 28}
]'::jsonb),
(null, 'Event Reporting and Wrap', 'events', 'Post-event coverage, results and sponsor follow-up.', '[
  {"title": "Collect attendance, ticket and revenue figures", "category": "reporting", "due_offset_days": 3},
  {"title": "Compile media coverage and earned mentions", "category": "pr", "due_offset_days": 5},
  {"title": "Draft results report with learnings", "category": "reporting", "due_offset_days": 8},
  {"title": "Sponsor and partner follow-up", "category": "partnerships", "due_offset_days": 10}
]'::jsonb)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- The catalogue: what IHP sells.
-- ---------------------------------------------------------------------------
create table public.service_packages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  slug text not null,
  name text not null,
  category text not null check (category in (
    'strategy', 'website', 'landing_pages', 'paid_media', 'seo', 'local_seo',
    'social', 'email', 'lifecycle', 'booking', 'pr', 'events', 'reporting', 'other'
  )),
  description text,
  cadence text not null default 'monthly' check (cadence in ('one_time', 'monthly', 'quarterly')),
  default_included_hours numeric(6, 2),
  default_price numeric(10, 2),
  currency text not null default 'CAD',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, slug)
);
comment on table public.service_packages is 'The sellable service catalogue. Each package links to the task templates that constitute its delivery SOP.';

-- Which SOPs a package triggers, and when.
create table public.service_package_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  service_package_id uuid not null references public.service_packages (id) on delete cascade,
  task_template_id uuid not null references public.task_templates (id) on delete cascade,
  trigger text not null default 'each_period' check (trigger in ('on_start', 'each_period')),
  sort_order integer not null default 0,
  unique (service_package_id, task_template_id, trigger)
);
comment on column public.service_package_templates.trigger is 'on_start fires once when the client service begins (setup/onboarding); each_period fires every delivery cycle.';

-- ---------------------------------------------------------------------------
-- What a specific client has bought.
-- ---------------------------------------------------------------------------
create table public.client_services (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  service_package_id uuid not null references public.service_packages (id),
  retainer_id uuid references public.retainers (id) on delete set null,
  owner_id uuid references public.profiles (id),
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  cadence text check (cadence in ('one_time', 'monthly', 'quarterly')),
  included_hours numeric(6, 2),
  price numeric(10, 2),
  start_date date not null default current_date,
  end_date date,
  /* Period label (YYYY-MM for monthly, YYYY-Qn for quarterly, 'once' for
     one-time) of the most recent generated delivery cycle. Display and
     convenience only — automation_runs holds the authoritative dedupe. */
  last_fulfilled_period text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (client_id, service_package_id)
);

create index client_services_org_status_idx on public.client_services (organisation_id, status);

-- ---------------------------------------------------------------------------
-- RLS. The catalogue is internal and readable by any internal member;
-- editing it is a templates.update job. client_services follow client scope,
-- and client portal members may see which services their own client buys.
-- ---------------------------------------------------------------------------
alter table public.service_packages enable row level security;
alter table public.service_package_templates enable row level security;
alter table public.client_services enable row level security;

create policy "internal members read the service catalogue"
  on public.service_packages for select
  using (private.is_internal_member(organisation_id));

create policy "templates.update manages the service catalogue"
  on public.service_packages for all
  using (private.has_permission(organisation_id, 'templates', 'update'))
  with check (private.has_permission(organisation_id, 'templates', 'update'));

create policy "internal members read package template links"
  on public.service_package_templates for select
  using (private.is_internal_member(organisation_id));

create policy "templates.update manages package template links"
  on public.service_package_templates for all
  using (private.has_permission(organisation_id, 'templates', 'update'))
  with check (private.has_permission(organisation_id, 'templates', 'update'));

create policy "internal members with clients.read see client services"
  on public.client_services for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'clients', 'read', client_id));

create policy "client portal members see their own services"
  on public.client_services for select
  using (
    private.is_client_portal_member(organisation_id)
    and private.can_access_client(organisation_id, client_id)
    and status <> 'ended'
  );

create policy "clients.update manages client services"
  on public.client_services for all
  using (private.has_permission(organisation_id, 'clients', 'update', client_id))
  with check (private.has_permission(organisation_id, 'clients', 'update', client_id));
