-- IHP OS — Phase 1: delivery (projects, tasks, content, documents, meetings,
-- notes, approvals). Each client-scoped table carries a `client_visible`
-- flag — internal members see everything they're assigned to; client
-- portal members only ever see rows explicitly flagged visible to them.

create function private.is_client_portal_member(p_org_id uuid)
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
      and r.slug in ('client_admin', 'client_collaborator')
  );
$$;

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  default_tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.task_templates is 'organisation_id null = system template (client onboarding, paid ads launch, etc.) available to every tenant.';

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  service_type text,
  project_type text,
  budget numeric(10, 2),
  start_date date,
  end_date date,
  owner_id uuid references public.profiles (id),
  status text not null default 'planning' check (status in ('planning', 'active', 'on_hold', 'complete', 'cancelled')),
  client_visible boolean not null default false,
  source_template_id uuid references public.task_templates (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  due_date date,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'complete')),
  sort_order integer not null default 0
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  task_template_id uuid references public.task_templates (id),
  title text not null,
  category text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id uuid references public.profiles (id),
  reviewer_id uuid references public.profiles (id),
  due_date date,
  start_date date,
  estimated_hours numeric(6, 2),
  actual_hours numeric(6, 2),
  billable boolean not null default true,
  status text not null default 'not_started' check (status in (
    'not_started', 'in_progress', 'waiting_on_internal_review', 'waiting_on_client', 'blocked', 'complete', 'cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz
);

create index tasks_org_status_idx on public.tasks (organisation_id, status);
create index tasks_assignee_idx on public.tasks (assignee_id) where assignee_id is not null;

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  platform text,
  content_type text,
  objective text,
  hook text,
  caption text,
  cta text,
  brief text,
  owner_id uuid references public.profiles (id),
  reviewer_id uuid references public.profiles (id),
  approver_id uuid references public.profiles (id),
  due_date date,
  publish_date date,
  status text not null default 'idea' check (status in (
    'idea', 'brief_needed', 'in_production', 'internal_review', 'client_review',
    'revisions', 'approved', 'scheduled', 'published', 'archived'
  )),
  client_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  subject_type text not null check (subject_type in ('content_item', 'document', 'report')),
  subject_id uuid not null,
  requested_by uuid references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested')),
  decision_notes text,
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  title text not null,
  meeting_type text not null default 'client_review' check (meeting_type in ('discovery_call', 'internal', 'client_review', 'other')),
  scheduled_at timestamptz not null,
  duration_minutes integer,
  meeting_link text,
  notes text,
  client_visible boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  name text not null,
  storage_path text not null,
  file_type text,
  size_bytes bigint,
  client_visible boolean not null default false,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  subject_type text check (subject_type in ('client', 'lead', 'deal', 'project', 'task')),
  subject_id uuid,
  author_id uuid references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.task_templates enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.content_items enable row level security;
alter table public.approvals enable row level security;
alter table public.meetings enable row level security;
alter table public.documents enable row level security;
alter table public.notes enable row level security;

create policy "org members can read system and their org's task templates"
  on public.task_templates for select
  using (organisation_id is null or private.is_org_member(organisation_id));

create policy "internal members with templates.update manage task templates"
  on public.task_templates for all
  using (organisation_id is not null and private.has_permission(organisation_id, 'templates', 'update'))
  with check (organisation_id is not null and private.has_permission(organisation_id, 'templates', 'update'));

create policy "internal members with projects.read see accessible projects"
  on public.projects for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'projects', 'read', client_id));

create policy "client portal members see client-visible projects only"
  on public.projects for select
  using (private.is_client_portal_member(organisation_id) and private.can_access_client(organisation_id, client_id) and client_visible = true);

create policy "internal members with projects.create can add projects"
  on public.projects for insert
  with check (private.has_permission(organisation_id, 'projects', 'create', client_id));

create policy "internal members with projects.update can edit projects"
  on public.projects for update
  using (private.has_permission(organisation_id, 'projects', 'update', client_id));

