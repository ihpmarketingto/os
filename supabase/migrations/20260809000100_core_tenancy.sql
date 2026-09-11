-- IHP OS — Phase 0: core multi-tenancy schema
-- Organisations, profiles, roles/permissions, membership, minimal client stub.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- organisations
-- ---------------------------------------------------------------------------
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  favicon_url text,
  accent_colour text,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table public.organisations is 'Tenant root. Every client-scoped row ultimately traces back to one organisation.';

-- ---------------------------------------------------------------------------
-- profiles — public-safe mirror of auth.users, one row per authenticated user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- roles / permissions / role_permissions
-- ---------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete cascade,
  slug text not null,
  name text not null,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organisation_id, slug)
);
comment on table public.roles is 'organisation_id null = system role available to every tenant (agency_owner, account_manager, specialist, contractor, client_admin, client_collaborator).';

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null,
  description text,
  unique (resource, action)
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  -- when true, the grant only applies to clients the member is explicitly
  -- assigned to via client_assignments (or organisation_members.client_id for client roles)
  requires_client_scope boolean not null default false,
  primary key (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- clients — minimal Phase 0 stub, expanded in Phase 1 (Client 360)
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  slug text not null,
  industry text,
  status text not null default 'prospect' check (status in ('prospect', 'active', 'paused', 'offboarding', 'archived')),
  account_manager_id uuid references public.profiles (id),
  ai_enabled boolean not null default false,
  ai_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, slug)
);

-- ---------------------------------------------------------------------------
-- organisation_members — one row per (user, organisation). role_id determines
-- internal vs client role. client_id is set only for client_admin /
-- client_collaborator (they belong to exactly one client's portal).
-- ---------------------------------------------------------------------------
create table public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id),
  client_id uuid references public.clients (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  invited_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, user_id)
);

-- ---------------------------------------------------------------------------
-- client_assignments — many-to-many scoping for account managers, specialists
-- and contractors. Implements "assignment-based access checks" (spec section 6).
-- ---------------------------------------------------------------------------
create table public.client_assignments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

-- ---------------------------------------------------------------------------
-- private helper functions (security definer, bypass RLS to avoid recursion)
-- ---------------------------------------------------------------------------
create schema if not exists private;

create function private.is_org_member(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.organisation_members m
    where m.organisation_id = p_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create function private.is_internal_member(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.organisation_members m
    join public.roles r on r.id = m.role_id
    where m.organisation_id = p_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and r.slug in ('agency_owner', 'account_manager', 'specialist', 'contractor')
  );
$$;

create function private.is_agency_owner(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.organisation_members m
    join public.roles r on r.id = m.role_id
    where m.organisation_id = p_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and r.slug = 'agency_owner'
  );
$$;

create function private.member_client_id(p_org_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select m.client_id
  from public.organisation_members m
  where m.organisation_id = p_org_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

-- true if the current user may see this specific client: internal members
-- with an assignment, agency owners (see all), or the client's own portal users.
create function private.can_access_client(p_org_id uuid, p_client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select
    private.is_agency_owner(p_org_id)
    or exists (
      select 1 from public.client_assignments ca
      where ca.organisation_id = p_org_id
        and ca.client_id = p_client_id
        and ca.user_id = auth.uid()
    )
    or exists (
      select 1 from public.organisation_members m
      where m.organisation_id = p_org_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.client_id = p_client_id
    );
$$;

create function private.has_permission(p_org_id uuid, p_resource text, p_action text, p_client_id uuid default null)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.organisation_members m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.organisation_id = p_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and p.resource = p_resource
      and p.action = p_action
      and (
        rp.requires_client_scope = false
        or p_client_id is null
        or private.can_access_client(p_org_id, p_client_id)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.clients enable row level security;
alter table public.organisation_members enable row level security;
alter table public.client_assignments enable row level security;

create policy "org members can read their organisation"
  on public.organisations for select
  using (private.is_org_member(id));

create policy "agency owners can update their organisation"
  on public.organisations for update
  using (private.is_agency_owner(id));

create policy "users can read their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "users can read profiles of org co-members"
  on public.profiles for select
  using (
    exists (
      select 1 from public.organisation_members mine
      join public.organisation_members theirs on theirs.organisation_id = mine.organisation_id
      where mine.user_id = auth.uid()
        and theirs.user_id = public.profiles.id
    )
  );

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "anyone authenticated can read system roles"
  on public.roles for select
  using (organisation_id is null or private.is_org_member(organisation_id));

create policy "anyone authenticated can read permissions"
  on public.permissions for select
  using (auth.role() = 'authenticated');

create policy "org members can read role_permissions for visible roles"
  on public.role_permissions for select
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and (r.organisation_id is null or private.is_org_member(r.organisation_id))
    )
  );

create policy "internal members see all org clients, client roles see their own"
  on public.clients for select
  using (private.can_access_client(organisation_id, id));

create policy "internal members with clients.create can add clients"
  on public.clients for insert
  with check (private.has_permission(organisation_id, 'clients', 'create'));

create policy "internal members with clients.update can edit accessible clients"
  on public.clients for update
  using (private.has_permission(organisation_id, 'clients', 'update', id));

create policy "org members can read membership rows in their org"
  on public.organisation_members for select
  using (private.is_org_member(organisation_id));

create policy "agency owners manage membership"
  on public.organisation_members for insert
  with check (private.is_agency_owner(organisation_id));

create policy "agency owners update membership"
  on public.organisation_members for update
  using (private.is_agency_owner(organisation_id));

create policy "agency owners delete membership"
  on public.organisation_members for delete
  using (private.is_agency_owner(organisation_id));

create policy "internal members read assignments for accessible clients"
  on public.client_assignments for select
  using (private.is_internal_member(organisation_id));

create policy "agency owners and managers with team_settings.update can assign clients"
  on public.client_assignments for insert
  with check (private.has_permission(organisation_id, 'team_settings', 'update'));

create policy "agency owners and managers with team_settings.update can remove assignments"
  on public.client_assignments for delete
  using (private.has_permission(organisation_id, 'team_settings', 'update'));
