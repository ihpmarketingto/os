import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types.gen";

/**
 * Service-role client. Bypasses RLS entirely — only ever call this from
 * trusted server code (seed scripts, admin API routes, scheduled jobs).
 * Importing this into a Client Component or anything bundled for the
 * browser is a critical security bug, not a style issue.
 */
export function createSupabaseAdminClient(url: string, serviceRoleKey: string) {
  if (typeof window !== "undefined") {
    throw new Error("createSupabaseAdminClient must never run in the browser.");
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
