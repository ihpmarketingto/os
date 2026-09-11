-- IHP OS — Phase 0: audit logging and feature flags

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  actor_user_id uuid references public.profiles (id),
  actor_type text not null default 'user' check (actor_type in ('user', 'ai_agent', 'system', 'automation')),
  action text not null check (action in (
    'create', 'update', 'delete', 'export', 'ai_retrieve', 'external_action',
    'login', 'logout', 'permission_change'
  )),
  resource text not null,
  resource_id text,
  client_id uuid references public.clients (id),
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
comment on table public.audit_logs is 'Append-only. No update/delete policy exists on purpose — audit trail must be immutable.';

create index audit_logs_org_created_idx on public.audit_logs (organisation_id, created_at desc);
create index audit_logs_client_idx on public.audit_logs (client_id) where client_id is not null;
create index audit_logs_resource_idx on public.audit_logs (resource, resource_id);

alter table public.audit_logs enable row level security;

create policy "org members with audit_logs.read can view their org's log"
  on public.audit_logs for select
  using (private.has_permission(organisation_id, 'audit_logs', 'read'));

create policy "any org member can write an audit entry for their own org"
  on public.audit_logs for insert
  with check (private.is_org_member(organisation_id));

-- deliberately no update or delete policy — see table comment.

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete cascade,
  key text not null,
  is_enabled boolean not null default false,
  description text,
  rollout text not null default 'off' check (rollout in ('off', 'internal_only', 'all_users')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, key)
);
comment on table public.feature_flags is 'organisation_id null = global default flag; an org-specific row overrides the global default.';

alter table public.feature_flags enable row level security;

create policy "org members can read global and their org flags"
  on public.feature_flags for select
  using (organisation_id is null or private.is_org_member(organisation_id));

create policy "agency owners manage their org flags"
  on public.feature_flags for all
  using (organisation_id is not null and private.is_agency_owner(organisation_id))
  with check (organisation_id is not null and private.is_agency_owner(organisation_id));
