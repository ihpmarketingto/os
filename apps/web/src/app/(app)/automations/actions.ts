"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { runSweep, type SweepResult } from "@/lib/automations/sweep";

export interface SweepActionResult {
  results?: SweepResult[];
  error?: string;
}

export async function triggerSweep(): Promise<SweepActionResult> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  try {
    await requirePermission(supabase, session.organisationId, "team_settings", "update");
    const results = await runSweep(supabase, session.organisationId);

    await writeAuditLog(supabase, {
      organisationId: session.organisationId,
      actorUserId: session.userId,
      actorType: "automation",
      action: "external_action",
      resource: "automation_runs",
      metadata: { results },
    });

    revalidatePath("/automations");
    revalidatePath("/tasks");
    revalidatePath("/finance");
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sweep failed" };
  }
}

export async function setRuleEnabled(ruleKey: string, isEnabled: boolean): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  try {
    await requirePermission(supabase, session.organisationId, "team_settings", "update");
    const { error } = await supabase
      .from("automation_rules")
      .update({ is_enabled: isEnabled })
      .eq("organisation_id", session.organisationId)
      .eq("rule_key", ruleKey);
    if (error) return { error: error.message };

    await writeAuditLog(supabase, {
      organisationId: session.organisationId,
      actorUserId: session.userId,
      action: "update",
      resource: "automation_rules",
      resourceId: ruleKey,
      metadata: { isEnabled },
    });

    revalidatePath("/automations");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed" };
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .is("read_at", null);

  revalidatePath("/", "layout");
}
