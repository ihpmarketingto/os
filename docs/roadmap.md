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

## Phase 1 — Core Agency Operations (complete)

**What was built**

- Schema (`supabase/migrations/0006`–`0010`): expanded `clients` into a real
  Client 360 profile (website, social handles, brand kit, contract dates,
  retainer, cached health score); `contacts`, `leads`, `deals` (CRM);
  `task_templates`, `projects`, `milestones`, `tasks`, `content_items`,
  `approvals`, `meetings`, `documents`, `notes` (delivery); a private
  Supabase Storage bucket with path-based RLS for documents.
- CRM (`/crm`): pipeline kanban across all 11 deal stages, a leads table
  with an explainable lead score (`computeLeadScore` in
  `packages/types`), "convert lead to deal" and "convert deal to client"
  (which also spins up an onboarding project + tasks from the Client
  Onboarding template).
- Client 360 (`/clients`, `/clients/[slug]`): overview, live health score
  with a plain-English explanation (`computeClientHealthScore`), projects,
  tasks, content, documents, meetings and notes for that client, and the
  per-client AI-enabled toggle.
- Projects and Tasks (`/projects`, `/tasks`): create-from-template flow
  (14 system templates seeded in `0009`), status boards for both, task
  assignment.
- Content Studio (`/content-studio`): full status board (Idea → Published),
  moving an item to Client Review automatically opens an `approvals` row
  and flips `client_visible` on.
- Documents (`/documents`): upload with file-type/size validation, stored
  under `{org}/{client}/{uuid}-{filename}`, downloaded only through
  `/api/documents/[id]/download`, which checks the `documents` table (RLS)
  with the requester's own session before minting a 60-second signed URL
  with the service-role client.
- Client Portal (`/client-portal`): a genuinely separate, minimal shell (no
  internal sidebar) for `client_admin`/`client_collaborator` sessions —
  enforced both by a redirect in `proxy.ts` (any other path bounces back
  here) and by RLS (`client_visible` flags on projects/content/documents/
  meetings). Internal users get a client picker to preview any client's
  portal view.
- Seed data extended with 3 leads, 3 deals across different stages, an
  onboarding project with tasks, one content item mid-approval, a meeting,
  and a note.

**Deliberately out of scope for this pass** (noted so it's not mistaken for
an oversight): duplicate-detection, bulk CRM import/export, a dedicated
contacts page (contacts exist in the schema but there's no standalone CRUD
UI yet — they're created inline via leads), drag-and-drop kanban (stage/
status changes are a dropdown, not a drag gesture), and a fully configurable
lead-scoring engine (the current scorer is a fixed, explainable formula, not
admin-configurable).

**Known limitation**: none of this has been tested against a live Supabase
project yet — see the Phase 0 section above for the same caveat. Lint,
typecheck, unit tests and `next build` all pass; the actual RLS behaviour
and live CRUD flows need a real project to verify end to end.

## Section 27A — Lead Acquisition, Nurturing and Booking (foundation laid)

The full spec lives in the knowledge base
(`IHP_Knowledge_Base/00_Core/IHP_OS_Section_27A_Lead_Acquisition_Spec.md`).
What exists in the codebase today (migration `0011`):

- **Lead attribution fields** on `leads`: UTM source/medium/campaign/
  content/term, Meta campaign/ad set/ad, click ID, landing page, form
  submitted, lead magnet, time-to-first-response, and SMS consent/opt-out
  fields — captured from day one so no backfill is needed when the
  reporting layer arrives.
- **`bookings` table**: source (Calendly, Google Calendar, GoHighLevel,
  internal), full show-up lifecycle (booked → confirmed → attended /
  rescheduled / cancelled / no-show), deposit status and provider
  (Stripe/Square), outcome (closed won/lost) and revenue.
- **`clients.gohighlevel_mode`**: per-client decision on what GoHighLevel
  is for that client (source of truth, automation engine, booking layer,
  migration source, not used).
- **Integration slots** registered with honest classification
  (native/webhook/csv/planned) and required-credentials lists for
  GoHighLevel, Meta Pixel, Meta Conversions API, GA4, GTM, Calendly,
  Square, Twilio, Discord, Zapier, n8n, QuickBooks — see
  `docs/integrations.md`.

Still to build (lands across Phases 2, 3 and 6): the nurture sequence
engine (including the default 10-day cold-lead sequence), SMS compliance
workflows (consent, quiet hours, opt-out, human takeover), booking
reminder automation, the Meta funnel and testing framework UI, the
attribution reporting dashboard (CPL, cost per booking, show rates, ROAS),
duplicate-detection/merge for GoHighLevel sync, the AI content/video
production workflows, provider cost allocation, and financial
reconciliation (receipts, exports, QuickBooks architecture). No SMS or
email may ever send without consent fields satisfied and human approval —
that rule is durable, not phase-specific.

## Phase 2 — Commercial Operations (not started)

Proposals, contracts, retainers, invoices, payments, profitability, capacity,
contractor costs, renewals, scope-creep alerts, revenue forecasting. Needs
`proposals`, `contracts`, `retainers`, `invoices`, `payments`. Stripe
adapter goes from stub to real here. 27A additions: deposit reconciliation
(Stripe/Square), receipt/expense upload, accountant-ready CSV exports.

## Phase 3 — Marketing Delivery (not started)

Campaigns, paid media/SEO/website/email/PR/events reporting, the reporting
engine. Needs `campaigns`, `campaign_metrics`, `reports`,
`report_snapshots`, `influencers`, `media_contacts`, `outreach`, `events`,
`event_attendees`. Meta Ads, Google Ads, Klaviyo adapters go live here.
27A additions: Meta funnel and testing framework (objective, offer,
audience, budget, creative testing plan, pixel/CAPI QA, decision rules,
launch checklist), attribution reporting (CPL, cost per qualified lead,
cost per booking/attended/deposit/sale, revenue by source, ROAS,
lead-to-booking, booking-to-show, show-to-sale, response-time
performance), and the configurable testing-budget guidance (suggested CAD
$50/day default, never presented as a performance guarantee).

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

27A additions: nurture sequence engine (12 template flows including the
default 10-day cold-lead sequence with editable timing/content), booking
and show-up workflows (confirmations, reminders, no-show recovery,
reschedule, post-appointment follow-up), SMS compliance layer (consent
capture, opt-out, quiet hours, delivery status, reply routing, human
takeover) — all sends gated on human approval per the AI action rules.
Workflow builder, event-triggered automations, notifications, escalations,
scheduled reporting. Needs `automation_rules`, `automation_runs`,
`notifications`.
