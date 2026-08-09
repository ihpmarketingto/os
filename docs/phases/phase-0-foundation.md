# Phase 0 — Foundation

Read `/docs/CLAUDE.md` in full before starting. All rules there apply here
without exception.

## Build

- Authentication
- Organisation and role model (see CLAUDE.md §5 User Roles)
- Multi-tenant database with `organisation_id` / `client_id` scoping
- Row-level security on all tenant-scoped tables from the start
- Audit logging (create, update, delete, export, AI retrieval, external
  action events)
- App shell and navigation (CLAUDE.md §8 — build the shell for the full nav,
  even where sections are empty-state placeholders until later phases)
- Design system implementation (CLAUDE.md §8)
- Seed data scaffolding for the six recurring demo tenants (CLAUDE.md §10)
- Environment validation (strict, fails fast on missing/malformed vars)
- Error monitoring hooks (Sentry or equivalent)
- Feature-flag framework
- Integration framework (the extension point later phases plug into —
  Google Workspace, GitHub, Stripe, email providers, AI providers)
- AI provider router framework (routing skeleton only — no live provider
  calls yet; see Phase 5 for the full router)

## Schema (this phase)

At minimum: `users`, `organisations`, `organisation_members`, `roles`,
`permissions`, `activity_logs`. Add `secrets_metadata` if the integration
framework needs it this early for credential bookkeeping.

## Acceptance Criteria

- A user can sign up, log in, and land in an organisation-scoped session.
- RLS is verifiable: a user in Org A cannot read Org B's rows, proven by a
  test, not just by inspection.
- Every role in CLAUDE.md §5 exists and gates at least one real permission
  check.
- Every mutating action taken in this phase produces an audit log row.
- The app shell renders the full target navigation with correct empty
  states for sections not yet built.
- CI runs lint, typecheck, and the RLS/permission test suite on every push.

## Deliverable Format

Follow CLAUDE.md §2 (Phase Discipline) for what to report at the end of this
phase: what's built, what's mocked, migrations, env vars, tests, known
limitations, setup instructions, and readiness to start Phase 1.
