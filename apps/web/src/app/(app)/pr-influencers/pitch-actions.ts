"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { allowedNextPitchStatuses, MAX_FOLLOW_UPS, type PitchStatus } from "@ihp/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export async function createPitch(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const subject = str(formData, "subject");
  const contactType = str(formData, "contactType");
  const clientId = str(formData, "clientId");
  if (!subject || (contactType !== "media" && contactType !== "influencer")) {
    return { error: "Subject and contact type are required." };
  }

  const mediaContactId = str(formData, "mediaContactId");
  const influencerId = str(formData, "influencerId");
  if (contactType === "media" && !mediaContactId) return { error: "Pick a media contact." };
  if (contactType === "influencer" && !influencerId) return { error: "Pick a creator." };

  try {
    await requirePermission(supabase, session.organisationId, "crm", "create", clientId);
  } catch {
    return { error: "You do not have permission to log outreach for this client." };
  }

  const { data: pitch, error } = await supabase
    .from("outreach")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      contact_type: contactType,
      media_contact_id: contactType === "media" ? mediaContactId : null,
      influencer_id: contactType === "influencer" ? influencerId : null,
      subject,
      angle: str(formData, "angle"),
      notes: str(formData, "notes"),
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "outreach",
    resourceId: pitch.id,
    clientId,
    metadata: { subject, contactType },
  });

  revalidatePath("/pr-influencers");
  return {};
}

/**
 * Moves a pitch along. Marking it sent stamps the send time, which is what
 * the follow-up queue counts from. Transitions are checked against
 * @ihp/types rather than trusted from the client.
 */
export async function updatePitchStatus(
  pitchId: string,
  status: PitchStatus,
): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: pitch, error: fetchError } = await supabase
    .from("outreach")
    .select("id, status, client_id, sent_at")
    .eq("id", pitchId)
    .single();
  if (fetchError) return { error: fetchError.message };

  if (!allowedNextPitchStatuses(pitch.status as PitchStatus).includes(status)) {
    return { error: `A ${pitch.status} pitch cannot become ${status}.` };
  }

  try {
    await requirePermission(supabase, session.organisationId, "crm", "update", pitch.client_id);
  } catch {
    return { error: "You do not have permission to change this pitch." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("outreach")
    .update({
      status,
      // Only stamp the first send, so a later status change does not reset
      // the clock the follow-up queue measures from.
      sent_at: status === "sent" && !pitch.sent_at ? now : pitch.sent_at,
      updated_at: now,
    })
    .eq("id", pitchId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "outreach",
    resourceId: pitchId,
    clientId: pitch.client_id,
    metadata: { from: pitch.status, to: status },
  });

  revalidatePath("/pr-influencers");
  return {};
}

/** Records that a chase went out, which takes the pitch off the queue. */
export async function logFollowUp(pitchId: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: pitch, error: fetchError } = await supabase
    .from("outreach")
    .select("id, status, client_id, follow_up_count")
    .eq("id", pitchId)
    .single();
  if (fetchError) return { error: fetchError.message };

  if (pitch.status !== "sent") return { error: "Only a sent pitch awaiting a reply can be chased." };
  if (pitch.follow_up_count >= MAX_FOLLOW_UPS) {
    return { error: `Already chased ${MAX_FOLLOW_UPS} times. Leave this one.` };
  }

  try {
    await requirePermission(supabase, session.organisationId, "crm", "update", pitch.client_id);
  } catch {
    return { error: "You do not have permission to change this pitch." };
  }

  const now = new Date();
  // Push the next chase out by the same wait again, so the queue does not
  // immediately re-offer the pitch it just handed over.
  const next = new Date(now.getTime() + 5 * 86_400_000);

  const { error } = await supabase
    .from("outreach")
    .update({
      follow_up_count: pitch.follow_up_count + 1,
      last_follow_up_at: now.toISOString(),
      follow_up_at: next.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", pitchId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "outreach",
    resourceId: pitchId,
    clientId: pitch.client_id,
    metadata: { followUp: pitch.follow_up_count + 1 },
  });

  revalidatePath("/pr-influencers");
  return {};
}

/** Records the piece that actually ran. */
export async function recordPlacement(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const pitchId = str(formData, "pitchId");
  const url = str(formData, "placementUrl");
  if (!pitchId || !url) return { error: "The link to the published piece is required." };

  const { data: pitch, error: fetchError } = await supabase
    .from("outreach")
    .select("id, client_id, status")
    .eq("id", pitchId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "crm", "update", pitch.client_id);
  } catch {
    return { error: "You do not have permission to change this pitch." };
  }

  const reach = str(formData, "placementReach");

  const { error } = await supabase
    .from("outreach")
    .update({
      placement_url: url,
      placement_outlet: str(formData, "placementOutlet"),
      placement_published_at: str(formData, "placementPublishedAt"),
      // Left null when the outlet did not state a figure. Never estimated:
      // an invented reach becomes a number in a client report.
      placement_reach: reach ? Number(reach) : null,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", pitchId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "outreach",
    resourceId: pitchId,
    clientId: pitch.client_id,
    metadata: { placementUrl: url },
  });

  revalidatePath("/pr-influencers");
  return {};
}
