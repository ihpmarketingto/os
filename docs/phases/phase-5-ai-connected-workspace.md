# Phase 5 — AI and Connected Workspace

Read `/docs/CLAUDE.md` in full before starting, especially §6 AI Data Rules
and AI Action Rules — this phase implements the enforcement layer for both.

## IHP Intelligence — AI Provider Router

Provider-neutral architecture supporting OpenAI, Google Gemini, and
Anthropic Claude. Never hard-code the app to one provider. Router selects
by: task type, required capability, cost ceiling, latency preference,
client AI permission, data classification, availability, human-selected
preference.

**Provider profiles** (defaults the router should recommend toward, while
still allowing user override):

- **OpenAI** — structured outputs, agency workflows, ChatGPT MCP
  integration, report drafting, copy generation, tool calling, data
  analysis, client-specific AI assistant features.
- **Gemini** — Google Workspace-connected workflows, long document and
  multimodal analysis, Google ecosystem workflows, search-grounded research
  where enabled, structured extraction, function calling, image/document
  analysis where approved.
- **Claude** — code generation, code review, repository analysis, landing
  page implementation, long-form strategy, complex copy refinement,
  build-library analysis, project-level development workflows.

**Routing controls**: provider selection, model selection, fallback
provider, spend limit by organisation/client/user/workflow, rate limit,
retry strategy, failure fallback, usage reports, provider health status,
prompt templates, prompt versioning, client-specific instructions, model
performance notes.

**AI Modes**: implement Read / Draft / Action Proposal exactly as defined
in CLAUDE.md §6 — this is the enforcement point, not just documentation.

## AI Workspace

Dedicated interface: chat, client selector, project selector, campaign
selector, context preview, source citations, prompt templates, saved
prompts, response history, share to team, convert to task, convert to
content brief, convert to campaign draft, convert to report draft, convert
to proposal draft, request approval, feedback/revision controls, provider
selection, cost estimate, data-access warning.

Supported draft workflows: marketing strategies, brand audits, competitor
research, customer personas, funnel plans, Meta ads, Google ads, UGC
scripts, landing page copy, website copy, email campaigns, subject lines,
SEO audits, keyword clustering, content calendars, social copy, PR
pitches, press releases, influencer outreach, client report commentary,
meeting summaries, client follow-ups, proposal scopes, CRO ideas, growth
experiments, event promotion plans, local SEO recommendations.

## Client AI Profile

Per-client instructions: brand voice, spelling rules, tone, required
phrases, prohibited phrases, approved claims, prohibited claims,
competitors, target market, audience, offers, legal rules, regulatory
restrictions, CTAs, content restrictions, social/email/SEO/ad rules.

## Google Workspace Integration

OAuth 2.0, narrowest scopes necessary per user/workflow. Do not request
broad Gmail, Drive, or Calendar access unless specifically needed and
approved.

- **Gmail** — read permitted client threads, associate with CRM records,
  draft replies, create follow-up tasks, log history, search, send only
  after human approval, attach generated reports/files, templates,
  reminders.
- **Calendar** — view agency/client availability where permissioned,
  create internal meetings, draft client invitations, associate events
  with client records, reminders, follow-up task generation, agenda
  creation, meeting-note linkage.
- **Drive** — link files to clients, browse permitted folders, index
  documents, search, create client folder structures, track permissions,
  store document references, sync approved documents to IHP OS metadata.
- **Docs** — create report drafts, strategy documents, briefs, proposals,
  meeting agendas, campaign plans; link to clients/projects; export
  approved documents to PDF.
- **Sheets** — import reporting data, export reports, create campaign
  trackers, content calendars, budget trackers, event trackers, media
  lists, financial exports.
- **Meet** — store meeting link, link calendar meetings, attach meeting
  notes, associate to client timeline.

For every connection, show: connected user, granted scopes, connected
applications, client data accessible, last sync, sync errors, revoke
access option, re-authentication option, audit trail.

## MCP Connectors

**ChatGPT MCP** — remote MCP server for authorised IHP OS access via
ChatGPT. Read tools first: `search_clients`, `get_client_summary`,
`get_client_health`, `get_campaign_summary`, `get_tasks`,
`get_overdue_tasks`, `get_content_approvals`, `get_reports`,
`get_paid_media_performance`, `get_seo_performance`,
`get_email_performance`, `get_financial_summary`, `get_upcoming_renewals`,
`get_open_proposals`, `get_crm_pipeline`, `search_documents`,
`get_meeting_notes`, `get_event_summary`. Draft/write tools require
explicit confirmation: `create_task_draft`, `create_content_draft`,
`create_campaign_draft`, `create_crm_note_draft`, `create_follow_up_draft`,
`create_report_draft`, `update_task_status`, `request_client_approval`.

**Claude Code MCP** — repository context, Landing Page Factory, Build
Library search, project brief retrieval, brand profile retrieval,
component-library retrieval, QA retrieval, deployment status, pull request
creation proposal, draft code generation request. Per CLAUDE.md §6, must
never access secrets or production credentials.

**Gemini adapter** — Workspace document retrieval, long document analysis,
structured extraction, research workflows where explicitly enabled, image
and PDF analysis where approved, function calling into approved IHP OS
tools. Same role/client/audit model as other providers — no separate
permission path.

## Documents and Knowledge Base (full)

Index: client strategy, brand guides, campaign plans, reports, SEO audits,
paid media reports, website briefs, landing-page briefs, content calendars,
meeting notes, client feedback, contracts, proposals, press releases, event
documents, Replit READMEs, `replit.md` files, `CLAUDE.md` files, source-code
manifests, component manifests.

Every document: organisation, client, project, campaign, document type,
author, created date, status, access level, tags, AI access status, expiry
or retention status.

**AI outputs must cite internal sources used** — this is the point where
the Phase 1 document-upload stub gets wired into real citation tracking.

## Schema (this phase)

`integrations`, `integration_connections`, `integration_sync_logs`,
`document_chunks`, `ai_providers`, `ai_model_configs`,
`ai_prompt_templates`, `ai_runs`, `ai_source_citations`, `ai_usage`,
`ai_action_proposals`.

## Acceptance Criteria

Maps to Definition of Done items 12–14 in CLAUDE.md §11: connect at least
one development/test Google Workspace account, connect at least one
development/test AI provider, generate an AI draft with cited internal
sources. Verify by testing, not inspection, that no AI path can perform any
of the prohibited automatic actions listed in CLAUDE.md §6.

## Deliverable Format

Follow CLAUDE.md §2.
