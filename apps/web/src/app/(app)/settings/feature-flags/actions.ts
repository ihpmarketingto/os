"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

/**
 * Writes an organisation-specific override row. RLS (migration 0002) only
 * lets an agency_owner write org-scoped flags, so this is enforced by the
 * database even if this action is ever called from a role that shouldn't.
 */
export async function setOrgFeatureFlag(key: string, isEnabled: boolean): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from("feature_flags").upsert(
    {
      organisation_id: session.organisationId,
      key,
      is_enabled: isEnabled,
      rollout: isEnabled ? "all_users" : "off",
    },
    { onConflict: "organisation_id,key" },
  );

  if (error) {
    return { error: error.message };
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "feature_flags",
    resourceId: key,
    metadata: { isEnabled },
  });

  revalidatePath("/settings/feature-flags");
  revalidatePath("/");
  return {};
}
