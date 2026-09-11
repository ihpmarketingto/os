import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void;
}

/**
 * Server-side client scoped to the current request's session (respects RLS
 * as the signed-in user, not the service role). The Next.js app supplies a
 * cookie adapter backed by next/headers so this package stays framework-agnostic.
 */
export function createSupabaseServerClient(url: string, anonKey: string, cookies: CookieAdapter) {
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) =>
        cookies.setAll(cookiesToSet),
    },
  });
}
