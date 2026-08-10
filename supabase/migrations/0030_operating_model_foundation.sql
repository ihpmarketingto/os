-- IHP OS — operating model foundation.
--
-- Formalises the OS → Identity → App → Plugin → Task architecture without
-- replacing existing delivery systems. Registry records stay bounded,
-- client-scoped rows stay isolated, and learning promotion remains
-- approval-gated rather than automatic.

create table public.identity_registry (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  stable_key text not null,
  display_name text not null,
  identity_type text not null check (identity_type in (
    'internal_operator',
    'client_founder',
    'client_team_member',
    'brand',
    'audience',
    'subject_matter_specialist',
    'system'
  )),
  owner_profile_id uuid references public.profiles (id) on delete set null,
  scope text not null default 'organisation' check (scope in ('organisation', 'client', 'app', 'plugin', 'task')),
  authority_notes text,
  evidence_status text not null default 'UNSET' check (evidence_status in ('CONFIRMED', 'WORKING', 'HISTORICAL', 'VERIFY', 'UNSET')),
  source_references jsonb not null default '[]'::jsonb,
  reasoning_principles jsonb not null default '[]'::jsonb,
  voice_guidance text,
  restrictions jsonb not null default '[]'::jsonb,
  version text not null default '1.0.0',
  review_status text not null default 'draft' check (review_status in ('draft', 'working', 'approved', 'archived')),
  last_approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint identity_registry_org_key_unique unique (organisation_id, stable_key)
);

comment on table public.identity_registry is
  'Formal registry of distinct identities used by IHP OS, such as Sarah, a client founder, a brand voice, or an audience perspective. Keeps authority, source references and review state separate so one identity does not silently absorb another.';

create table public.client_adapters (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  stable_key text not null,
  name text not null,
  founder_identity_ids jsonb not null default '[]'::jsonb,
  team_identity_ids jsonb not null default '[]'::jsonb,
  brand_identity_id uuid references public.identity_registry (id) on delete set null,
  audience_identity_ids jsonb not null default '[]'::jsonb,
  approved_source_locations jsonb not null default '[]'::jsonb,
  connected_tools jsonb not null default '[]'::jsonb,
  permission_policy jsonb not null default '{}'::jsonb,
  claim_policy jsonb not null default '{}'::jsonb,
  approval_owner_ids jsonb not null default '[]'::jsonb,
  business_rules jsonb not null default '[]'::jsonb,
  data_boundaries jsonb not null default '[]'::jsonb,
  enabled_apps jsonb not null default '[]'::jsonb,
  enabled_plugins jsonb not null default '[]'::jsonb,
  current_operating_mode text not null default 'shadow' check (current_operating_mode in ('shadow', 'approval', 'guardrailed_execution')),
  client_configuration jsonb not null default '{}'::jsonb,
  version text not null default '1.0.0',
  review_status text not null default 'draft' check (review_status in ('draft', 'working', 'approved', 'archived')),
  last_approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint client_adapters_client_unique unique (client_id),
  constraint client_adapters_org_key_unique unique (organisation_id, stable_key)
);

comment on table public.client_adapters is
  'Per-client configuration contract that points the universal OS at the client-specific identities, rules, tools, approvals and data boundaries without duplicating the OS itself.';

create table public.task_envelopes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  client_adapter_id uuid references public.client_adapters (id) on delete set null,
  work_item_id uuid references public.tasks (id) on delete set null,
  ai_run_id uuid references public.ai_runs (id) on delete set null,
  requested_by uuid references public.profiles (id) on delete set null,
  user_request text not null,
  relevant_identity_refs jsonb not null default '[]'::jsonb,
  selected_app text not null,
  selected_plugin text not null,
  source_references jsonb not null default '[]'::jsonb,
  operating_mode text not null default 'shadow' check (operating_mode in ('shadow', 'approval', 'guardrailed_execution')),
  authority_state text not null default 'missing' check (authority_state in ('missing', 'limited', 'confirmed')),
  permission_state text not null default 'unverified' check (permission_state in ('unverified', 'granted', 'denied')),
  approval_requirements jsonb not null default '[]'::jsonb,
  current_step text not null default 'identify' check (current_step in (
    'identify',
    'load',
    'diagnose',
    'plan',
    'gate',
    'produce_or_execute',
    'verify',
    'record',
    'hand_off'
  )),
  current_status text not null default 'draft' check (current_status in ('draft', 'in_progress', 'blocked', 'completed', 'handed_off', 'failed')),
  output_destination jsonb not null default '{}'::jsonb,
  audit_references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.task_envelopes is
  'Traceable routing envelope for a task from client context through App and Plugin selection to audit and hand-off.';

