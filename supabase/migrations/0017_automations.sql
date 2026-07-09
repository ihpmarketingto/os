-- IHP OS — Phase 6: automation engine. Rules, deduplicated runs,
-- notifications.
--
-- Execution model: event rules fire inline from the server actions that
-- already own the triggering mutation; sweep rules run from the
-- "Run automations" action (and later a scheduled caller). The unique
-- (organisation_id, rule_key, dedupe_key) constraint on automation_runs is
-- what guarantees an automation never double-fires for the same subject —
-- the insert either succeeds (act) or conflicts (skip).

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  rule_key text not null,
  name text not null,
  description text,
  trigger_type text not null check (trigger_type in ('event', 'sweep')),
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, rule_key)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  rule_key text not null,
  dedupe_key text not null,
  status text not null default 'completed' check (status in ('completed', 'failed')),
  summary text,
  created_at timestamptz not null default now(),
  unique (organisation_id, rule_key, dedupe_key)
);

create index automation_runs_org_created_idx on public.automation_runs (organisation_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;
alter table public.notifications enable row level security;

create policy "internal members can read automation rules"
  on public.automation_rules for select
  using (private.is_internal_member(organisation_id));

create policy "team_settings.update manages automation rules"
  on public.automation_rules for all
  using (private.has_permission(organisation_id, 'team_settings', 'update'))
  with check (private.has_permission(organisation_id, 'team_settings', 'update'));

create policy "internal members can read automation runs"
  on public.automation_runs for select
  using (private.is_internal_member(organisation_id));

create policy "internal members can record automation runs"
  on public.automation_runs for insert
  with check (private.is_internal_member(organisation_id));

create policy "users read their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "users mark their own notifications read"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "internal members can notify members of their org"
  on public.notifications for insert
  with check (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.organisation_members m
      where m.organisation_id = notifications.organisation_id
        and m.user_id = notifications.user_id
        and m.status = 'active'
    )
  );
