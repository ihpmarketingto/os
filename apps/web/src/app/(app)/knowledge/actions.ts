"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import type { Confidentiality, KnowledgeKind } from "@ihp/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export async function createKnowledgeEntry(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const title = str(formData, "title");
  const body = str(formData, "body");
  const kind = str(formData, "kind") as KnowledgeKind | null;
  const clientId = str(formData, "clientId");
  const confidentiality = (str(formData, "confidentiality") as Confidentiality | null) ?? "agency_general";

  if (!title || !body || !kind) return { error: "Title, kind and body are all required." };

  // Refused here as well as by the database check, so the person gets a
  // sentence rather than a constraint violation.
  if (!clientId && confidentiality === "client_confidential") {
    return {
      error:
        "Confidential material has to belong to a client. Agency-wide entries are readable for every client, which is exactly what confidential material must not be.",
    };
  }

  try {
    await requirePermission(supabase, session.organisationId, "content", "create", clientId);
  } catch {
    return { error: "You do not have permission to add knowledge for this client." };
  }

  const tags = (str(formData, "tags") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const { data: created, error } = await supabase
    .from("knowledge_entries")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      kind,
      title,
      body,
      summary: str(formData, "summary"),
      tags,
      confidentiality,
      status: (str(formData, "status") as "draft" | "active" | null) ?? "draft",
      source_reference: str(formData, "sourceReference"),
      review_due_on: str(formData, "reviewDueOn"),
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "knowledge_entries",
    resourceId: created.id,
    clientId,
    metadata: { title, kind, confidentiality },
  });

  revalidatePath("/knowledge");
  return {};
}

export async function updateKnowledgeStatus(
  entryId: string,
  status: "draft" | "active" | "archived",
): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("knowledge_entries")
    .select("id, client_id, status")
    .eq("id", entryId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "content", "update", existing.client_id);
  } catch {
    return { error: "You do not have permission to change this entry." };
  }

  const { error } = await supabase
    .from("knowledge_entries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", entryId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "knowledge_entries",
    resourceId: entryId,
    clientId: existing.client_id,
    metadata: { from: existing.status, to: status },
  });

  revalidatePath("/knowledge");
  return {};
}

/**
 * Confirms an entry is still true and pushes its next review out. Stale
 * knowledge is the failure mode that matters here: the model will state a
 * withdrawn offer with complete confidence.
 */
export async function markReviewed(entryId: string, nextReviewMonths = 6): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("knowledge_entries")
    .select("id, client_id")
    .eq("id", entryId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "content", "update", existing.client_id);
  } catch {
    return { error: "You do not have permission to review this entry." };
  }

  const next = new Date();
  next.setMonth(next.getMonth() + nextReviewMonths);

  const { error } = await supabase
    .from("knowledge_entries")
    .update({
      last_reviewed_at: new Date().toISOString(),
      last_reviewed_by: session.userId,
      review_due_on: next.toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);
  if (error) return { error: error.message };

  revalidatePath("/knowledge");
  return {};
}
