# IHP OS

The agency operating system for IHP Marketing. Multi-tenant, RLS-secured,
built in phases. See [`docs/roadmap.md`](docs/roadmap.md) for what's built
and what's next, [`docs/architecture/operating-model.md`](docs/architecture/operating-model.md)
for the portable OS → Identity → App → Plugin → Task model, and
[`CLAUDE.md`](CLAUDE.md) for the durable build rules.

## Repository and deployment

Source of truth: `github.com/ihpmarketingto/os`. Production is on Vercel
(`ihp-os.vercel.app`), deploying automatically from `main`. Real secrets live
only in `.env.local` and Vercel's environment settings, never in the repo.

The deploy rhythm: commit locally, `git push`, and Vercel builds and ships
the change on its own. A failed build never replaces the last good one, so a
broken push cannot take production down.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) ·
Supabase (Postgres, Auth, Storage, RLS) · TanStack Query · Zod · Vitest.

## Repository layout

```
apps/web            Next.js app (the actual product)
packages/database   Supabase client factories, generated DB types, audit/permission/feature-flag helpers
packages/types       Shared Zod schemas and role/permission enums
packages/config      Environment variable validation
packages/integrations Integration adapter framework (GitHub, Google Workspace, ...)
packages/ai-router   AI provider routing framework (no live provider calls yet)
supabase/migrations  Database schema, in order, with RLS policies
scripts/seed.ts      Demo organisation + users + clients
docs/                Roadmap, operating-model architecture, permission model, integration setup
```

## Prerequisites

- Node.js 20+ (this repo was built and tested against Node 24).
- A Supabase project. Local Supabase (via the Supabase CLI + Docker) works
  too, but wasn't used to build this — the migrations are plain SQL and
  work against either.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com)
   (or run one locally with the Supabase CLI).

3. **Run the migrations**, in order, against your project — either via the
   Supabase SQL editor (paste each file in `supabase/migrations/`, in
   filename order) or with the Supabase CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

4. **Configure environment variables**

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   Fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your
   Supabase project settings. Generate `SECRETS_ENCRYPTION_KEY` with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Everything else in `.env.example` is optional — see
   [`docs/integrations.md`](docs/integrations.md).

5. **Seed demo data**

   ```bash
   npm run seed
   ```

   This creates a demo organisation, one user per system role, and six
   fictional clients. It prints sign-in credentials when it finishes.

6. **Run the app**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, sign in with a seeded user.

## Common commands

```bash
npm run dev         # apps/web dev server
npm run build        # apps/web production build
npm run lint          # eslint
npm run typecheck     # tsc --noEmit across every package
npm run test          # vitest across every package
npm run seed          # demo data (see above)
```

## Permission model

See [`docs/permissions.md`](docs/permissions.md). Short version: roles and
permissions live in Postgres, enforced by RLS, exposed to the app through a
`has_permission` RPC — never re-derive access rules purely in TypeScript.

## Security notes

- Every tenant-scoped table has `organisation_id` and RLS enabled.
- The service-role Supabase client (`@ihp/database/client-admin`) is
  server-only; the seed script and any future admin-only route are the only
  things that should import it.
- OAuth tokens are encrypted before they're stored (see
  `packages/database/src/secrets.ts`).
- Every mutating action writes to the append-only `audit_logs` table.
