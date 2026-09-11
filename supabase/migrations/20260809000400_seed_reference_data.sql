-- IHP OS — Phase 0: system-wide reference data (roles, permissions, AI catalog).
-- This is catalog data, not tenant demo data — tenant demo data lives in
-- scripts/seed.ts and is created via the Supabase admin API instead of SQL
-- because auth.users rows need to exist first.

insert into public.roles (organisation_id, slug, name, is_system_role) values
  (null, 'agency_owner', 'Agency Owner / Admin', true),
  (null, 'account_manager', 'Account Manager', true),
  (null, 'specialist', 'Specialist', true),
  (null, 'contractor', 'Contractor', true),
  (null, 'client_admin', 'Client Admin', true),
  (null, 'client_collaborator', 'Client Collaborator', true)
on conflict (organisation_id, slug) do nothing;

insert into public.permissions (resource, action, description) values
  ('clients', 'create', 'Create a new client record'),
  ('clients', 'read', 'View client records'),
  ('clients', 'update', 'Edit client records'),
  ('clients', 'delete', 'Soft-delete a client record'),
  ('crm', 'create', 'Create CRM records (leads, deals, contacts)'),
  ('crm', 'read', 'View CRM records'),
  ('crm', 'update', 'Edit CRM records'),
  ('projects', 'create', 'Create projects'),
  ('projects', 'read', 'View projects'),
  ('projects', 'update', 'Edit projects'),
  ('tasks', 'create', 'Create tasks'),
  ('tasks', 'read', 'View tasks'),
  ('tasks', 'update', 'Edit tasks'),
  ('content', 'create', 'Create content items'),
  ('content', 'read', 'View content items'),
  ('content', 'update', 'Edit content items'),
  ('content', 'approve', 'Approve content for publishing'),
  ('campaigns', 'create', 'Create campaigns'),
  ('campaigns', 'read', 'View campaigns'),
  ('campaigns', 'update', 'Edit campaigns'),
  ('documents', 'read', 'View documents'),
  ('documents', 'create', 'Upload documents'),
  ('documents', 'export', 'Download/export documents'),
  ('reports', 'read', 'View reports'),
  ('reports', 'create', 'Create report drafts'),
  ('reports', 'approve', 'Approve a report for client publishing'),
  ('finance', 'read', 'View financial data'),
  ('finance', 'update', 'Edit financial data (invoices, retainers, payments)'),
  ('finance', 'export', 'Export financial data'),
  ('integrations', 'read', 'View integration connection status'),
  ('integrations', 'update', 'Connect/disconnect integrations and manage secrets'),
  ('ai_settings', 'read', 'View AI usage, runs and settings'),
  ('ai_settings', 'update', 'Change AI provider settings and client AI permissions'),
  ('ai_settings', 'ai_retrieve', 'Allow AI to retrieve this context as a source'),
  ('ai_settings', 'approve', 'Approve or reject an AI action proposal'),
  ('team_settings', 'read', 'View team members and assignments'),
  ('team_settings', 'update', 'Manage team members, roles and client assignments'),
  ('permissions', 'update', 'Change role/permission configuration'),
  ('templates', 'read', 'View service/task templates'),
  ('templates', 'update', 'Edit service/task templates'),
  ('audit_logs', 'read', 'View the organisation audit trail'),
  ('landing_page_factory', 'read', 'View Build Library and landing page projects'),
  ('landing_page_factory', 'update', 'Ingest projects, edit briefs, request deployments'),
  ('landing_page_factory', 'approve', 'Approve a landing page for publish')
on conflict (resource, action) do nothing;

-- Agency Owner: every permission, no client scoping required.
insert into public.role_permissions (role_id, permission_id, requires_client_scope)
select r.id, p.id, false
from public.roles r, public.permissions p
where r.slug = 'agency_owner' and r.organisation_id is null
on conflict do nothing;

-- Account Manager: full CRM/delivery/reporting access, scoped to assigned clients.
-- No unrestricted finance, integrations, ai_settings.update, permissions, or team_settings.update.
insert into public.role_permissions (role_id, permission_id, requires_client_scope)
select r.id, p.id, true
from public.roles r, public.permissions p
where r.slug = 'account_manager' and r.organisation_id is null
  and p.resource in ('clients', 'crm', 'projects', 'tasks', 'content', 'campaigns', 'documents', 'reports', 'landing_page_factory')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id, requires_client_scope)
