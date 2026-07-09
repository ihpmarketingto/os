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

**Live verification (2026-07-06)**: connected to the production Supabase
project (`jpqclxiolvrqfxvcfdik`). All 11 migrations applied via
`npm run migrate`; demo data seeded via `npm run seed`. Verified in the
browser against real RLS: agency-owner login, lead intake, deal stage
changes, closed-won conversion into a client with an auto-generated
onboarding project and template tasks, client health score, sign-out, and
the client portal as a client_admin (scoped to their own client only,
pending content approval visible and decidable, content status flip
recorded, every step in the audit trail). Live-fire fixes made during
verification: batch inserts need explicit values for not-null defaulted
columns; won-but-unconverted deals must stay on the pipeline board;
approvals are polymorphic so the portal fetches content in a second query
instead of a PostgREST embed; approval decisions flip content status via
the admin client keyed off the approval's own subject_id (client roles
deliberately cannot update content_items); DropdownMenuLabel requires a
DropdownMenuGroup wrapper in Base UI.

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

## Phase 2 — Commercial Operations (core complete, live-verified 2026-07-06)

**Built and verified against the live project:**

- Schema (migration `0012`): `proposals`, `contracts`, `retainers`,
  `invoices`, `payments`, `expenses`, `member_rates`, all RLS-secured.
  Finance data is `finance` permission only (Agency Owner by default);
  proposals ride with `crm`; client portal members can read their own
  client's non-draft invoices and nothing else (verified as Dana).
- Finance dashboard: MRR, outstanding/overdue invoice totals, 3-month
  forecast (labelled a planning number), renewal-due alerts (contract and
  retainer end dates vs notice windows), scope-creep alerts (task hours vs
  retainer included hours, last 30 days), and tabs for invoices (status +
  record payment, auto-flips to paid when payments cover the total),
  retainers, contracts, proposals, expenses, and profitability by client
  using the spec formula (revenue minus contractor costs minus internal
  labour at member rates; software and paid-media allocations count as
  zero until configured).
- Home dashboard KPI row: MRR and outstanding invoices (finance roles
  only), pipeline value, overdue tasks, approvals pending.
- Client portal shows the client's own invoices with status.
- Finance maths is pure and unit-tested (`packages/types/src/finance-math.ts`,
  13 tests): MRR, gross contribution, renewal windows, scope creep,
  forecast.

**Still open in Phase 2 scope:** proposal builder UI (proposals are
list-only; they attach to CRM deals), team capacity view, accountant CSV
export, receipt upload against expenses, Stripe/Square adapters for real
payment collection and deposit reconciliation (27A), churn and utilisation
reporting.

## Phase 3 — Marketing Delivery (core complete, live-verified 2026-07-06)

**Built and verified against the live project:**

- Schema (migration `0013`): `campaigns`, `campaign_metrics`
  (channel-agnostic day-rows), `reports`, `experiments`, `influencers`,
  `media_contacts`, `outreach`, `events`, `event_attendees` — all
  RLS-secured (campaigns/reports permissions; portal members read
  published reports and client-visible campaigns only).
- Campaigns module: full lifecycle statuses from the spec (Planning
  through Archived), objective/offer/audience/channels/budget/KPIs.
- Channel dashboards: one shared metrics engine behind Paid Media
  (Meta + Google Ads), SEO, and Email pages — spend, revenue, ROAS,
  leads, CPL, CPA, CTR, CPM, conversion rate, overall and per client,
  computed by pure tested functions (null over fake zeros when a
  denominator is empty). Data arrives by validated CSV import
  (documented column format, per-line error reporting) until the
  Meta/Google/Klaviyo API adapters activate with credentials.
- Website and CRO: experiment tracker enforcing hypothesis and success
  metric up front, with start/conclude flow capturing result,
  statistical confidence, ship/revert/iterate decision, and learnings.
- PR and influencers: creator roster with outreach statuses and media
  contact list (pitch tracking builds on the `outreach` table next).
