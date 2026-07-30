# Deployment

## GitHub (source of truth)

The repository pushes to a private GitHub repo. History was secret-scanned
before the first push: credentials live only in `apps/web/.env.local`,
which has been gitignored since the first commit.

```bash
git remote add origin https://github.com/<owner>/ihp-os.git
git push -u origin main
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on
every push and pull request using placeholder env values; no secrets are
needed in GitHub Actions.

## Vercel (production hosting for apps/web)

**Live**: https://ihp-os.vercel.app (team `ihp1`, project `ihp-os`), first
deployed 2026-07-09.

Build configuration lives in `vercel.json` at the repo root rather than in
dashboard settings, so it is versioned and reproducible: the project
deploys from the repo root (giving the build access to the workspace
packages in `packages/`) and builds `apps/web` via the npm workspace.

`APP_URL` is set explicitly for production. When it is absent, the config
loader falls back to `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`, so
preview deployments stay self-consistent instead of redirecting to
production or failing env validation.

Deploy from the CLI:

```bash
vercel deploy --prod
```

### Production environment variables

Copy values from `apps/web/.env.local` except where noted:

| Variable | Value |
| --- | --- |
| `APP_URL` | The production URL, e.g. `https://ihp-os.vercel.app` (not localhost) |
| `NEXT_PUBLIC_APP_URL` | Same as `APP_URL` |
| `SUPABASE_URL` | as local |
| `SUPABASE_ANON_KEY` | as local (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | as local (`sb_secret_...`) — mark Sensitive |
| `NEXT_PUBLIC_SUPABASE_URL` | as local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | as local |
| `SECRETS_ENCRYPTION_KEY` | as local — mark Sensitive. Changing it orphans already-encrypted OAuth tokens |
| `OPENAI_API_KEY` | as local — mark Sensitive |

`DATABASE_URL` is NOT needed on Vercel — it is only used by local scripts
(`npm run migrate`, `npm run seed`, `npm run invite`).

### After the first deploy

1. **Supabase auth URLs** (Dashboard > Authentication > URL Configuration):
   set Site URL to the production URL and add
   `https://<production-domain>/auth/callback` and
   `https://<production-domain>/auth/confirm` to the redirect allowlist.
   Without this, magic links issued in production redirect to localhost.
2. Sign in at the production URL with a magic link to
   `sarah@ihpmarketing.com` and confirm the owner dashboard loads.
3. Custom domain (e.g. `os.ihpmarketing.com`): add it in Vercel, then
   update `APP_URL`, `NEXT_PUBLIC_APP_URL`, and the Supabase auth URLs to
   match.

### Deploy cadence

Vercel auto-deploys `main` on every push and creates preview deployments
for branches/PRs. Database migrations do NOT run automatically — run
`npm run migrate` locally (or from CI later) before merging schema
changes, since the live database is shared by all deployments.
