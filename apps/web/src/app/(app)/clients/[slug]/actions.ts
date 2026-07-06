"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export async function addNote(clientId: string, slug: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { error } = await supabase.from("notes").insert({
    organisation_id: session.organisationId,
    client_id: clientId,
    subject_type: "client",
    subject_id: clientId,
    author_id: session.userId,
    body,
  });
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "notes",
    clientId,
  });

  revalidatePath(`/clients/${slug}`);
}

export async function logMeeting(clientId: string, slug: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const title = String(formData.get("title") ?? "").trim();
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  const meetingType = String(formData.get("meetingType") ?? "client_review") as
    | "discovery_call"
    | "internal"
    | "client_review"
    | "other";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const clientVisible = formData.get("clientVisible") === "on";
  if (!title || !scheduledAt) return;

  const { error } = await supabase.from("meetings").insert({
    organisation_id: session.organisationId,
    client_id: clientId,
    title,
    meeting_type: meetingType,
    scheduled_at: new Date(scheduledAt).toISOString(),
    notes,
    client_visible: clientVisible,
    created_by: session.userId,
  });
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "meetings",
    clientId,
    metadata: { title },
  });

  revalidatePath(`/clients/${slug}`);
}

export async function setClientAiEnabled(clientId: string, slug: string, enabled: boolean): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "ai_settings", "update", clientId);

  const { error } = await supabase.from("clients").update({ ai_enabled: enabled }).eq("id", clientId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "clients",
    resourceId: clientId,
    clientId,
    metadata: { ai_enabled: enabled },
  });

  revalidatePath(`/clients/${slug}`);
}