- Events: ticketed-event tracking with target attendance, running ticket
  sales and revenue.
- Reports engine: draft → internal review → client review → published →
  archived, with transitions validated server-side, publishing gated on
  the reports approve permission and logged as an external action, and
  published reports appearing in the client portal (verified as the
  demo client admin, who sees the published report and not the draft).

**Still open in Phase 3 scope:** report PDF export and shareable secure
links, AI-generated report commentary (Phase 5 dependency), keyword-level
SEO tracking (rank tracking, clustering, GBP workflow), campaign detail
page linking content/tasks/landing pages, paid-media anomaly detection,
pitch/outreach UI on top of the outreach table, run-of-show and
sponsor/speaker tracking for events, and the 27A Meta funnel testing
framework UI with pixel/CAPI QA checklists.

## Phase 4 — Landing Page Factory (governance core complete, live-verified 2026-07-06)

**Built and verified against the live project:**

- Schema (migrations `0014`-`0015`): `build_library_projects`,
  `reusable_components`, `landing_page_briefs`, `landing_page_projects`,
  `qa_runs`, `deployments`, all RLS-secured on the landing_page_factory
  permission. Portal members can read a page's name and preview link only
  while it awaits (or after) their approval — internal states stay
  invisible to clients.
- Build Library: past GitHub/Replit/manual work registered as governed
  reference material with performance data and learnings. Nothing is
  reusable until explicitly approved (approve permission); restricted
  projects cannot be selected as references, enforced server-side.
- Brief builder: the spec's structured brief (offer, conversion action,
  CTAs, audience, price, proof points, objections, required and forbidden
  claims, required disclaimer, tracking requirements, launch date).
  Page projects can only be created from an approved brief.
- Page workflow: planning → generating → preview → qa →
  internal_approval → client_approval → approved_to_publish → published,
  transitions validated server-side. Requesting client approval requires
  a preview URL and creates a portal approval; the client's decision (not
  any internal action) is what moves a page to approved_to_publish.
- QA: the spec's 27-item pre-publish checklist recorded per run with
  pass/warning/fail per item; any fail fails the run.
- Publish gate (pure, 10 unit tests): production publishing requires
  approved_to_publish status AND a latest QA run that did not fail AND a
  recorded client approval AND the approve permission — verified live end
  to end (Dana approved from her portal via the preview link, the owner
  published, the production deployment and external_action audit entry
  were recorded).

**Still open in Phase 4 scope:** actual page code generation (Phase 5 — the
AI layer drives it through these gates), GitHub OAuth repo sync and Replit
ZIP ingestion with secret scanning, automated component discovery into
`reusable_components`, `page_versions` tracking, Vercel/Netlify/Cloudflare
deployment adapters (deployments are recorded manually today), and the
performance learning loop back into the Build Library.

## Phase 5 — AI and Connected Workspace (core complete, live-verified 2026-07-08)

**Acceptance criterion 15 verified live**: with OpenAI credits in place, the
workspace generated a real executive-summary draft for the demo client
(gpt-5-mini, US$0.0025) grounded entirely in retrieved context, with four
recorded and displayed source citations (client profile, latest report,
open tasks, active campaigns). Two live-fire fixes landed during
verification: `ai_source_citations` was missing an INSERT policy
(migration `0016`; citation failures now fail the run loudly instead of
silently), and the gpt-5 reasoning-token budget needed raising because a
small max_completion_tokens can be consumed entirely by internal
reasoning, yielding an empty response.

**Built and verified up to the provider boundary:**

- Execution layer in `@ihp/ai-router`: OpenAI chat adapter (gpt-5-mini
  default) with token usage capture and per-run cost estimation (unit
  tested); Gemini and Anthropic slots throw clear routing errors until
  their keys arrive; `configuredProviders` feeds `selectProvider` so
  routing never picks an unconfigured provider.
