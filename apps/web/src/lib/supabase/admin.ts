import "server-only";
import { createSupabaseAdminClient } from "@ihp/database";
import { serverEnv } from "@/lib/env/server";

/**
 * Service-role client. Only import this from trusted server code (seed
 * scripts, cron/webhook route handlers, admin-only actions) — it bypasses
 * every RLS policy in the database.
 */
export function getSupabaseAdminClient() {
  return createSupabaseAdminClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY);
}
