import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types.gen";

/**
 * Browser-side client. Uses only the anon key — never import
 * client-admin.ts (service role) into anything that ships to the browser.
 */
export function createSupabaseBrowserClient(url: string, anonKey: string) {
  return createBrowserClient<Database>(url, anonKey);
}
