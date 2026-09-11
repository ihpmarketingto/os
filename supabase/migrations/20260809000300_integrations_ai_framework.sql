-- IHP OS — Phase 0: integration framework + AI provider router scaffolding.
-- No live provider calls happen in Phase 0; these tables exist so the
-- integration/AI modules in later phases don't require a schema rewrite.

create table public.secrets_metadata (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  provider text not null,
  key_alias text not null,
  -- the actual secret is encrypted app-side with SECRETS_ENCRYPTION_KEY before
  -- being written here; this table only ever holds ciphertext, never plaintext.
  encrypted_value text not null,
  last_rotated_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (organisation_id, provider, key_alias)
);
comment on table public.secrets_metadata is 'Ciphertext only. Decryption happens server-side at call time, never in a client bundle.';

alter table public.secrets_metadata enable row level security;

create policy "agency owners with integrations.read can view secret metadata"
  on public.secrets_metadata for select
  using (private.has_permission(organisation_id, 'integrations', 'read'));

create policy "agency owners with integrations.update can manage secrets"
  on public.secrets_metadata for all
  using (private.has_permission(organisation_id, 'integrations', 'update'))
  with check (private.has_permission(organisation_id, 'integrations', 'update'));

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  provider text not null check (provider in (
    'openai', 'gemini', 'anthropic', 'google_workspace', 'github', 'stripe',
    'resend', 'sendgrid', 'meta_ads', 'google_ads', 'klaviyo',
    'vercel', 'netlify', 'cloudflare_pages'
  )),
  connected_by_user_id uuid references public.profiles (id),
  status text not null default 'pending' check (status in ('connected', 'disconnected', 'error', 'pending')),
  scopes text[] not null default '{}',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, provider)
);

alter table public.integration_connections enable row level security;

create policy "org members with integrations.read can view connections"
  on public.integration_connections for select
  using (private.has_permission(organisation_id, 'integrations', 'read'));

create policy "org members with integrations.update can manage connections"
  on public.integration_connections for all
  using (private.has_permission(organisation_id, 'integrations', 'update'))
  with check (private.has_permission(organisation_id, 'integrations', 'update'));

create table public.integration_sync_logs (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  records_synced integer not null default 0,
  error_message text
);

alter table public.integration_sync_logs enable row level security;

create policy "org members with integrations.read can view sync logs"
  on public.integration_sync_logs for select
  using (
    exists (
      select 1 from public.integration_connections ic
      where ic.id = integration_sync_logs.integration_connection_id
        and private.has_permission(ic.organisation_id, 'integrations', 'read')
    )
  );

-- ---------------------------------------------------------------------------
-- IHP Intelligence — provider catalog (global, not per-tenant)
-- ---------------------------------------------------------------------------
create table public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('openai', 'gemini', 'anthropic')),
  name text not null,
  is_enabled_globally boolean not null default true
);

create table public.ai_model_configs (
  id uuid primary key default gen_random_uuid(),
  ai_provider_id uuid not null references public.ai_providers (id) on delete cascade,
  model_name text not null,
  capability_tags text[] not null default '{}',
  cost_per_1k_input_tokens numeric(10, 5) not null default 0,
  cost_per_1k_output_tokens numeric(10, 5) not null default 0,
  is_active boolean not null default true,
  unique (ai_provider_id, model_name)
);

alter table public.ai_providers enable row level security;
alter table public.ai_model_configs enable row level security;

create policy "any authenticated user can read the ai provider catalog"
  on public.ai_providers for select
  using (auth.role() = 'authenticated');

create policy "any authenticated user can read model configs"
  on public.ai_model_configs for select
  using (auth.role() = 'authenticated');

create table public.ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete cascade,
  key text not null,
  version integer not null default 1,
  task_type text not null,
  template text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (organisation_id, key, version)
);

alter table public.ai_prompt_templates enable row level security;

create policy "org members can read their prompt templates"
  on public.ai_prompt_templates for select
  using (organisation_id is null or private.is_org_member(organisation_id));

create policy "org members with ai_settings.update manage prompt templates"
  on public.ai_prompt_templates for all
  using (organisation_id is not null and private.has_permission(organisation_id, 'ai_settings', 'update'))
  with check (organisation_id is not null and private.has_permission(organisation_id, 'ai_settings', 'update'));

-- ai_mode mirrors spec section 23: read | draft | action_proposal.
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id),
  user_id uuid references public.profiles (id),
  ai_provider_id uuid references public.ai_providers (id),
  model_name text,
  task_type text not null,
  mode text not null default 'read' check (mode in ('read', 'draft', 'action_proposal')),
  prompt_template_id uuid references public.ai_prompt_templates (id),
  prompt text,
  output text,
  status text not null default 'pending' check (status in ('pending', 'success', 'error', 'rejected')),
  error_message text,
  estimated_cost numeric(10, 5),
  approval_result text check (approval_result in ('approved', 'rejected', 'not_required')),
  created_at timestamptz not null default now()
);

create index ai_runs_org_created_idx on public.ai_runs (organisation_id, created_at desc);

alter table public.ai_runs enable row level security;

create policy "org members with ai_settings.read can view ai runs for accessible clients"
  on public.ai_runs for select
  using (
    private.has_permission(organisation_id, 'ai_settings', 'read')
    and (client_id is null or private.can_access_client(organisation_id, client_id))
  );

create policy "org members can log their own ai runs"
  on public.ai_runs for insert
  with check (private.is_org_member(organisation_id) and user_id = auth.uid());

create table public.ai_source_citations (
  id uuid primary key default gen_random_uuid(),
  ai_run_id uuid not null references public.ai_runs (id) on delete cascade,
  document_type text not null,
  document_id text,
  title text,
  excerpt text
);

alter table public.ai_source_citations enable row level security;

create policy "visible if the parent ai run is visible"
  on public.ai_source_citations for select
  using (
    exists (
      select 1 from public.ai_runs r
      where r.id = ai_source_citations.ai_run_id
        and private.has_permission(r.organisation_id, 'ai_settings', 'read')
    )
  );

create table public.ai_action_proposals (
  id uuid primary key default gen_random_uuid(),
  ai_run_id uuid not null references public.ai_runs (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  proposed_action text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.ai_action_proposals is 'Every irreversible action AI wants to take (send email, publish page, change budget, etc.) lands here first. Nothing executes without a human decision recorded on this row.';

alter table public.ai_action_proposals enable row level security;

create policy "org members with ai_settings.approve can view and decide proposals"
  on public.ai_action_proposals for select
  using (private.is_org_member(organisation_id));

create policy "org members with ai_settings.approve can decide proposals"
  on public.ai_action_proposals for update
  using (private.has_permission(organisation_id, 'ai_settings', 'approve'));

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id),
  user_id uuid references public.profiles (id),
  ai_provider_id uuid references public.ai_providers (id),
  period_start date not null,
  period_end date not null,
  total_input_tokens bigint not null default 0,
  total_output_tokens bigint not null default 0,
  total_cost numeric(10, 2) not null default 0,
  unique (organisation_id, client_id, ai_provider_id, period_start, period_end)
);

alter table public.ai_usage enable row level security;

create policy "org members with finance.read or ai_settings.read can view usage"
  on public.ai_usage for select
  using (
    private.has_permission(organisation_id, 'ai_settings', 'read')
    or private.has_permission(organisation_id, 'finance', 'read')
  );
