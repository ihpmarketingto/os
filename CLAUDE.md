# CLAUDE.md — IHP OS build instructions

Durable rules for anyone (human or AI) continuing work on IHP OS. Read this
before adding a table, a page, an integration, or an AI workflow.

## What this is

IHP OS is IHP Marketing's multi-tenant agency operating system, built in
phases (see `docs/roadmap.md`). Phase 0 (foundation: auth, org/role model,
RLS, audit log, app shell, feature flags, integration framework, AI router
framework) is complete. Later phases build on it without rewriting it.

## Architecture rules

- Monorepo: `apps/web` (Next.js App Router), `packages/*` (shared logic),
  `supabase/migrations` (schema, source of truth for the database).
- The portable operating-model docs live in
  `docs/architecture/operating-model.md` and `docs/architecture/README.md`.
  Read them before adding a new AI workflow, identity layer, client adapter,
  task-routing path or learning-promotion mechanic.
- Business logic lives in `packages/*`, not inside `apps/web`. The Next.js
  app is a consumer of `@ihp/database`, `@ihp/types`, `@ihp/config`,
  `@ihp/integrations`, `@ihp/ai-router` — it should not reimplement
  permission checks, audit logging, or provider routing locally.
- `packages/database/src/types.gen.ts` must always match the migrations. It
  is hand-written today because there is no live Supabase project yet; once
  one exists, regenerate it with `supabase gen types typescript` and delete
  the "hand-written" comment at the top of that file. Every table type needs
  a `Relationships: [...]` field — omitting it breaks Supabase client type
  inference silently (see `GenericTable` in `@supabase/postgrest-js`).
- New integrations implement the `IntegrationAdapter` interface in
  `packages/integrations/src/types.ts` and register in
  `packages/integrations/src/registry.ts`. A missing or misconfigured
  integration must degrade to a health-check failure, never a crash.
- New AI task types register in `PROVIDER_TASK_AFFINITY` in
  `packages/ai-router/src/types.ts`, not as one-off provider calls scattered
  through the app.
- Landing Page Factory (Phase 4) generates code into a separate repository,
  client-specific repository, or branch/worktree — never directly into this
  repository's `apps/web` source tree.

## Security and data-isolation rules

- Every tenant-scoped table has `organisation_id`; every client-scoped table
  additionally has `client_id`. Row Level Security is mandatory on every new
  table — write the migration with RLS enabled and policies in the same file
  that creates the table, not as a follow-up.
- Use the `private.*` SQL helper functions (`is_org_member`,
  `is_internal_member`, `is_agency_owner`, `can_access_client`,
  `has_permission`) in new RLS policies instead of re-deriving membership
  logic inline — they exist specifically to avoid recursive-RLS bugs.
- Never import `packages/database/src/client-admin.ts` (service role) into
  anything that ships to the browser. It throws if `window` is defined, but
  don't rely on that — it's a last-resort guard, not a design.
- OAuth tokens and API keys are encrypted with `encryptSecret` before being
  written to `secrets_metadata.encrypted_value`. Never store a plaintext
  secret in Postgres, even behind RLS — RLS protects row visibility, not
  what's inside the row.
- Every create, update, delete, export, `ai_retrieve`, and `external_action`
  must call `writeAuditLog`. Audit log rows are immutable by design — there
  is no update/delete RLS policy on `audit_logs`. Don't add one.
- Soft-delete business records (`deleted_at`), don't hard-delete them.

## AI action rules

- Three modes only: `read`, `draft`, `action_proposal`. AI may never
  automatically send emails, publish content or pages, launch or pause
  campaigns, change budgets, spend or refund money, send invoices, sign
  contracts, delete data, alter permissions, change billing, invite users, or
  share confidential data externally. See `IRREVERSIBLE_ACTIONS` in
  `packages/ai-router/src/types.ts` — that list is the source of truth.
- Call `assertActionAllowed` before creating any `ai_action_proposals` row.
  Execution of a proposal only happens after a human sets
  `status = 'approved'` on that row — never wire an approval straight to
  execution in the same code path.
- Every AI run is recorded in `ai_runs` with user, client, provider, model,
  prompt, output, cost estimate, and mode. Cite sources in
  `ai_source_citations` — don't ship an AI answer with no citation trail.
