"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import type { FlowType } from "@ihp/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function int(formData: FormData, key: string): number {
  const value = Number(String(formData.get(key) ?? "0").trim());
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

export async function createFlow(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  if (!clientId || !name) return { error: "Client and flow name are required." };

  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "create", clientId);
  } catch {
    return { error: "You do not have permission to create flows for this client." };
  }

  const { data: flow, error } = await supabase
    .from("email_flows")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name,
      flow_type: (str(formData, "flowType") as FlowType | null) ?? "other",
      trigger_description: str(formData, "triggerDescription"),
      goal: str(formData, "goal"),
      platform: str(formData, "platform"),
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "email_flows",
    resourceId: flow.id,
    clientId,
    metadata: { name },
  });

  revalidatePath("/email-lifecycle");
  return {};
}

export async function updateFlowStatus(
  flowId: string,
  status: "draft" | "live" | "paused" | "archived",
): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: flow, error: fetchError } = await supabase
    .from("email_flows")
    .select("id, client_id, status")
    .eq("id", flowId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "update", flow.client_id);
  } catch {
    return { error: "You do not have permission to change this flow." };
  }

  const { error } = await supabase
    .from("email_flows")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", flowId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "email_flows",
    resourceId: flowId,
    clientId: flow.client_id,
    metadata: { from: flow.status, to: status },
  });

  revalidatePath("/email-lifecycle");
  return {};
}

/** Appends a step to the end of a flow. */
export async function addFlowStep(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const flowId = str(formData, "flowId");
  const name = str(formData, "name");
  if (!flowId || !name) return { error: "Step name is required." };

  const { data: flow, error: fetchError } = await supabase
    .from("email_flows")
    .select("id, client_id")
    .eq("id", flowId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "create", flow.client_id);
  } catch {
    return { error: "You do not have permission to edit this flow." };
  }

  const { data: last, error: lastError } = await supabase
    .from("email_flow_steps")
    .select("step_index")
    .eq("flow_id", flowId)
    .order("step_index", { ascending: false })
    .limit(1);
  if (lastError) return { error: lastError.message };

  const { error } = await supabase.from("email_flow_steps").insert({
    organisation_id: session.organisationId,
    flow_id: flowId,
    step_index: (last[0]?.step_index ?? -1) + 1,
    name,
    channel: (str(formData, "channel") as "email" | "sms" | null) ?? "email",
    delay_hours: int(formData, "delayHours"),
    subject: str(formData, "subject"),
    purpose: str(formData, "purpose"),
  });
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "email_flow_steps",
    clientId: flow.client_id,
    metadata: { flowId, name },
  });

  revalidatePath("/email-lifecycle");
  return {};
}

/**
 * Overwrites a step's figures for a stated window. The period is required
 * so numbers on screen always say what they cover rather than being an
 * unlabelled running total.
 */
export async function recordStepStats(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const stepId = str(formData, "stepId");
  const periodStart = str(formData, "periodStart");
  const periodEnd = str(formData, "periodEnd");
  if (!stepId || !periodStart || !periodEnd) return { error: "Both period dates are required." };
  if (periodEnd < periodStart) return { error: "The period ends before it starts." };

  const { data: step, error: fetchError } = await supabase
    .from("email_flow_steps")
    .select("id, flow_id, flow:email_flows(client_id)")
    .eq("id", stepId)
    .single();
  if (fetchError) return { error: fetchError.message };

  const clientId = (step.flow as unknown as { client_id: string } | null)?.client_id ?? null;
  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "update", clientId);
  } catch {
    return { error: "You do not have permission to edit this flow." };
  }

  const sent = int(formData, "sent");
  const delivered = int(formData, "delivered");
  if (delivered > sent) return { error: "Delivered cannot exceed sent." };

  const opens = int(formData, "opens");
  const clicks = int(formData, "clicks");
  if (opens > delivered) return { error: "Opens cannot exceed delivered." };
  if (clicks > delivered) return { error: "Clicks cannot exceed delivered." };

  const { error } = await supabase
    .from("email_flow_steps")
    .update({
      stats_period_start: periodStart,
      stats_period_end: periodEnd,
      sent,
      delivered,
      opens,
      clicks,
      unsubscribes: int(formData, "unsubscribes"),
      conversions: int(formData, "conversions"),
      revenue: Number(String(formData.get("revenue") ?? "0")) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", stepId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "email_flow_steps",
    resourceId: stepId,
    clientId,
    metadata: { periodStart, periodEnd, sent, delivered },
  });

  revalidatePath("/email-lifecycle");
  return {};
}

/** Records how many contacts entered the flow, the denominator for value per entry. */
export async function recordFlowEntries(flowId: string, entered: number): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: flow, error: fetchError } = await supabase
    .from("email_flows")
    .select("id, client_id")
    .eq("id", flowId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "update", flow.client_id);
  } catch {
    return { error: "You do not have permission to edit this flow." };
  }

  const { error } = await supabase
    .from("email_flows")
    .update({ entered: Math.max(0, Math.round(entered)), updated_at: new Date().toISOString() })
    .eq("id", flowId);
  if (error) return { error: error.message };

  revalidatePath("/email-lifecycle");
  return {};
}
