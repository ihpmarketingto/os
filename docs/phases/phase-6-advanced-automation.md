# Phase 6 — Advanced Automation

Read `/docs/CLAUDE.md` in full before starting.

## Build

Automation framework with triggers, conditions and actions.

Workflow builder, event-triggered automations, notifications, escalations,
scheduled reporting, approval reminders, renewal alerts, campaign anomaly
alerts, CRM follow-up logic.

## Core Automations

- New lead created → create follow-up task
- Proposal sent → create follow-up reminder
- Deal won → create onboarding project
- Contract nearing renewal → notify owner
- Invoice overdue → create reminder workflow
- Content ready for review → notify client
- Content approved → move to scheduling
- Campaign launch approaching → show launch checklist
- Ad spend anomaly → notify account manager
- KPI under target → create optimisation task
- Month-end → prepare report draft
- Task overdue → notify owner
- No client touchpoint in 30 days → create relationship task
- Landing page QA fails → block publish
- Deployment succeeds → notify project owner
- Client request submitted → create triage task

Every automation that creates, sends, or publishes anything is still
subject to the AI Action Rules and approval requirements in CLAUDE.md §6 —
"automated" does not mean "unapproved." An automation rule may create a
draft or a task; it may not send, publish, or spend without the same human
confirmation step required elsewhere.

## Schema (this phase)

`automation_rules`, `automation_runs`, `notifications`.

## Acceptance Criteria

Trigger each core automation above in a test environment and confirm: (a)
it fires on the correct condition, (b) it does not bypass any approval gate
from CLAUDE.md §6, and (c) it produces an audit log entry.

## Deliverable Format

Follow CLAUDE.md §2.