create policy "milestones inherit their project's visibility"
  on public.milestones for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id
        and (
          (private.is_internal_member(p.organisation_id) and private.has_permission(p.organisation_id, 'projects', 'read', p.client_id))
          or (private.is_client_portal_member(p.organisation_id) and private.can_access_client(p.organisation_id, p.client_id) and p.client_visible = true)
        )
    )
  );

create policy "internal members with projects.update manage milestones"
  on public.milestones for all
  using (private.has_permission(organisation_id, 'projects', 'update'))
  with check (private.has_permission(organisation_id, 'projects', 'update'));

create policy "internal members with tasks.read see accessible tasks"
  on public.tasks for select
  using (private.is_internal_member(organisation_id) and (client_id is null or private.has_permission(organisation_id, 'tasks', 'read', client_id)));

create policy "internal members with tasks.create can add tasks"
  on public.tasks for insert
  with check (private.is_internal_member(organisation_id) and (client_id is null or private.has_permission(organisation_id, 'tasks', 'create', client_id)));

create policy "internal members with tasks.update can edit tasks"
  on public.tasks for update
  using (private.is_internal_member(organisation_id) and (client_id is null or private.has_permission(organisation_id, 'tasks', 'update', client_id)));

create policy "internal members with content.read see accessible content"
  on public.content_items for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'content', 'read', client_id));

create policy "client portal members see client-visible content only"
  on public.content_items for select
  using (private.is_client_portal_member(organisation_id) and private.can_access_client(organisation_id, client_id) and client_visible = true);

create policy "internal members with content.create can add content"
  on public.content_items for insert
  with check (private.has_permission(organisation_id, 'content', 'create', client_id));

create policy "internal members with content.update can edit content"
  on public.content_items for update
  using (private.has_permission(organisation_id, 'content', 'update', client_id));

create policy "everyone with client access can read approvals for that client"
  on public.approvals for select
  using (private.can_access_client(organisation_id, client_id));

create policy "internal members can create approval requests"
  on public.approvals for insert
  with check (private.is_internal_member(organisation_id) and private.can_access_client(organisation_id, client_id));

create policy "client portal members can decide pending approvals for their client"
  on public.approvals for update
  using (private.is_client_portal_member(organisation_id) and private.can_access_client(organisation_id, client_id))
  with check (private.is_client_portal_member(organisation_id) and private.can_access_client(organisation_id, client_id));

create policy "internal members with content.update can also decide approvals"
  on public.approvals for update
  using (private.has_permission(organisation_id, 'content', 'update', client_id));

create policy "internal members with documents.read see accessible documents"
  on public.documents for select
  using (private.is_internal_member(organisation_id) and (client_id is null or private.has_permission(organisation_id, 'documents', 'read', client_id)));

create policy "client portal members see client-visible documents only"
  on public.documents for select
  using (private.is_client_portal_member(organisation_id) and client_id is not null and private.can_access_client(organisation_id, client_id) and client_visible = true);

create policy "internal members with documents.create can upload documents"
  on public.documents for insert
  with check (private.is_internal_member(organisation_id) and (client_id is null or private.has_permission(organisation_id, 'documents', 'create', client_id)));

create policy "internal members with documents.read see accessible meetings"
  on public.meetings for select
  using (private.is_internal_member(organisation_id) and (client_id is null or private.has_permission(organisation_id, 'projects', 'read', client_id)));

create policy "client portal members see client-visible meetings only"
  on public.meetings for select
  using (private.is_client_portal_member(organisation_id) and client_id is not null and private.can_access_client(organisation_id, client_id) and client_visible = true);

create policy "internal members can create meetings for accessible clients"
  on public.meetings for insert
  with check (private.is_internal_member(organisation_id) and (client_id is null or private.can_access_client(organisation_id, client_id)));

create policy "internal members can read notes for accessible clients"
  on public.notes for select
  using (private.is_internal_member(organisation_id) and (client_id is null or private.can_access_client(organisation_id, client_id)));

create policy "internal members can create notes for accessible clients"
  on public.notes for insert
  with check (private.is_internal_member(organisation_id) and (client_id is null or private.can_access_client(organisation_id, client_id)));
