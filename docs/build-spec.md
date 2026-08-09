> **Reference document — the original master build specification.**
>
> This is the spec IHP OS was built from, split into durable rules plus the
> seven phase prompts under `docs/phases/`. It is preserved here in full for
> provenance: every requirement in the original brief lives in this file or a
> phase file, nothing was cut.
>
> It is **not** the day-to-day build authority. The operational rules that
> evolved during the build — the concrete conventions, the gotchas that cost
> a session to find (the IPv6 pooler host, the Lightning CSS print-CSS trap,
> Base UI over Radix, `proxy.ts` over `middleware.ts`) — live in the root
> `CLAUDE.md`. When the two disagree, the root `CLAUDE.md` reflects what the
> codebase actually does; this file reflects what was originally asked for.

---

# CLAUDE.md — IHP OS Durable Build Rules

This file governs every phase of the IHP OS build. It does not expire or get
superseded by a phase prompt — if a phase prompt ever conflicts with this
file, this file wins. Read this file in full at the start of every session
before touching a phase prompt in `/docs/phases/`.

IHP OS is a production-grade, multi-tenant agency operating system for IHP
Marketing. It is not a static dashboard, Figma concept, admin template or
generic SaaS clone. It centralises the full operating model of an agency
providing strategy, paid media, SEO, website/landing-page development, CRO,
social content, email/lifecycle marketing, PR, influencer outreach, event
promotion, reporting, client management and AI-powered marketing systems —
across beauty, wellness, ecommerce, local services, hospitality, events,
SaaS, coaching and professional-service clients.

---

## 1. Product Principles

IHP OS must be:

- Multi-tenant and secure
- Agency-first, not generic SaaS
- Client-aware and permission-aware
- Operationally useful from day one
- Designed for high-volume agency delivery
- Built around approvals, accountability and auditability
- AI-assisted but never AI-uncontrolled
- Capable of becoming the internal system of record for IHP Marketing
- Able to connect safely to OpenAI, Gemini, Claude, Google Workspace, GitHub,
  Replit, ChatGPT and external marketing platforms
- Designed so new integrations can be added without rewriting the core
  application

At any point, the app must make it easy to see: what is selling, what needs
to be delivered, what is waiting on approval, what is performing, what is at
risk, what is profitable, what needs attention today, and what should happen
next.

---

## 2. Phase Discipline

Work happens in the phases defined in `/docs/phases/`. Do not build ahead of
the current phase, and do not skip a phase's acceptance criteria to reach a
later one. Each phase prompt is self-contained for *what* to build; this
file governs *how*.

Do not ask for clarification unless a technical credential, secret, domain,
or required external account is genuinely unavailable. When a product
decision is needed and this file or the phase prompt doesn't resolve it, use
the most conservative option consistent with the security rules below.

Do not return only an architecture document. Build the actual working
application: migrations, tests, seed data, real CRUD flows, permissions,
audit logs, working local setup.

At the end of every phase, deliver:

- What was built
- What is fully functional
- What is mocked
- What requires credentials
- Database migrations added
- Environment variables required
- Tests added
- Known limitations
- Setup instructions
- Recommended next phase

---

## 3. Technical Stack

- Next.js (App Router), TypeScript, React, Tailwind CSS, shadcn/ui
- Supabase: PostgreSQL, Auth, Storage, Row Level Security, Edge Functions
  (or secure server-side functions) where appropriate
- Prisma only if it materially improves maintainability and does not
  conflict with Supabase migrations
- TanStack Query, Zod validation, React Hook Form
- Recharts or equivalent chart library
- Sentry or equivalent error monitoring
- Stripe architecture for invoices, retainers, payment status
- Resend, SendGrid or Gmail API architecture for email workflows
- GitHub as the primary source of truth for source code
- Vercel as the default deployment target; support Replit, Netlify and
  Cloudflare Pages deployment workflows later

Every phase that touches code must include or update as relevant:
`.env.example`, strict environment validation, database migrations, seeds,
CI checks, linting, type checks, unit tests, integration tests for critical
workflows, end-to-end tests for primary user journeys, README setup
instructions, repository architecture documentation, API documentation,
permission model documentation, integration setup documentation.

---

## 4. Repository Structure

```
/apps
  /web
  /mcp-server
  /worker
/packages
  /ui
  /database
  /types
  /config
  /ai-router
  /integrations
  /landing-page-runtime
  /analytics
  /shared-utils
/docs
/scripts
/supabase
  /migrations
  /seed
```

The application must stay modular so that:

- IHP OS remains stable even if an AI provider is unavailable
- Landing-page code generation never alters the CRM application source code
- External integrations fail gracefully
- Client permissions are enforced consistently everywhere
- Generated landing pages can live in separate repositories, branches or
  workspaces from the core app
- AI prompts and outputs can be audited independently from operational data

