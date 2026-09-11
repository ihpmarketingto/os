-- IHP OS — Phase 2: commercial operations. Proposals, contracts, retainers,
-- invoices, payments, expenses, member cost rates.
--
-- Access model: everything here is gated on the `finance` permission
-- (agency_owner only, by default) with two exceptions:
--   * proposals ride with the `crm` permission (account managers send them);
--   * client portal members may read their own client's non-draft invoices
--     (spec section 28: clients can view invoices).

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  title text not null,
  amount numeric(10, 2),
  currency text not null default 'CAD',
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  valid_until date,
  sent_at timestamptz,
  decided_at timestamptz,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'expired', 'terminated')),
  start_date date,
  end_date date,
  renewal_notice_days integer not null default 30,
  auto_renews boolean not null default false,
  value numeric(10, 2),
  currency text not null default 'CAD',
  document_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.retainers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  amount numeric(10, 2) not null,
  currency text not null default 'CAD',
  billing_cadence text not null default 'monthly' check (billing_cadence in ('monthly', 'quarterly')),
  included_hours numeric(6, 2),
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index retainers_org_status_idx on public.retainers (organisation_id, status);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  retainer_id uuid references public.retainers (id) on delete set null,
  number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'void')),
  issue_date date not null default current_date,
  due_date date,
  amount numeric(10, 2) not null,
  tax_amount numeric(10, 2) not null default 0,
  currency text not null default 'CAD',
  notes text,
  paid_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, number)
);

create index invoices_org_status_idx on public.invoices (organisation_id, status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(10, 2) not null,
  currency text not null default 'CAD',
  method text not null default 'e_transfer' check (method in ('stripe', 'square', 'e_transfer', 'cheque', 'wire', 'other')),
  reference text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  category text not null default 'other' check (category in ('contractor', 'software', 'ad_spend', 'ai_spend', 'other')),
  description text not null,
  vendor text,
  amount numeric(10, 2) not null,
  currency text not null default 'CAD',
  incurred_on date not null default current_date,
  receipt_document_id uuid references public.documents (id) on delete set null,
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index expenses_org_client_idx on public.expenses (organisation_id, client_id);

-- Hourly internal cost per member, effective-dated so rate changes do not
-- rewrite historical profitability.
create table public.member_rates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  hourly_cost numeric(8, 2) not null,
  currency text not null default 'CAD',
  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  unique (organisation_id, user_id, effective_from)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.proposals enable row level security;
alter table public.contracts enable row level security;
alter table public.retainers enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.member_rates enable row level security;

create policy "internal members with crm.read see proposals for accessible clients"
  on public.proposals for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'crm', 'read', client_id))
  );

create policy "internal members with crm.create can add proposals"
  on public.proposals for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'create'));

create policy "internal members with crm.update can edit proposals"
  on public.proposals for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'crm', 'update'));

create policy "finance.read required for contracts"
  on public.contracts for select
  using (private.has_permission(organisation_id, 'finance', 'read', client_id));

create policy "finance.update required to manage contracts"
  on public.contracts for all
  using (private.has_permission(organisation_id, 'finance', 'update', client_id))
  with check (private.has_permission(organisation_id, 'finance', 'update', client_id));

create policy "finance.read required for retainers"
  on public.retainers for select
  using (private.has_permission(organisation_id, 'finance', 'read', client_id));

create policy "finance.update required to manage retainers"
  on public.retainers for all
  using (private.has_permission(organisation_id, 'finance', 'update', client_id))
  with check (private.has_permission(organisation_id, 'finance', 'update', client_id));

create policy "internal members with finance.read see invoices"
  on public.invoices for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'finance', 'read', client_id));

create policy "client portal members see their own non-draft invoices"
  on public.invoices for select
  using (
    private.is_client_portal_member(organisation_id)
    and private.can_access_client(organisation_id, client_id)
    and status <> 'draft'
    and private.has_permission(organisation_id, 'finance', 'read', client_id)
  );

create policy "finance.update required to manage invoices"
  on public.invoices for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'finance', 'update', client_id));

create policy "finance.update required to edit invoices"
  on public.invoices for update
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'finance', 'update', client_id));

create policy "finance.read required for payments"
  on public.payments for select
  using (private.has_permission(organisation_id, 'finance', 'read'));

create policy "finance.update required to record payments"
  on public.payments for insert
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'finance', 'update'));

create policy "finance.read required for expenses"
  on public.expenses for select
  using (private.has_permission(organisation_id, 'finance', 'read', client_id));

create policy "finance.update required to manage expenses"
  on public.expenses for all
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'finance', 'update', client_id))
  with check (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'finance', 'update', client_id));

create policy "finance.read required for member rates"
  on public.member_rates for select
  using (private.has_permission(organisation_id, 'finance', 'read'));

create policy "team_settings.update required to manage member rates"
  on public.member_rates for all
  using (private.has_permission(organisation_id, 'team_settings', 'update'))
  with check (private.has_permission(organisation_id, 'team_settings', 'update'));
