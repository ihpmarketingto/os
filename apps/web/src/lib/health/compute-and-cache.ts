import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@ihp/database/types.gen";
import { computeClientHealthScore, type ClientHealthResult } from "@ihp/types";

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export async function computeAndCacheClientHealth(
  supabase: SupabaseClient<Database>,
  client: { id: string; status: string; contract_end_date: string | null },
): Promise<ClientHealthResult> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const today = now.toISOString().slice(0, 10);

  const [tasksResult, overdueResult, approvalsResult, latestNoteResult, latestMeetingResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("status", { count: "exact" })
      .eq("client_id", client.id)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id)
      .not("status", "in", "(complete,cancelled)")
      .lt("due_date", today),
    supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id)
      .eq("status", "pending")
      .lt("requested_at", threeDaysAgo.toISOString()),
    supabase
      .from("notes")
      .select("created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meetings")
      .select("scheduled_at")
      .eq("client_id", client.id)
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const totalTasks = tasksResult.data?.length ?? 0;
  const completedTasks = tasksResult.data?.filter((t) => t.status === "complete").length ?? 0;

  const lastContactDates = [latestNoteResult.data?.created_at, latestMeetingResult.data?.scheduled_at]
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d));
  const daysSinceLastContact = lastContactDates.length > 0 ? daysBetween(new Date(Math.max(...lastContactDates.map((d) => d.getTime()))), now) : null;

  const daysUntilContractEnd = client.contract_end_date ? daysBetween(now, new Date(client.contract_end_date)) : null;

  const result = computeClientHealthScore({
    clientStatus: client.status as "prospect" | "active" | "paused" | "offboarding" | "archived",
    totalTasksLast30Days: totalTasks,
    completedTasksLast30Days: completedTasks,
    overdueTaskCount: overdueResult.count ?? 0,
    pendingApprovalsOlderThan3Days: approvalsResult.count ?? 0,
    daysSinceLastContact,
    daysUntilContractEnd,
  });

  await supabase
    .from("clients")
    .update({
      health_score: result.score,
      health_score_updated_at: now.toISOString(),
      health_score_explanation: result.explanation.join(" "),
    })
    .eq("id", client.id);

  return result;
}
