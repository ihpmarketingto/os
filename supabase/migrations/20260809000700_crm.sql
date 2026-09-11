-- IHP OS — Phase 1: CRM (contacts, leads, deals). Internal-only — never
-- exposed to the client portal, per spec section 28 ("Clients cannot access
-- ... other clients"; the pipeline is agency-internal by nature).

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  job_title text,
  company_name text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  company_name text not null,
  industry text,
  source text,
  status text not null default 'new' check (status in ('new', 'qualified', 'disqualified', 'converted')),
  score integer not null default 0,
  estimated_value numeric(10, 2),
  service_interest text[] not null default '{}',
  owner_id uuid references public.profiles (id),
  notes text,
  converted_client_id uuid references public.clients (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  stage text not null default 'new_lead' check (stage in (
    'new_lead', 'qualified', 'discovery_call_booked', 'discovery_completed',
    'proposal_sent', 'negotiation', 'verbal_yes', 'contract_sent',
    'closed_won', 'closed_lost', 'nurture'
  )),
  value numeric(10, 2),
  currency text not null default 'CAD',
  expected_close_date date,
  owner_id uuid references public.profiles (id),
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  win_loss_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  deleted_at timestamptz
);

create index deals_org_stage_idx on public.deals (organisation_id, stage) where status = 'open';

alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.deals enable row level security;

create policy "internal members with crm.read can view contacts"
  on public.contacts for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'read', client_id));

create policy "internal members with crm.create can add contacts"
  on public.contacts for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'create'));

create policy "internal members with crm.update can edit contacts"
  on public.contacts for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'update', client_id));

create policy "internal members with crm.read can view leads"
  on public.leads for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'read'));

create policy "internal members with crm.create can add leads"
  on public.leads for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'create'));

create policy "internal members with crm.update can edit leads"
  on public.leads for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'update'));

create policy "internal members with crm.read can view deals"
  on public.deals for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'read'));

create policy "internal members with crm.create can add deals"
  on public.deals for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'create'));

create policy "internal members with crm.update can edit deals"
  on public.deals for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'update'));
