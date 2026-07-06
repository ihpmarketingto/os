import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@ihp/database";
import { serverEnv } from "@/lib/env/server";

/**
 * For use in Server Components, Server Actions and Route Handlers. Session
 * cookie writes are wrapped in try/catch because Server Components render
 * read-only and cannot set cookies — middleware.ts is what actually keeps
 * the session refreshed on every request.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_ANON_KEY, {
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Called from a Server Component render — middleware.ts handles refresh instead.
      }
    },
  });
}
