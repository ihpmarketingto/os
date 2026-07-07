"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export async function createExperiment(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = String(formData.get("clientId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const hypothesis = String(formData.get("hypothesis") ?? "").trim();
  if (!clientId || !name || !hypothesis) throw new Error("Client, name and hypothesis are required");

  await requirePermission(supabase, session.organisationId, "campaigns", "create", clientId);

  const { data: experiment, error } = await supabase
    .from("experiments")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name,
      hypothesis,
      page_url: String(formData.get("pageUrl") ?? "").trim() || null,
      variant_description: String(formData.get("variant") ?? "").trim() || null,
      success_metric: String(formData.get("successMetric") ?? "").trim() || null,
      start_date: String(formData.get("startDate") ?? "").trim() || null,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "experiments",
    resourceId: experiment.id,
    clientId,
    metadata: { name },
  });

  revalidatePath("/website-cro");
}

export async function concludeExperiment(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const experimentId = String(formData.get("experimentId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "ship" | "revert" | "iterate";
  if (!experimentId || !decision) throw new Error("Experiment and decision are required");

  await requirePermission(supabase, session.organisationId, "campaigns", "update");

  const { error } = await supabase
    .from("experiments")
    .update({
      status: "complete",
      end_date: new Date().toISOString().slice(0, 10),
      result: String(formData.get("result") ?? "").trim() || null,
      statistical_confidence: String(formData.get("confidence") ?? "").trim() || null,
      decision,
      learnings: String(formData.get("learnings") ?? "").trim() || null,
    })
    .eq("id", experimentId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "experiments",
    resourceId: experimentId,
    metadata: { decision },
  });

  revalidatePath("/website-cro");
}

export async function startExperiment(experimentId: string): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "campaigns", "update");

  const { error } = await supabase
    .from("experiments")
    .update({ status: "running", start_date: new Date().toISOString().slice(0, 10) })
    .eq("id", experimentId);
  if (error) throw new Error(error.message);

  revalidatePath("/website-cro");
}