create table public.learning_proposals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  proposed_by_profile_id uuid references public.profiles (id) on delete set null,
  proposed_by_ai_run_id uuid references public.ai_runs (id) on delete set null,
  raw_evidence_references jsonb not null default '[]'::jsonb,
  proposed_learning text not null,
  proposed_destination jsonb not null default '{}'::jsonb,
  reason_for_promotion text not null,
  confidence_label text not null default 'UNSET' check (confidence_label in ('CONFIRMED', 'WORKING', 'HISTORICAL', 'VERIFY', 'UNSET')),
  contradictions_or_risks jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'applied')),
  required_approver_id uuid references public.profiles (id) on delete set null,
  approval_record jsonb not null default '{}'::jsonb,
  version_impact jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_proposals is
  'Approval-gated proposals for promoting durable learning from raw evidence into an Identity, Client Adapter, Plugin, policy or other governed destination.';

create table public.source_lineage_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  task_envelope_id uuid not null references public.task_envelopes (id) on delete cascade,
  ai_run_id uuid references public.ai_runs (id) on delete set null,
  source_type text not null,
  source_id uuid,
  source_client_id uuid references public.clients (id) on delete set null,
  source_locator text,
  source_version text,
  usage text not null check (usage in ('retrieved', 'opened', 'material', 'claim_origin')),
  claim_locator text,
  supplied_identity_id uuid references public.identity_registry (id) on delete set null,
  unresolved_uncertainty text,
  created_at timestamptz not null default now()
);

comment on table public.source_lineage_records is
  'Records which sources were retrieved, opened, materially influential or claim-origin evidence for a task envelope.';

create table public.evaluation_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  task_envelope_id uuid references public.task_envelopes (id) on delete set null,
  plugin_id text not null,
  evaluator_identity_id uuid references public.identity_registry (id) on delete set null,
  evaluation_type text not null check (evaluation_type in ('self_check', 'independent_qa', 'human_review', 'performance_follow_up')),
  independent boolean not null default false,
  dimensions jsonb not null default '[]'::jsonb,
  overall_outcome text not null check (overall_outcome in ('pass', 'warning', 'fail', 'human_review_required')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.evaluation_records is
  'Independent and non-independent evaluation records kept separate from output generation so self-scoring never becomes the only proof of quality.';

create index identity_registry_org_client_idx
  on public.identity_registry (organisation_id, client_id)
  where deleted_at is null;

create index client_adapters_org_client_idx
  on public.client_adapters (organisation_id, client_id)
  where deleted_at is null;

create index task_envelopes_org_client_idx on public.task_envelopes (organisation_id, client_id, created_at desc);
create index task_envelopes_ai_run_idx on public.task_envelopes (ai_run_id) where ai_run_id is not null;
create index learning_proposals_org_status_idx on public.learning_proposals (organisation_id, status, created_at desc);
create index source_lineage_records_task_idx on public.source_lineage_records (task_envelope_id, usage);
create index evaluation_records_task_idx on public.evaluation_records (task_envelope_id, created_at desc);

alter table public.identity_registry enable row level security;
alter table public.client_adapters enable row level security;
alter table public.task_envelopes enable row level security;
alter table public.learning_proposals enable row level security;
alter table public.source_lineage_records enable row level security;
alter table public.evaluation_records enable row level security;

create policy "internal members can read identity registry"
  on public.identity_registry for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members can manage identity registry"
  on public.identity_registry for all
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  )
  with check (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members can read client adapters"
  on public.client_adapters for select
  using (
    private.is_internal_member(organisation_id)
    and private.can_access_client(organisation_id, client_id)
  );

create policy "internal members can manage client adapters"
  on public.client_adapters for all
  using (
    private.is_internal_member(organisation_id)
    and private.can_access_client(organisation_id, client_id)
  )
  with check (
    private.is_internal_member(organisation_id)
    and private.can_access_client(organisation_id, client_id)
  );

create policy "internal members can read task envelopes"
  on public.task_envelopes for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members can manage task envelopes"
  on public.task_envelopes for all
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  )
  with check (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members can read learning proposals"
  on public.learning_proposals for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members can manage learning proposals"
  on public.learning_proposals for all
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  )
  with check (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members can read source lineage"
  on public.source_lineage_records for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members can record source lineage"
  on public.source_lineage_records for insert
  with check (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members can read evaluation records"
  on public.evaluation_records for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "internal members can manage evaluation records"
  on public.evaluation_records for all
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  )
  with check (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );
