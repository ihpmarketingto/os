# IHP OS operating model

## Purpose

This document formalises the portable operating model for IHP OS:

**OS → Identity → App → Plugin → Task**

The goal is to extend the existing IHP OS repository, not to rename or
replace the system that already works. Client-specific truth remains in
client-scoped records and approved sources. The universal operating system
remains stable and governable.

## Canonical model

### OS

The OS is the universal governance layer. In the current repository it is
already expressed through:

- Supabase RLS and tenant scoping
- `has_permission` / `requirePermission`
- append-only `audit_logs`
- irreversible-action gating in `@ihp/ai-router`
- approval workflows for content, reports and landing pages
- versioned landing page rollback and deployment history
- feature flags, migrations, tests, and build validation

The default operating mode remains `shadow`.

The progression remains:

1. Authority and source control
2. Shadow mode
3. Approval mode
4. Guardrailed execution

Missing authority still means no action. Unknown thresholds stay `UNSET`.

### Identity

Identity represents whose perspective, judgement, knowledge, values or voice
is being used.

The repository already had fragments of identity in:

- `profiles`
- `clients.brand_kit`
- `knowledge_entries.kind = 'brand_voice'`
- client and portal roles

What was missing was a formal identity registry. That foundation now exists
in the new `identity_registry` contract and table.

### App

An App is the stable business domain that organises related plugins. In the
current codebase, sidebar modules already act as domain boundaries. The new
App manifests formalise that boundary without renaming the Next.js `apps/`
workspace layout.

### Plugin

A Plugin is a bounded capability within an App.

Examples already present in the repository:

- `landing_page_factory`
- `source_routing`
- `ai_draft_workspace`
- `metrics_interpretation`
- `strategy_drafting`

### Task

The repository already had work-item tasks (`public.tasks`) and AI work logs
(`public.ai_runs`), but not a formal routing envelope. The new `task_envelopes`
table and contract carry:

- client context
- selected App and Plugin
- operating mode
- authority and permission state
- approval requirements
- source references
- audit references

### Client Adapter

The repository already had client-scoped settings spread across:

- `clients`
- `client_assignments`
- `clients.ai_settings`
- integration connections
- client-specific knowledge, documents and approvals

The new `client_adapters` table formalises the per-client contract without
copying the universal OS into every client record.

### Source Steward

The repository already had meaningful Source Steward behaviour in:

- `knowledge_entries`
- `ai_source_citations`
- `ai_knowledge_citations`
- landing page validation and QA

What was missing was a durable approval-gated path from raw evidence to
promoted learning. That is now represented by:

- `learning_proposals`
- `source_lineage_records`
- `evaluation_records`

## Existing-to-new architecture mapping

### OS

- Existing: `packages/database`, RLS helpers, `audit_logs`, `feature_flags`, `@ihp/ai-router`, `CLAUDE.md`
- New foundation: documented operating model and shared contracts in `@ihp/types`
- Status: **implemented**

### Identity

- Existing: `profiles`, client brand settings, brand-voice knowledge entries
- New foundation: `identity_registry`
- Status: **scaffolded**

### App

- Existing: sidebar modules and business-domain pages
- New foundation: App manifests in `packages/types/src/operating-model.ts`
- Status: **implemented**

### Plugin

- Existing: Landing Page Factory, AI draft flow, knowledge retrieval, reporting logic
- New foundation: Plugin manifests and bounded contracts in `packages/types/src/operating-model.ts`
- Status: **implemented**

### Task

- Existing: `tasks`, `ai_runs`, content/report/page workflows
- New foundation: `task_envelopes`
- Status: **implemented**, with the AI draft workflow integrated first

### Client Adapter

- Existing: clients, assignments, AI settings, integration scope
- New foundation: `client_adapters` plus placeholder template
- Status: **scaffolded**

### Source Steward

- Existing: knowledge base, citations, landing page source-context validation
- New foundation: `learning_proposals` and `source_lineage_records`
- Status: **implemented** for data contracts, **partially integrated** for runtime lineage in AI Draft mode

### QA and evaluation

- Existing: `approvals`, `qa_runs`, report review workflow, landing-page publish gate
- New foundation: `evaluation_records`
- Status: **scaffolded**, existing QA remains authoritative

### Reliability

- Existing: migrations, build checks, RLS, audit logs, landing-page versions, deployments, experiments
- New foundation: explicit version fields across identity, client adapter and learning contracts
- Status: **implemented**

## Current capability mapping

### Landing Page Factory

- App: `web_funnel_builds`
- Plugin: `landing_page_factory`
- Existing sources of truth:
  - `landing_page_briefs`
  - `landing_page_projects`
  - `landing_page_versions`
  - `qa_runs`
  - `approvals`
  - `deployments`
- Why it fits: it is already a bounded, approval-gated build system with QA,
  rollback and client isolation.

### AI Intelligence draft mode

- App routes:
  - `report_drafting` → `reporting_measurement` / `metrics_interpretation`
  - `copy_generation` → `content_communications` / `ai_draft_workspace`
  - `client_follow_up` → `content_communications` / `ai_draft_workspace`
  - `long_form_strategy` → `decisions` / `strategy_drafting`
- New runtime integration:
  - task envelope recorded after a successful draft
  - source lineage recorded for prompt inputs that materially influenced the draft
  - client adapter validation enforced when an adapter exists
  - draft mode remains `shadow`, not execution

## What was added

### Implemented

- Canonical operating-model contracts in `packages/types/src/operating-model.ts`
- Validation helpers for registry integrity, client adapter checks, task gating and learning-promotion gating
- Tests for client isolation, missing authority, invalid manifests and unapproved learning promotion
- New foundation tables:
  - `identity_registry`
  - `client_adapters`
  - `task_envelopes`
  - `learning_proposals`
  - `source_lineage_records`
  - `evaluation_records`
- AI Draft mode integration with task envelopes and source lineage

### Scaffolded

- Identity registry runtime population
- Client adapter authoring workflow
- Learning-proposal review UI
- Evaluation-record authoring outside existing landing-page QA and approvals

### Deferred

- Automatic identity contribution tracking
- Cross-workflow task-envelope adoption outside AI Draft mode
- Runtime promotion of approved learning into manifests or knowledge entries
- Dedicated operating-model UI pages

### Requires approval

- Any workflow that would move from shadow drafting into execution
- Any automatic learning application
- Any changes to Sarah approval boundaries or operating-mode defaults

## Compatibility notes

- Existing modules keep their current names and routes.
- `public.tasks` remains the work-item system of record.
- `public.ai_runs` remains the AI interaction log of record.
- The Task Envelope adds traceability without replacing either.
- Existing approvals and QA workflows remain authoritative.
- The new contracts are additive. No working feature was deleted or renamed.

## Review and test commands

Run these from the repository root:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

If a live Supabase project is connected, inspect the new foundation tables and
the existing AI Draft flow after a run:

```sql
select id, selected_app, selected_plugin, operating_mode, current_status
from public.task_envelopes
order by created_at desc
limit 10;

select source_type, usage, source_client_id
from public.source_lineage_records
order by created_at desc
limit 20;
```