---

## 5. User Roles

- **Agency Owner / Admin** — full access: all clients, finance, integrations,
  AI settings, team settings, permissions, templates, reports, source
  repositories, landing-page deployments, audit logs.
- **Account Manager** — assigned clients only: CRM, projects, tasks,
  campaigns, reports, content, client communication, client approvals. No
  unrestricted access to agency-wide finance, provider credentials, or other
  account managers' clients.
- **Specialist** — assigned workstreams only (paid media, SEO, social,
  email, web, PR, events, analytics).
- **Contractor** — assigned tasks, specified documents, assets and deadlines
  only. No financial access, no global client visibility, no integration
  configuration access.
- **Client Admin** — own organisation only: reports, projects, deliverables,
  content approvals, files, invoices, requests, selected campaign summaries,
  meetings, preview links.
- **Client Collaborator** — explicit permission-scoped actions only: approve
  content, review a report, view files, submit feedback, view a project.

---

## 6. Security and Data Governance

These controls are mandatory from Phase 0 onward, not deferred to a later
phase:

- Row-level security on all client-specific tables
- `organisation_id` on every tenant-scoped entity; `client_id` on all
  client-specific entities
- Role-based permission checks and assignment-based access checks
- Audit logging for create, update, delete, export, AI retrieval and
  external action events
- Soft deletes for business records
- Secure encrypted storage for OAuth tokens; secure secrets storage
- No API key exposure in the browser
- No production secrets stored in imported Replit or GitHub source code
- Rate limiting for public and AI endpoints
- CSRF protection where required
- Input validation with Zod
- File upload type validation
- Virus-scanning integration point for uploaded assets
- Download permissions for client files; expiring signed URLs for sensitive
  files
- Data retention settings; client data export capability; client data
  deletion workflow
- Incident log structure; backup and restoration documentation

### AI Data Rules

- Never send all client data to an AI provider by default. For every AI
  request, retrieve only the minimum authorised context necessary.
- Every AI interaction must record: user, client, sources accessed,
  provider, model, prompt, output, tool calls, estimated cost, timestamp,
  approval result, error result, and any generated draft or action.
- Client-level toggles required: AI enabled/disabled; OpenAI allowed; Gemini
  allowed; Claude allowed; Google Workspace source access allowed; financial
  data accessible to AI; contact data accessible to AI; contracts accessible
  to AI; documents accessible to AI; sensitive data excluded.

### AI Action Rules (non-negotiable, all phases)

Three modes only:

- **Read Mode** — AI can analyse permitted information.
- **Draft Mode** — AI can create drafts but cannot publish, send, alter
  budgets, issue invoices, or make irreversible changes.
- **Action Proposal Mode** — AI can prepare a proposed action that requires
  explicit human confirmation.

AI must never automatically: send client emails, publish content, publish
web pages, launch campaigns, change paid-media budgets, pause campaigns,
spend money, refund money, send invoices, sign contracts, delete data, alter
permissions, change billing information, invite users, or share confidential
data externally.

Claude Code (via MCP) must never access secrets or production credentials.

### Landing-Page Rules

- Never use imported Replit/GitHub code or old client copy as direct client
  output without verifying brand, legal, offer and tracking requirements.
- Never generate landing-page code directly inside the IHP OS production
  repository — use a dedicated landing-page repo, client-specific repo,
  branch, git worktree, or isolated deployment workspace. Require a pull
  request or approval before merging.
- Never generate a live production deployment without explicit human
  approval.
- Secret scanning and redaction required on all imported repositories/ZIPs
  for: OpenAI keys, Gemini keys, Anthropic keys, Stripe secret keys, Meta
  tokens, Google tokens, database URLs, SMTP credentials, OAuth secrets, JWT
  secrets, private keys. Never store an exposed secret.

### Deployment Rule

No production deployment — landing page or core app — without explicit
human approval logged in the audit trail.

---

## 7. Coding and Copy Standards

- **Canadian spelling throughout**, in all generated and client-facing copy.
- **Never use em dashes in client-facing or generated copy.**
- Semantic HTML, accessibility, and responsive layout are required on every
  generated page, not optional polish.
- Generated landing pages must include: SEO metadata, Open Graph metadata,
  image optimisation, form validation, error/success states, UTM capture,
  hidden lead-source fields, GA4 event hooks, Meta Pixel event hooks, Google
  Ads conversion hooks, CRM routing placeholders, cookie-consent
  compatibility.

---

## 8. Design System

Avoid: generic admin dashboards, excessive gradients, oversized rounded
cards, empty decorative space, consumer-app styling, generic stock-style
dashboard widgets.

Use: strong typography, clean hierarchy, dense-but-breathable information
design, neutral premium palette, accessible contrast, contextual charts,
crisp data tables, command palette, search, keyboard shortcuts, dark mode,
mobile-responsive and responsive-table views, contextual empty states, and a
clear visual distinction between internal and client-facing views.

