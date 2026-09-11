import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Org-specific flag row overrides the global (organisation_id null) default.
 * Missing flag key = disabled, so a typo'd key fails closed, not open.
 */
export async function isFeatureEnabled(
  supabase: SupabaseClient<Database>,
  key: string,
  organisationId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("organisation_id, is_enabled")
    .eq("key", key)
    .or(`organisation_id.eq.${organisationId},organisation_id.is.null`);

  if (error || !data || data.length === 0) {
    if (error) console.error("[feature-flags] lookup failed, defaulting to disabled", { key, error });
    return false;
  }

  const orgSpecific = data.find((row) => row.organisation_id === organisationId);
  if (orgSpecific) return orgSpecific.is_enabled;

  const global = data.find((row) => row.organisation_id === null);
  return global?.is_enabled ?? false;
}