- AI Workspace (/ai-intelligence): client and task-type selectors, draft
  mode only. Four gates run before any provider call, in order: the user's
  `ai_settings.ai_retrieve` permission for that client, the client's
  `ai_enabled` toggle (with per-client allowed-provider list from
  `ai_settings`), the organisation's monthly spend cap (US$25 hard
  default until per-client/user caps are configurable), and provider
  routing by task affinity.
- Minimum authorised context: only summarised, RLS-checked blocks are
  sent (client profile, 30-day channel summary, latest report, open
  tasks, active campaigns). Financial and contact data are excluded.
  Every block becomes an `ai_source_citations` row and is shown as a
  source under the draft.
- Every run — success or failure — lands in `ai_runs` with prompt,
  output, provider, model, mode, estimated cost, and error message, plus
  an `ai_retrieve` audit-log entry. Verified live: the full pipeline ran
  end to end and OpenAI's 429 (account has no credits) was surfaced
  cleanly in the UI and recorded as an error run.
- System prompt enforces the IHP writing rules (Canadian spelling, no em
  dashes, no invented facts, context-only claims) on every draft.

**Still open in Phase 5 scope:** Gemini and Claude adapters (need keys),
Google Workspace connected workflows (needs OAuth client), the ChatGPT and
Claude Code MCP servers (`apps/mcp-server`), action-proposal execution UI
on `ai_action_proposals`, prompt template management, per-client/user
spend caps, convert-to-content-brief/campaign/report flows, and connected
knowledge search over `documents`.

## Phase 6 — Advanced Automation (core complete, live-verified 2026-07-08)

**Built and verified against the live project:**

- Schema (migration `0017`): `automation_rules` (per-org, toggleable),
  `automation_runs` with a unique (org, rule, dedupe key) constraint —
  the database itself guarantees an automation never double-fires for the
  same subject — and `notifications` (users read/update only their own;
  internal members may notify members of their org).
- Engine primitives (`lib/automations/engine.ts`): fail-closed rule
  checks (missing rule = disabled), conflict-based dedupe, notification
  fan-out, owner escalation. Automations create tasks and notifications
  only — they never send email/SMS, publish, or spend.
- Event rules, fired inline from the owning actions: new lead →
  follow-up task + notification (verified live); approval decided →
  notify requester; page published → notify project owner; QA failed →
  notify page owner with the failing checks.
- Sweep rules, run from the Automations page (a scheduled caller can
  reuse `runSweep` as-is): invoice overdue (flips status + notifies
  finance owners), renewal due (contracts and retainers in their notice
  windows), task overdue (re-reminds at most weekly), stale touchpoint
  (30 days without notes/meetings → relationship task for the account
  manager, at most monthly, with a new-client grace period), ad spend
  anomaly (7-day spend with zero leads or ROAS under 1).
- Notifications bell in the top bar with unread badge, per-user targeting
  (verified: the specialist's task reminder went to the specialist, not
  the owner) and mark-all-read.
- Verified live: first sweep took 5 actions (2 renewals, 3 overdue
  tasks); an immediate second sweep took zero — dedupe holds.

**Still open in Phase 6 scope:** a scheduled caller (cron/Edge Function
invoking runSweep — the function is ready), the visual workflow builder,
scheduled monthly report drafts, campaign-launch checklists, KPI-under-
target tasks, client-request triage (needs the portal request form), and
the 27A nurture/booking/SMS flows below.

27A additions still open: nurture sequence engine (12 template flows
including the default 10-day cold-lead sequence with editable
timing/content), booking and show-up workflows (confirmations, reminders,
no-show recovery, reschedule, post-appointment follow-up), SMS compliance
layer (consent capture, opt-out, quiet hours, delivery status, reply
routing, human takeover) — all sends gated on human approval per the AI
action rules. Original scope list: workflow builder, event-triggered
automations, notifications, escalations,
scheduled reporting. Needs `automation_rules`, `automation_runs`,
`notifications`.