- Respect the client's AI settings (`clients.ai_enabled`, `ai_settings`
  JSON) before routing any request for that client. `selectProvider` throws
  `AiRoutingError` if AI is disabled — don't catch that and silently
  fall back to sending the request anyway.

## Landing Page Factory rules (Phase 4, not yet built)

- Source-of-truth hierarchy: GitHub source code > approved IHP component
  packages > approved brand profile > approved brief > approved assets/copy
  > Replit metadata/READMEs > historical performance data > AI
  recommendations. A README or `replit.md` is instructions and context, not
  a template to copy verbatim.
- Never treat imported code or old copy as client-ready output without
  verifying brand, legal, offer, and tracking requirements first.
- Never generate a production deployment without an explicit human approval
  step recorded in the database. Preview deployments are fine; production is
  not automatic.
- Secret-scan every imported repository/ZIP before indexing it. Redact, log,
  and refuse to store anything that looks like a live credential.

## Coding standards

- Canadian spelling in all client-facing and generated copy (colour,
  organisation, centre, behaviour, licence as a noun). This applies to UI
  copy, seed data, and anything an AI workflow drafts for a client — not
  necessarily to third-party library names or code identifiers.
- No em dashes in client-facing or generated copy. Use a comma, a colon, or
  two sentences instead.
- Zod v4 is in use, not v3 — `z.record()` needs two type arguments
  (`z.record(z.string(), z.unknown())`), and there's no `z.string().email()`
  preference over `z.email()`. Check `node_modules/zod/v4` before assuming a
  v3 pattern still applies.
- This project uses Base UI (`@base-ui/react`) via shadcn/ui, not Radix.
  Polymorphic rendering uses `render={<a href="...">...</a>}`, not
  `asChild` + a child element. `TooltipProvider` takes `delay`, not
  `delayDuration`.
- Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` with an
  exported function named `proxy` (not `middleware`). Check
  `node_modules/next` for the current convention before assuming Next 15
  patterns still apply — this repo was scaffolded with a version newer than
  most training data.
- Server-only code (anything touching `SUPABASE_SERVICE_ROLE_KEY` or other
  secrets) imports the `server-only` package as its first line. Public env
  vars go through `src/lib/env/public.ts`; everything else through
  `src/lib/env/server.ts`.
- Tailwind v4 compiles CSS with Lightning CSS, which **silently drops** rules
  it cannot parse rather than failing the build. An `@page` nested inside
  `@media print` took the whole print block with it. After editing
  `globals.css` by hand, fetch the served stylesheet and grep for your
  selector instead of trusting that the source file is enough.

## Testing rules

- Pure logic (env validation, permission/routing decisions, role
  classification) gets unit tests in the package that owns it
  (`packages/*/src/*.test.ts`, run with Vitest). Don't skip this because
  "it's obvious" — `selectProvider`'s fallback order and
  `assertActionAllowed`'s gating are exactly the kind of logic that breaks
  silently on a refactor without a test catching it.
- `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`
  must all pass before considering a change complete. CI (`.github/workflows/ci.yml`)
  enforces this on every push and PR.
- Test against a real (even if empty) Supabase project when validating RLS
  policies — the app's TypeScript layer cannot catch an RLS policy that's
  too permissive or too restrictive. Placeholder env vars are enough to
  validate the app boots and builds, not enough to validate the database.

## Deployment rules

- Vercel is the default target for `apps/web`. Landing pages generated by
  Phase 4 deploy to their own repository/project, previewed before
  production, never sharing a deployment with the core app.
- Migrations are additive and ordered (`supabase/migrations/000N_*.sql`).
  Don't edit a migration that may have already run somewhere — write a new
  one.
- `DATABASE_URL` points at the **connection pooler**
  (`aws-1-ca-central-1.pooler.supabase.com:5432`, user
  `postgres.<project-ref>`), not at `db.<project-ref>.supabase.co`. The
  direct host is IPv6-only, so on any network without IPv6 egress it fails
  with `getaddrinfo ENOTFOUND` even though the REST API keeps working over
  IPv4 — which makes it look like the project is down when it isn't. Use
  port 5432 (session mode) for migrations; 6543 is transaction mode and
  doesn't hold prepared statements across a DDL batch.
