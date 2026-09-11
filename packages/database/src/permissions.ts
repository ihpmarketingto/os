import type { SupabaseClient } from "@supabase/supabase-js";
import type { Action, Resource } from "@ihp/types";
import type { Database } from "./types";

/**
 * Thin wrapper around the public.has_permission RPC (which itself calls the
 * private.has_permission SQL function used by RLS policies). This keeps a
 * single source of truth for "who can do what" — the database — instead of
 * re-implementing the role/permission graph in application code.
 */
export async function hasPermission(
  supabase: SupabaseClient<Database>,
  organisationId: string,
  resource: Resource,
  action: Action,
  clientId?: string | null,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_permission", {
    p_org_id: organisationId,
    p_resource: resource,
    p_action: action,
    p_client_id: clientId ?? undefined,
  });

  if (error) {
    console.error("[permissions] has_permission RPC failed, denying by default", error);
    return false;
  }

  return Boolean(data);
}

export async function canAccessClient(
  supabase: SupabaseClient<Database>,
  organisationId: string,
  clientId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_access_client", {
    p_org_id: organisationId,
    p_client_id: clientId,
  });

  if (error) {
    console.error("[permissions] can_access_client RPC failed, denying by default", error);
    return false;
  }

  return Boolean(data);
}

/**
 * Throws if the check fails, for use at the top of Server Actions / route
 * handlers where "deny and continue" is not an option.
 */
export async function requirePermission(
  supabase: SupabaseClient<Database>,
  organisationId: string,
  resource: Resource,
  action: Action,
  clientId?: string | null,
): Promise<void> {
  const allowed = await hasPermission(supabase, organisationId, resource, action, clientId);
  if (!allowed) {
    throw new PermissionDeniedError(resource, action);
  }
}

export class PermissionDeniedError extends Error {
  constructor(
    public resource: Resource,
    public action: Action,
  ) {
    super(`Permission denied: ${action} on ${resource}`);
    this.name = "PermissionDeniedError";
  }
}
