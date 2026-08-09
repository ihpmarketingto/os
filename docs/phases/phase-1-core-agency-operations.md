# Phase 1 — Core Agency Operations

Read `/docs/CLAUDE.md` in full before starting, and confirm Phase 0's
acceptance criteria are actually met before building on top of it — RLS and
audit logging in particular, since every entity below is tenant-scoped.

## Build

### Home Dashboard

Strategic executive dashboard. Wire up what this phase's data supports now;
leave clearly-marked placeholders for the rest (Finance in Phase 2,
Campaigns/Paid Media/SEO in Phase 3) rather than faking numbers.

Display: monthly recurring revenue, active retainers, pipeline value,
revenue forecast, outstanding invoices, upcoming renewals, client health
summary, accounts at risk, tasks due this week, overdue tasks, deliverables
awaiting approval, campaign launch deadlines, paid-media anomalies, SEO
opportunities, recent client activity, team capacity, utilisation,
profitability by client, scope-creep alerts, latest leads.

Quick actions: add lead, create proposal, add client, start onboarding,
create campaign, create project, add task, create content brief, generate
report draft, log client call, create invoice draft, request approval,
build landing page brief. Wire each action to its real flow if that flow
exists in this phase (lead, client, project, task, content brief); route
the rest to a "coming in Phase N" state rather than a dead button.

### CRM

Entities: companies, contacts, leads, opportunities, deals, notes, calls,
meetings, emails, proposals (status only — full commercial detail is Phase
2), contracts (status only — full detail Phase 2), activities, follow-ups,
tags, custom fields.

Deal stages: New Lead, Qualified, Discovery Call Booked, Discovery
Completed, Proposal Sent, Negotiation, Verbal Yes, Contract Sent, Closed
Won, Closed Lost, Nurture.

Features: pipeline Kanban, pipeline table, lead source tracking, contact
timeline, call notes, discovery call template, opportunity scoring,
next-step reminders, proposal status, contract status, win/loss reasons,
revenue estimate, retainer value, project value, expected close date,
service interest, industry, referral tracking, tags, custom fields, search,
bulk updates, import/export, duplicate detection, follow-up automation.

**Lead score**: configurable, using budget fit, service fit,
decision-maker access, urgency, industry fit, existing marketing maturity,
website quality, referral source, engagement, proposal activity, fit with
IHP's service model.

### Client 360

Full client profile: overview, contacts, industry, locations, website,
social handles, brand profile, brand kit, services purchased, retainer
details, contract details, invoice status (placeholder until Phase 2),
renewal date, notice period, current projects, tasks, campaigns (placeholder
until Phase 3), content calendar, documents, approvals, meeting notes,
communication history, client feedback, risks, blockers, recommendations,
client health, profitability (placeholder until Phase 2), integration
status, AI usage (placeholder until Phase 5), landing pages (placeholder
until Phase 4).

**Client health score**: revenue trend, retainer status, invoice status,
approval delays, communication frequency, open issues, campaign performance,
task completion, scope creep, contract renewal proximity, client sentiment,
relationship recency. Show score, explanation, and recommended action —
this must be a real computed score with an inspectable breakdown, not a
static badge.

### Projects and Tasks

Project fields: client, service type, project type, budget, timeline,
owner, team members, milestones, dependencies, status, scope, attachments,
related campaigns/reports/documents, client visibility setting,
profitability tracking (placeholder until Phase 2).

Task fields: client, project, campaign (placeholder), category, priority,
assignee, reviewer, due date, start date, estimated hours, actual hours,
billable status, checklist, dependencies, attachments, comments, recurrence,
client visibility, automation triggers (placeholder until Phase 6), time
tracking, status.

Task statuses: Not Started, In Progress, Waiting on Internal Review, Waiting
on Client, Blocked, Complete, Cancelled.

Templates: client onboarding, paid ads launch, website launch, landing page
launch, SEO onboarding, monthly reporting, social production, influencer
campaign, event promotion, email campaign, Google Business Profile setup,
retainer renewal, website audit, CRO experiment.

### Content Studio

Statuses: Idea, Brief Needed, In Production, Internal Review, Client
Review, Revisions, Approved, Scheduled, Published, Archived.

Fields: client, campaign, platform, content type, objective, target
audience, hook, caption, CTA, brief, asset links, owner, reviewer, approver,
due date, publish date, approval status, version history, comments,
performance metrics (placeholder until Phase 3).

Views: calendar, Kanban, table, by client, by campaign, by platform, by
owner, approval queue, overdue queue, published performance view.

Content types supported: reels, static posts, carousels, TikTok concepts,
UGC scripts, LinkedIn posts, email content, blogs, PR assets, event
promotion, paid ad creative, story sequences.

### Documents (basic)

Upload, tag, and link documents to organisation/client/project/campaign.
Access level and status fields required now; AI-access status and citation
plumbing come in Phase 5 — leave the field but don't wire it up yet.

### Client Portal (basic + full)

Clients can: view reports (placeholder data until Phase 3), view active
projects, view deliverables, approve content, request revisions, access
approved documents, view invoices (placeholder until Phase 2), submit
requests, view meetings, access preview links, view selected campaign data
(placeholder until Phase 3), download files.

Clients cannot: access internal comments, internal profitability, other
clients, raw code (unless approved), tracking/integration settings, publish
pages, AI prompts or internal AI analysis, team availability unless
explicitly shared.

## Schema (this phase)

`clients`, `contacts`, `leads`, `deals`, `proposals` (status fields only),
`contracts` (status fields only), `projects`, `milestones`, `tasks`,
`task_templates`, `content_items`, `content_assets`, `approvals`,
`documents`, `meetings`, `notes`, `service_packages`, `client_services`.

## Seed Data

Extend the six demo tenants from Phase 0 with realistic leads, deals,
projects, tasks, and content items per CLAUDE.md §10.

## Acceptance Criteria

Maps to Definition of Done items 1–11 in CLAUDE.md §11: an Agency Owner can
log in, create a lead, move it through the pipeline, convert it to a
client, generate an onboarding project from a template, assign tasks,
create content and send it for client approval, upload and organise
documents, create a report draft (stub acceptable — real reporting is Phase
3), and view client health.

## Deliverable Format

Follow CLAUDE.md §2.
