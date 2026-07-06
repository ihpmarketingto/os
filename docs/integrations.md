# Integration setup

Every integration is optional at boot (see `packages/config/src/env.ts`) —
the app runs fine with zero integrations configured; each one just shows as
"not connected" in **Settings > Integrations** until you add its env vars.

## GitHub (working OAuth flow)

1. Create a GitHub OAuth App at
   `https://github.com/settings/developers` (or a GitHub App, for finer
   scoping, in a later phase).
2. Authorization callback URL: `{APP_URL}/api/integrations/github/callback`.
3. Set `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` in
   `apps/web/.env.local`.
4. In the app, go to Integrations and click Connect on GitHub. The token is
   encrypted (`encryptSecret`, using `SECRETS_ENCRYPTION_KEY`) and stored in
   `secrets_metadata`; the connection status lands in
   `integration_connections`.

Scopes requested: `repo:status`, `public_repo` (read-only). Landing Page
Factory (Phase 4) will request `repo` only when a private repository is
explicitly selected, not by default.

## Google Workspace (working OAuth flow)

1. Create a project in Google Cloud Console, enable the APIs you need
   (Drive, Calendar to start), and create an OAuth 2.0 Client ID (Web
   application).
2. Authorized redirect URI:
   `{APP_URL}/api/integrations/google_workspace/callback`.
3. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.
4. Connect via Settings > Integrations. Default requested scopes are
   `drive.readonly` and `calendar.readonly` — see
   `packages/integrations/src/adapters/google-workspace.ts` for the full
   scope catalogue (`GOOGLE_WORKSPACE_SCOPES`) when a specific Phase 5
   workflow needs a broader one. Request the narrowest scope a workflow
   actually needs, not the broadest one available.

## AI providers (routing framework only — no live calls yet)

Set `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` to mark a
provider "configured" on the Home dashboard and in
`getIntegrationStatus()`. Phase 5 wires these into actual API calls through
`packages/ai-router`; Phase 0 only tracks configuration state.

## Everything else (Stripe, Meta Ads, Google Ads, Klaviyo, Vercel, Netlify,
Cloudflare Pages)

These have a registered `IntegrationAdapter` stub
(`packages/integrations/src/adapters/stub.ts`) that reports configuration
status honestly but implements no real API calls yet. They activate in the
phase noted on the Integrations page badge. Setting their env vars now is
harmless and future-proofs the config, but doesn't do anything yet.

## Adding a new integration

1. Add the provider to `IntegrationProviderSlug` in
   `packages/integrations/src/types.ts` and to the `provider` check
   constraint in `integration_connections` (new migration).
2. Implement `IntegrationAdapter` (see `github.ts` for the OAuth pattern,
   `stub.ts` for the placeholder pattern) and register it in
   `buildIntegrationRegistry`.
3. If it needs env vars, add them to `optionalIntegrationSchema` in
   `packages/config/src/env.ts` and to `.env.example`.
4. If it needs an OAuth callback, add it to the `SUPPORTED` list in
   `apps/web/src/app/api/integrations/[provider]/authorize/route.ts` and
   `.../callback/route.ts` rather than creating a bespoke route — the
   generic handler already does state-CSRF-check, token encryption, and
   audit logging.
