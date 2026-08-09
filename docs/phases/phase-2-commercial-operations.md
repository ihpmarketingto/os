# Phase 2 — Commercial Operations

Read `/docs/CLAUDE.md` in full before starting.

## Build

Proposals (full, beyond the status stub from Phase 1), Contracts (full),
Retainers, Invoices, Payment tracking, Profitability, Team capacity,
Contractor costs, Renewal tracking, Scope creep alerts, Revenue
forecasting.

### Finance and Profitability

Track: retainers, one-time projects, proposals, contracts, invoices,
payments, outstanding balances, payment terms, ad spend, contractor costs,
internal labour cost, billable hours, non-billable hours, revenue by client,
revenue by service, revenue by industry, monthly recurring revenue, churn,
renewal forecast, profitability by client, scope creep.

**Client profitability formula**: revenue minus contractor costs minus
internal labour costs minus delivery software allocation minus paid media
management cost allocation equals gross contribution margin. Implement this
as a real computation over actual logged hours/costs, not a manual entry
field.

Dashboards/reports: finance dashboard, client profitability dashboard,
retainer forecast, outstanding invoice report, churn risk report, renewal
report, scope-creep report, capacity forecast.

## Schema (this phase)

`proposals` (full), `contracts` (full), `retainers`, `invoices`,
`payments`. Extend `projects` and `tasks` with the cost/hour fields needed
for the profitability formula if not already present from Phase 1.

## Integration Note

Use Stripe architecture for invoice/retainer/payment status per CLAUDE.md
§3. Do not implement live money movement — invoice and payment *tracking*
only. Actual fund transfer, refunds, and billing changes remain prohibited
to AI automation per CLAUDE.md §6 regardless of what this phase builds.

## Acceptance Criteria

Maps to Definition of Done items 10–11 in CLAUDE.md §11: an Agency Owner can
track invoice status and view client health *and profitability* together.
Client 360 (Phase 1) should now show real profitability data instead of the
Phase 1 placeholder.

## Deliverable Format

Follow CLAUDE.md §2.
