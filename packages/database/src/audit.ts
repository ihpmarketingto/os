import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "./types.gen";

type AuditAction = Database["public"]["Tables"]["audit_logs"]["Row"]["action"];
type ActorType = Database["public"]["Tables"]["audit_logs"]["Row"]["actor_type"];

export interface WriteAuditLogInput {
  organisationId: string;
  actorUserId?: string | null;
  actorType?: ActorType;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  clientId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * The audit_logs table has no update/delete RLS policy by design (see
 * migration 0002) — this is the only supported write path, and it is
 * intentionally append-only. Call this from every mutating server action,
 * not just the ones that feel "important".
 */
export async function writeAuditLog(
  supabase: SupabaseClient<Database>,
  input: WriteAuditLogInput,
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    organisation_id: input.organisationId,
    actor_user_id: input.actorUserId ?? null,
    actor_type: input.actorType ?? "user",
    action: input.action,
    resource: input.resource,
    resource_id: input.resourceId ?? null,
    client_id: input.clientId ?? null,
    metadata: (input.metadata ?? {}) as Json,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });

  if (error) {
    // Audit logging must never silently vanish — surface it loudly so a
    // broken audit pipeline gets fixed instead of ignored.
    console.error("[audit] failed to write audit log entry", { input, error });
    throw new Error(`Failed to write audit log: ${error.message}`);
  }
}
