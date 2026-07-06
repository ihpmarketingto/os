"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import type { ContentStatus } from "@/lib/content/constants";

export async function createContentItem(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = String(formData.get("clientId") ?? "");
  const platform = String(formData.get("platform") ?? "").trim() || null;
  const contentType = String(formData.get("contentType") ?? "").trim() || null;
  const hook = String(formData.get("hook") ?? "").trim() || null;
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const brief = String(formData.get("brief") ?? "").trim() || null;
  if (!clientId) throw new Error("Client is required");

  await requirePermission(supabase, session.organisationId, "content", "create", clientId);

  const { data: content, error } = await supabase
    .from("content_items")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      platform,
      content_type: contentType,
      hook,
      caption,
      brief,
      owner_id: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "content_items",
    resourceId: content.id,
    clientId,
  });

  revalidatePath("/content-studio");
}

/**
 * Moving a content item to "client_review" is the one status change with a
 * side effect: it flips client_visible on and opens an approvals row, which
 * is what actually makes the item show up in the client portal.
 */
export async function updateContentStatus(contentId: string, clientId: string, status: ContentStatus): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "content", "update", clientId);

  const isEnteringClientReview = status === "client_review";

  const { error } = await supabase
    .from("content_items")
    .update({ status, client_visible: isEnteringClientReview ? true : undefined })
    .eq("id", contentId);
  if (error) throw new Error(error.message);

  if (isEnteringClientReview) {
    const { error: approvalError } = await supabase.from("approvals").insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      subject_type: "content_item",
      subject_id: contentId,
      requested_by: session.userId,
      status: "pending",
    });
    if (approvalError) throw new Error(approvalError.message);
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "content_items",
    resourceId: contentId,
    clientId,
    metadata: { status },
  });

  revalidatePath("/content-studio");
  revalidatePath("/client-portal");
}

export async function decideApproval(
  approvalId: string,
  contentId: string,
  decision: "approved" | "changes_requested",
  decisionNotes?: string,
): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { error: approvalError } = await supabase
    .from("approvals")
    .update({
      status: decision,
      decided_by: session.userId,
      decided_at: new Date().toISOString(),
      decision_notes: decisionNotes ?? null,
    })
    .eq("id", approvalId);
  if (approvalError) throw new Error(approvalError.message);

  const { error: contentError } = await supabase
    .from("content_items")
    .update({ status: decision === "approved" ? "approved" : "revisions" })
    .eq("id", contentId);
  if (contentError) throw new Error(contentError.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "approvals",
    resourceId: approvalId,
    metadata: { decision },
  });

  revalidatePath("/content-studio");
  revalidatePath("/client-portal");
}
