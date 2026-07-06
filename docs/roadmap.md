# IHP OS — build roadmap and phase status

## Phase 0 — Foundation (complete)

**What was built**

- Multi-tenant Postgres schema (`supabase/migrations/0001`–`0005`):
  organisations, profiles, roles, permissions, role_permissions, clients
  (stub), organisation_members, client_assignments, audit_logs,
  feature_flags, secrets_metadata, integration_connections,
  integration_sync_logs, ai_providers, ai_model_configs,
  ai_prompt_templates, ai_runs, ai_source_citations, ai_action_proposals,
  ai_usage — all with Row Level Security.
- Supabase Auth wiring: login page, session middleware/proxy, sign-out,
  OAuth callback route.
- App shell: sidebar navigation (every module in the spec's nav list),
  command palette (⌘K), dark mode, top bar, org/user context.
- Audit logging (`writeAuditLog`), feature flags (`isFeatureEnabled` +
  agency-owner-only toggle UI), permission checks (`hasPermission` /
  `requirePermission`, backed by a `has_permission` SQL function so the
  database is the single source of truth).
- Integration framework (`@ihp/integrations`): adapter interface, health
  checks that degrade gracefully, working GitHub and Google Workspace OAuth
  start/callback routes, encrypted token storage.
- AI provider router framework (`@ihp/ai-router`): task-to-provider
  affinity table, spend-limit hook, irreversible-action gate
  (`assertActionAllowed`), no live provider calls yet.
- Environment validation (`@ihp/config`): core vars required, every
  integration var optional and independently validated.
- Settings: Team (member list), Audit Log (append-only viewer), Feature
  Flags (toggle with RLS-enforced permission), Integrations (live health +
  connect buttons).
- Seed script (`npm run seed`): demo organisation, 6 users across all 6
  system roles, 6 fictional clients spanning beauty/wellness, ecommerce
  skincare, local electrical services, ticketed events, AI/SaaS, and
  coaching — plus sample audit log and AI run rows.
- Tests (Vitest) for env validation, AI routing decisions, and role
  classification. CI workflow running lint, typecheck, test, build.

**Fully functional today** (against a real Supabase project): auth, org
membership, RLS-enforced permissions, audit logging, feature flags, GitHub
and Google Workspace OAuth connect flow, the seed script.

**Mocked / stubbed**: Stripe, Meta Ads, Google Ads, Klaviyo, Vercel,
Netlify, Cloudflare Pages adapters (report "not yet implemented," ship in
later phases). AI provider calls are routed but never actually invoked yet
— Phase 5 wires up real OpenAI/Gemini/Anthropic requests.

**Requires credentials to go live**: a real Supabase project (URL + anon +
service role key), and optionally `GITHUB_OAUTH_CLIENT_ID/SECRET` and
`GOOGLE_OAUTH_CLIENT_ID/SECRET` to exercise the two working OAuth flows.

**Known limitations**: every non-Home, non-Settings, non-Integrations nav
item renders an honest "ships in Phase N" empty state — there is no CRM,
project, task, campaign, or reporting data model yet. The Home dashboard
only surfaces what Phase 0 actually has (audit trail, flags, integration
health), not the full executive dashboard from the spec (that needs Phase
1–3 data).

**Setup**: see root `README.md`.

## Phase 1 — Core Agency Operations (not started)

CRM, Client 360, Projects, Tasks, service templates, Content Studio,
Approvals, Notes, Documents, Meetings, client health score, basic client
portal. Needs new tables: `contacts`, `leads`, `deals`, `notes`, `documents`,
`document_chunks`, `meetings`, `projects`, `milestones`, `tasks`,
`task_templates`, `content_items`, `content_assets`, `approvals`,
`service_packages`, `client_services`.

## Phase 2 — Commercial Operations (not started)

Proposals, contracts, retainers, invoices, payments, profitability, capacity,
contractor costs, renewals, scope-creep alerts, revenue forecasting. Needs
`proposals`, `contracts`, `retainers`, `invoices`, `payments`. Stripe
adapter goes from stub to real here.

## Phase 3 — Marketing Delivery (not started)

Campaigns, paid media/SEO/website/email/PR/events reporting, the reporting
engine. Needs `campaigns`, `campaign_metrics`, `reports`,
`report_snapshots`, `influencers`, `media_contacts`, `outreach`, `events`,
`event_attendees`. Meta Ads, Google Ads, Klaviyo adapters go live here.

## Phase 4 — Landing Page Factory (not started)

GitHub/Replit ingestion, Build Library, component library, brief builder,
page generation, preview deployment, QA, approvals. Needs
`landing_page_projects`, `landing_page_briefs`, `build_library_projects`,
`reusable_components`, `page_versions`, `qa_runs`, `deployments`,
`experiments`. Vercel/Netlify/Cloudflare adapters go live here.

## Phase 5 — AI and Connected Workspace (not started)

Real OpenAI/Gemini/Claude calls, Google Workspace document/email/calendar
integration, ChatGPT and Claude Code MCP servers, AI workspace UI. The
schema and routing framework already exist from Phase 0 — this phase wires
real provider SDKs into `@ihp/ai-router` and builds the chat UI.

## Phase 6 — Advanced Automation (not started)

Workflow builder, event-triggered automations, notifications, escalations,
scheduled reporting. Needs `automation_rules`, `automation_runs`,
`notifications`.