select r.id, p.id, true
from public.roles r, public.permissions p
where r.slug = 'account_manager' and r.organisation_id is null
  and p.resource = 'ai_settings' and p.action in ('read', 'ai_retrieve')
on conflict do nothing;

-- Specialist: same shape as account manager but read-heavy on delivery workstreams.
insert into public.role_permissions (role_id, permission_id, requires_client_scope)
select r.id, p.id, true
from public.roles r, public.permissions p
where r.slug = 'specialist' and r.organisation_id is null
  and p.resource in ('projects', 'tasks', 'content', 'campaigns', 'documents')
  and p.action in ('read', 'update', 'create')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id, requires_client_scope)
select r.id, p.id, true
from public.roles r, public.permissions p
where r.slug = 'specialist' and r.organisation_id is null
  and p.resource in ('clients', 'reports')
  and p.action = 'read'
on conflict do nothing;

-- Contractor: tasks and documents only, on assigned clients.
insert into public.role_permissions (role_id, permission_id, requires_client_scope)
select r.id, p.id, true
from public.roles r, public.permissions p
where r.slug = 'contractor' and r.organisation_id is null
  and (
    (p.resource = 'tasks' and p.action in ('read', 'update'))
    or (p.resource = 'documents' and p.action = 'read')
  )
on conflict do nothing;

-- Client Admin: their own client's reports, projects, deliverables, content
-- approvals, documents, invoices (finance.read scoped), meetings.
insert into public.role_permissions (role_id, permission_id, requires_client_scope)
select r.id, p.id, true
from public.roles r, public.permissions p
where r.slug = 'client_admin' and r.organisation_id is null
  and (
    (p.resource in ('projects', 'documents', 'reports') and p.action = 'read')
    or (p.resource = 'content' and p.action in ('read', 'approve'))
    or (p.resource = 'finance' and p.action = 'read')
  )
on conflict do nothing;

-- Client Collaborator: narrow, explicit-permission access only (content approval, file view).
insert into public.role_permissions (role_id, permission_id, requires_client_scope)
select r.id, p.id, true
from public.roles r, public.permissions p
where r.slug = 'client_collaborator' and r.organisation_id is null
  and (
    (p.resource = 'content' and p.action in ('read', 'approve'))
    or (p.resource = 'documents' and p.action = 'read')
    or (p.resource = 'projects' and p.action = 'read')
  )
on conflict do nothing;

-- IHP Intelligence provider catalog
insert into public.ai_providers (slug, name) values
  ('openai', 'OpenAI'),
  ('gemini', 'Google Gemini'),
  ('anthropic', 'Anthropic Claude')
on conflict (slug) do nothing;

insert into public.ai_model_configs (ai_provider_id, model_name, capability_tags, cost_per_1k_input_tokens, cost_per_1k_output_tokens)
select id, 'gpt-5.1', array['structured_output', 'tool_calling', 'report_drafting', 'copy_generation'], 0.00500, 0.01500
from public.ai_providers where slug = 'openai'
on conflict do nothing;

insert into public.ai_model_configs (ai_provider_id, model_name, capability_tags, cost_per_1k_input_tokens, cost_per_1k_output_tokens)
select id, 'gemini-2.5-pro', array['long_document', 'multimodal', 'workspace_connected', 'function_calling'], 0.00350, 0.01050
from public.ai_providers where slug = 'gemini'
on conflict do nothing;

insert into public.ai_model_configs (ai_provider_id, model_name, capability_tags, cost_per_1k_input_tokens, cost_per_1k_output_tokens)
select id, 'claude-sonnet-5', array['code_generation', 'code_review', 'repo_analysis', 'long_form_strategy'], 0.00300, 0.01500
from public.ai_providers where slug = 'anthropic'
on conflict do nothing;

-- Global feature flag defaults — every module ships behind a flag so Settings
-- can turn a phase on/off per organisation without a deploy.
insert into public.feature_flags (organisation_id, key, is_enabled, description, rollout) values
  (null, 'crm', true, 'CRM module (Phase 1)', 'all_users'),
  (null, 'client_portal', true, 'Client-facing portal (Phase 1)', 'all_users'),
  (null, 'finance', false, 'Commercial operations module (Phase 2)', 'internal_only'),
  (null, 'landing_page_factory', false, 'Landing Page Factory (Phase 4)', 'internal_only'),
  (null, 'ai_intelligence', false, 'IHP Intelligence AI workspace (Phase 5)', 'internal_only'),
  (null, 'automations', false, 'Workflow automation engine (Phase 6)', 'internal_only')
on conflict (organisation_id, key) do nothing;