Organisation theme settings must be editable: logo, favicon, accent colour,
typography options, email header/footer, client portal branding.

Target primary navigation (built out incrementally across phases): Home,
CRM, Clients, Projects, Tasks, Content Studio, Campaigns, Paid Media, SEO,
Website and CRO, Email and Lifecycle, PR/Influencers/Partnerships, Events,
Reports, Finance, Landing Page Factory, Documents and Assets, Automations,
AI Intelligence, Client Portal, Integrations, Settings.

---

## 9. Target Database Model (reference)

This is the full target schema. No single phase builds all of it — each
phase prompt specifies which subset it adds. Use this list for naming
consistency across phases: `users`, `organisations`, `organisation_members`,
`roles`, `permissions`, `clients`, `contacts`, `leads`, `deals`,
`proposals`, `contracts`, `retainers`, `invoices`, `payments`, `projects`,
`milestones`, `tasks`, `task_templates`, `campaigns`, `campaign_metrics`,
`content_items`, `content_assets`, `approvals`, `documents`,
`document_chunks`, `meetings`, `notes`, `service_packages`,
`client_services`, `integrations`, `integration_connections`,
`integration_sync_logs`, `reports`, `report_snapshots`, `influencers`,
`media_contacts`, `outreach`, `events`, `event_attendees`,
`landing_page_projects`, `landing_page_briefs`, `build_library_projects`,
`reusable_components`, `page_versions`, `qa_runs`, `deployments`,
`experiments`, `automation_rules`, `automation_runs`, `notifications`,
`activity_logs`, `ai_providers`, `ai_model_configs`, `ai_prompt_templates`,
`ai_runs`, `ai_source_citations`, `ai_usage`, `ai_action_proposals`,
`secrets_metadata`.

Use foreign keys, indexing, timestamps, audit fields, and soft-delete
support on every table.

---

## 10. Seed Data Standard

Every phase that adds entities must seed realistic fictional data across six
recurring demo tenants: a beauty and wellness business, an ecommerce
skincare brand, a local electrical-service company, a ticketed
performance/event, an AI/technology company, and a coaching or SaaS
marketplace. Extend the same six tenants across phases rather than inventing
new ones, so cross-phase demo data stays coherent (e.g. the electrical
company's leads in Phase 1 should be the same company with invoices in
Phase 2 and campaigns in Phase 3).

---

## 11. Definition of Done (v1)

The first usable version of IHP OS — reached across Phases 0–1 at minimum,
with Phase 4–5 items required for full completion — is complete only when an
Agency Owner can:

1. Log in securely.
2. Create a lead and move it through a sales pipeline.
3. Convert it into a client.
4. Generate an onboarding project from a template.
5. Assign tasks.
6. Create a campaign.
7. Create content and send it for client approval.
8. Upload and organise documents.
9. Create a report draft.
10. Track invoice status.
11. View client health and profitability.
12. Connect at least one development/test Google Workspace account.
13. Connect at least one development/test AI provider.
14. Generate an AI draft with cited internal sources.
15. Import a GitHub or Replit project safely.
16. Create a landing-page brief.
17. Generate a landing-page plan and code draft.
18. Create a preview deployment workflow.
19. Run QA before publish.
20. Have every relevant action recorded in an audit trail.

---

## 12. Phase Index

| Phase | File | Covers |
|---|---|---|
| 0 | `phases/phase-0-foundation.md` | Auth, org/role model, multi-tenant DB, RLS, audit log, app shell, design system, seed data, integration + AI router frameworks |
| 1 | `phases/phase-1-core-agency-operations.md` | CRM, Client 360, Projects, Tasks, Content Studio, Approvals, Documents, Meetings, client health, basic + full client portal |
| 2 | `phases/phase-2-commercial-operations.md` | Proposals, Contracts, Retainers, Invoices, Profitability, Capacity, Renewals, Forecasting |
| 3 | `phases/phase-3-marketing-delivery.md` | Campaigns, Paid Media, SEO, Website/CRO, Email/Lifecycle, PR/Influencers/Events, Reports |
| 4 | `phases/phase-4-landing-page-factory.md` | GitHub/Replit ingestion, Build Library, Component Library, brief builder, generation, deployment, QA |
| 5 | `phases/phase-5-ai-connected-workspace.md` | AI provider router, Google Workspace, ChatGPT/Claude/Gemini MCP connectors, knowledge base |
| 6 | `phases/phase-6-advanced-automation.md` | Workflow builder, triggers, notifications, escalations, scheduled reporting |

Start with Phase 0, then continue into Phase 1 without waiting for another
prompt, unless blocked by a missing credential or unavoidable external
configuration requirement.
