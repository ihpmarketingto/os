"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export async function createReport(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = String(formData.get("clientId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  const periodEnd = String(formData.get("periodEnd") ?? "").trim();
  if (!clientId || !title || !periodStart || !periodEnd) {
    throw new Error("Client, title and period are required");
  }

  await requirePermission(supabase, session.organisationId, "reports", "create", clientId);

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      title,
      period_start: periodStart,
      period_end: periodEnd,
      executive_summary: String(formData.get("executiveSummary") ?? "").trim() || null,
      key_wins: String(formData.get("keyWins") ?? "").trim() || null,
      risks: String(formData.get("risks") ?? "").trim() || null,
      next_month_plan: String(formData.get("nextMonthPlan") ?? "").trim() || null,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "reports",
    resourceId: report.id,
    clientId,
    metadata: { title },
  });

  revalidatePath("/reports");
}

const REPORT_TRANSITIONS: Record<string, string[]> = {
  draft: ["internal_review", "archived"],
  internal_review: ["draft", "client_review", "archived"],
  client_review: ["internal_review", "published", "archived"],
  published: ["archived"],
  archived: [],
};

export async function updateReportStatus(
  reportId: string,
  status: "draft" | "internal_review" | "client_review" | "published" | "archived",
): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: report, error: fetchError } = await supabase
    .from("reports")
    .select("id, status, client_id")
    .eq("id", reportId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  await requirePermission(supabase, session.organisationId, "reports", "read", report.client_id);

  if (!REPORT_TRANSITIONS[report.status]?.includes(status)) {
    throw new Error(`A report cannot move from ${report.status} to ${status}.`);
  }

  // Publishing is the externally visible step — it puts the report in the
  // client's portal, so it needs the approve permission, not just read.
  if (status === "published") {
    await requirePermission(supabase, session.organisationId, "reports", "approve", report.client_id);
  }

  const { error } = await supabase
    .from("reports")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", reportId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: status === "published" ? "external_action" : "update",
    resource: "reports",
    resourceId: reportId,
    clientId: report.client_id,
    metadata: { status },
  });

  revalidatePath("/reports");
  revalidatePath("/client-portal");
}
