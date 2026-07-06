# Integration setup

Every integration is optional at boot (see `packages/config/src/env.ts`) —
the app runs fine with zero integrations configured; each one just shows as
"not connected" in **Settings > Integrations** until you add its env vars.

## Integration classification (spec section 27A)

| Provider | Kind | Status | Credentials required before activation |
| --- | --- | --- | --- |
| GitHub | Native | Working OAuth flow | OAuth client ID + secret |
| Google Workspace | Native | Working OAuth flow | OAuth client ID + secret |
| Stripe | Native | Planned (Phase 2) | Secret key, webhook secret |
| Resend / SendGrid | Native | Planned (Phase 1+) | API key |
| Meta Ads | Native | Planned (Phase 3) | System-user token, ad account ID |
| Google Ads | Native | Planned (Phase 3) | Developer token, OAuth client, customer ID |
| Klaviyo | Native | Planned (Phase 3) | Private API key |
| Vercel / Netlify / Cloudflare Pages | Native | Planned (Phase 4) | API token |
| GoHighLevel | Native | Planned (27A) | Agency API key or OAuth app, location ID per client |
| Meta Pixel | Webhook/client-side | Planned (27A) | Pixel ID per client (no secret) |
| Meta Conversions API | Native | Planned (27A) | Pixel ID, CAPI access token per client |
| GA4 | Native | Planned (27A) | Property ID, measurement ID, Data API service account |
| Google Tag Manager | Client-side | Planned (27A) | Container ID per client |
| Calendly | Webhook | Planned (27A) | Personal access token or OAuth app, webhook signing key |
| Square | Native | Planned (27A) | Access token, location ID |
| Twilio SMS | Native | Planned (27A) | Account SID, auth token, messaging service SID, registered sender |
| Discord | Webhook | Planned (27A) | Webhook URL per channel |
| Zapier / n8n | Webhook | Planned (27A) | Inbound webhook URLs |
| QuickBooks | Native | Future optional | OAuth app plus exact accounting requirements |

CSV import/export is the supported interim path for Meta Ads, Google Ads
and GA4 reporting data until their native adapters activate in Phase 3.

Per-client GoHighLevel positioning is stored on
`clients.gohighlevel_mode`: `source_of_truth`, `automation_engine`,
`booking_layer`, `migration_source`, or `not_used` (default). The Agency
Owner sets this per client; sync behaviour in later phases keys off it.
Duplicate-detection and merge controls are required before any GoHighLevel
contact sync goes live.

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
