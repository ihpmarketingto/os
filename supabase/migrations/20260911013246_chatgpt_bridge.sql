-- IHP ChatGPT Bridge v1
--
-- Staging body for the next Supabase migration.
-- Create the migration file with:
--   supabase migration new chatgpt_bridge
-- Then copy this body into the generated file.
--
-- Raw evidence and explicit decisions are separate from durable knowledge.
-- Evidence may lead to a learning_proposal, but is never promoted silently.

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,

  evidence_type text not null check (evidence_type in (
    'chatgpt_conversation',
    'meeting_transcript',
    'email',
    'voice_note',
    'customer_dm',
    'customer_comment',
    'review',
    'website',
    'metric_observation',
    'sales_outcome',
    'support_conversation',
    'policy_source',
    'manual_observation',
    'other'
  )),

  title text not null,
  raw_text text not null,
  summary text,

  source_locator text,
  observed_at timestamptz,
  captured_at timestamptz not null default now(),
  captured_by uuid references public.profiles (id) on delete set null,

  confidence_label text not null default 'UNSET'
    check (confidence_label in ('CONFIRMED', 'WORKING', 'HISTORICAL', 'VERIFY', 'UNSET')),

  confidentiality text not null default 'client_confidential'
    check (confidentiality in ('agency_general', 'client_confidential')),

  tags text[] not null default '{}',
  extracted_data jsonb not null default '{}'::jsonb,

  status text not null default 'raw'
    check (status in ('raw', 'processed', 'archived')),

  source_ai_run_id uuid references public.ai_runs (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint agency_evidence_cannot_be_client_confidential
    check (client_id is not null or confidentiality = 'agency_general')
);

comment on table public.evidence_items is
  'Source evidence captured from ChatGPT and other channels. Evidence is not durable client truth until reviewed and promoted through governed knowledge/decision workflows.';

create index evidence_items_org_client_created_idx
  on public.evidence_items (organisation_id, client_id, captured_at desc)
  where deleted_at is null;

create index evidence_items_type_idx
  on public.evidence_items (organisation_id, evidence_type, captured_at desc)
  where deleted_at is null;

create index evidence_items_tags_idx
  on public.evidence_items using gin (tags);

create table public.decision_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,

  decision_type text not null check (decision_type in (
    'strategy',
    'offer',
    'pricing',
    'positioning',
    'scope',
    'creative',
    'technical',
    'compliance',
    'commercial',
    'operations',
    'other'
  )),

  title text not null,
  decision text not null,
  rationale text,

  status text not null default 'confirmed'
    check (status in ('confirmed', 'unresolved', 'superseded', 'reversed')),

  effective_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,

  source_evidence_id uuid references public.evidence_items (id) on delete set null,
  supersedes_id uuid references public.decision_records (id) on delete set null,

  affects jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.decision_records is
  'Explicit business decisions. Keeps confirmed, unresolved, superseded and reversed decisions traceable without rewriting history.';

create index decision_records_org_client_status_idx
  on public.decision_records (organisation_id, client_id, status, effective_at desc)
  where deleted_at is null;

alter table public.evidence_items enable row level security;
alter table public.decision_records enable row level security;

revoke all on table public.evidence_items from anon;
revoke all on table public.decision_records from anon;

grant select, insert, update on table public.evidence_items to authenticated;
grant select, insert, update on table public.decision_records to authenticated;

-- Evidence follows the existing content permission boundary and client access.
create policy "content.read governs evidence"
  on public.evidence_items
  for select
  to authenticated
  using (
    private.is_internal_member(organisation_id)
    and private.has_permission(organisation_id, 'content', 'read', client_id)
  );

create policy "content.create governs evidence capture"
  on public.evidence_items
  for insert
  to authenticated
  with check (
    private.is_internal_member(organisation_id)
    and private.has_permission(organisation_id, 'content', 'create', client_id)
  );

create policy "content.update governs evidence changes"
  on public.evidence_items
  for update
  to authenticated
  using (
    private.is_internal_member(organisation_id)
    and private.has_permission(organisation_id, 'content', 'update', client_id)
  )
  with check (
    private.is_internal_member(organisation_id)
    and private.has_permission(organisation_id, 'content', 'update', client_id)
  );

create policy "content.read governs decisions"
  on public.decision_records
  for select
  to authenticated
  using (
    private.is_internal_member(organisation_id)
    and private.has_permission(organisation_id, 'content', 'read', client_id)
  );

create policy "content.create governs decision capture"
  on public.decision_records
  for insert
  to authenticated
  with check (
    private.is_internal_member(organisation_id)
    and private.has_permission(organisation_id, 'content', 'create', client_id)
  );

create policy "content.update governs decision changes"
  on public.decision_records
  for update
  to authenticated
  using (
    private.is_internal_member(organisation_id)
    and private.has_permission(organisation_id, 'content', 'update', client_id)
  )
  with check (
    private.is_internal_member(organisation_id)
    and private.has_permission(organisation_id, 'content', 'update', client_id)
  );


-- ---------------------------------------------------------------------------
-- OAuth access-token audience for the IHP ChatGPT MCP resource.
--
-- OpenAI's MCP OAuth flow requires access tokens to be bound to the protected
-- MCP resource. Supabase's normal application sessions keep their normal
-- audience because they do not have an OAuth-server client_id claim.
--
-- IMPORTANT:
-- This function is created by the migration but the Custom Access Token hook
-- must still be enabled explicitly in Authentication > Hooks after the OAuth
-- Server is configured and tested.
--
-- While this hook is enabled, every token issued by Supabase's OAuth Server
-- (i.e. a token carrying client_id) receives the IHP MCP audience. That is
-- appropriate while the project's OAuth Server is dedicated to this bridge.
-- If other OAuth-server clients are added later, restrict this function to
-- the approved ChatGPT client_id(s).
-- ---------------------------------------------------------------------------

create or replace function public.ihp_mcp_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
begin
  claims := event -> 'claims';

  if nullif(claims ->> 'client_id', '') is not null then
    claims := jsonb_set(
      claims,
      '{aud}',
      to_jsonb('https://os-ihp1.vercel.app/api/mcp'::text),
      true
    );

    claims := jsonb_set(
      claims,
      '{ihp_mcp_resource}',
      to_jsonb('https://os-ihp1.vercel.app/api/mcp'::text),
      true
    );

    event := jsonb_set(event, '{claims}', claims, true);
  end if;

  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.ihp_mcp_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.ihp_mcp_access_token_hook(jsonb) from anon, authenticated, public;
