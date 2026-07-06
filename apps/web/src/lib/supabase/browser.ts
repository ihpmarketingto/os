"use client";

import { createSupabaseBrowserClient } from "@ihp/database";
import { publicEnv } from "@/lib/env/public";

export function getSupabaseBrowserClient() {
  return createSupabaseBrowserClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
