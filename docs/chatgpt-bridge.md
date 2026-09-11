# ChatGPT ↔ IHP OS Bridge

## Product behaviour

ChatGPT is the working interface.

IHP OS is the governed system of record.

### Example: "Save this for Grit"

Expected tool sequence:

1. `find_client("Grit")`
2. determine whether the user is saving:
   - source material/observation → `capture_evidence`
   - explicit confirmed decision → `record_decision`
   - candidate durable truth → `propose_learning`
3. report exactly what was stored.

Do not call `record_decision` merely because a conversation contains a strong recommendation.

### Example: "That replaces the old offer"

Expected sequence:

1. resolve client
2. load current client context
3. capture the current conversation as evidence if useful
4. `record_decision` with `decision_type = offer`
5. if the change should become durable offer knowledge, `propose_learning`
6. leave learning pending approval

### Example: "What is the current Sweet Secrets offer?"

Expected sequence:

1. `find_client("Sweet Secrets")`
2. `get_client_context(client_id)`
3. answer from active `offer` knowledge + confirmed decisions
4. call out contradiction/staleness instead of silently choosing one source

## Data authority

From highest to lowest for current client truth:

1. confirmed current decision
2. active approved client knowledge
3. active approved agency policy
4. current service/project/campaign state
5. recent evidence
6. AI inference

Evidence is source material, not truth.

A learning proposal is a candidate truth, not truth.

## v1 safety boundary

Available writes:

- evidence
- decision
- learning proposal
- internal task

Not exposed:

- email/SMS/DM sends
- publishing
- paid-media budget/status changes
- payments/refunds
- invoices
- contracts
- production deploy
- user/permission changes
- destructive deletes

## Authentication

The MCP resource server is the IHP OS Next.js app.

The authorization server is Supabase Auth.

The bridge expects:

- OAuth 2.1
- PKCE
- protected resource metadata
- Supabase access token
- authenticated internal IHP membership
- RLS on every client/data query

The MCP server never uses the service-role key for ChatGPT tool calls.

## Supabase OAuth setup

In the IHP OS Supabase project:

1. Enable **Authentication → OAuth Server**.
2. Set the authorization/consent UI path to the production IHP OS URL:
   `https://<IHP-OS-domain>/oauth/consent`
3. Enable the client registration path recommended by current Supabase/OpenAI MCP guidance.
4. Use standard scopes:
   - `openid`
   - `email`
   - `profile`
5. Ensure the Supabase OAuth discovery document advertises:
   - authorization endpoint
   - token endpoint
   - PKCE `S256`
   - registration method used by ChatGPT
6. Test the full flow with MCP Inspector before connecting it in ChatGPT.

Fine-grained business authorization is not represented by custom OAuth scopes in v1. Supabase currently exposes standard identity scopes; IHP business access is enforced through existing membership, role and RLS policies.

## Before production plugin linking

Verify:

- OAuth discovery
- `resource` propagation
- token issuer
- expiry
- resource/audience behaviour
- internal membership
- RLS isolation
- client portal rejection
- audit logging
- evidence/decision policies
- `find_client` cannot see inaccessible clients
- cross-client confidential knowledge cannot leak


## Resource binding

OpenAI requires the OAuth `resource` value to be echoed through the flow and the resulting access token to be minted for that resource.

Canonical v1 resource:

`https://os-ihp1.vercel.app/api/mcp`

The migration creates `public.ihp_mcp_access_token_hook(jsonb)`, which sets:

- `aud = https://os-ihp1.vercel.app/api/mcp`
- `ihp_mcp_resource = https://os-ihp1.vercel.app/api/mcp`

for Supabase OAuth Server tokens that contain a `client_id`.

The MCP resource server verifies those claims after Supabase Auth has validated the token.

This hook must be enabled manually in **Authentication > Hooks > Custom Access Token**.

Do not enable it blindly if the Supabase OAuth Server is already used by unrelated third-party apps. In that case, filter the hook by the approved ChatGPT OAuth `client_id`.
