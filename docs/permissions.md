# Permission model

## Roles

Six system roles, seeded once (`organisation_id IS NULL`) and shared across
every organisation: `agency_owner`, `account_manager`, `specialist`,
`contractor`, `client_admin`, `client_collaborator`. See
[`packages/types/src/roles.ts`](../packages/types/src/roles.ts) for the
canonical list and `isInternalRole`/`isClientRole` helpers.

## Resources and actions

Permissions are `(resource, action)` pairs — e.g. `(clients, read)`,
`(finance, update)`, `(ai_settings, approve)`. See `RESOURCES` and `ACTIONS`
in the same file. `role_permissions` links a role to a permission and marks
whether the grant `requires_client_scope`.

- `requires_client_scope = false`: the role can act on the resource
  organisation-wide (only `agency_owner` gets this broadly).
- `requires_client_scope = true`: the role can only act on clients it's
  explicitly connected to — via `client_assignments` (account managers,
  specialists, contractors) or `organisation_members.client_id` (client
  roles, who belong to exactly one client's portal).

## Where the check actually happens

The database is the source of truth, not application code:

- `private.has_permission(org_id, resource, action, client_id)` (SQL,
  `security definer`) is used inside every RLS policy that needs a
  permission check, and is also exposed as `public.has_permission` via RPC
  for application code to call (`hasPermission` / `requirePermission` in
  `packages/database/src/permissions.ts`).
- `private.can_access_client(org_id, client_id)` answers "can this user see
  this specific client" — true for agency owners, assigned internal users,
  and the client's own portal users.

Application code calling `hasPermission` and trusting the result without
also having RLS enabled on the underlying table is a bug waiting to happen —
always do both. RLS is the enforcement; the app-level check is for UX
(hiding buttons the user can't use), not security.

## Adding a new permission

1. Insert the `(resource, action)` row into `permissions` in a new
   migration (never edit `0004_seed_reference_data.sql` after it's shipped
   anywhere — add a new migration instead).
2. Insert the matching `role_permissions` rows for whichever roles should
   have it, with `requires_client_scope` set correctly.
3. Add the resource/action to `RESOURCES`/`ACTIONS` in
   `packages/types/src/roles.ts` so the TypeScript side stays in sync.
4. Write the RLS policy on the actual table using
   `private.has_permission(...)`.
