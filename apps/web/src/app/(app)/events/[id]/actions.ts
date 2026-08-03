"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function int(formData: FormData, key: string, fallback = 0): number {
  const value = Number(String(formData.get(key) ?? "").trim());
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

/** Loads the event and checks the caller may act on it. */
async function authoriseEvent(eventId: string, action: "create" | "update") {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, client_id, name")
    .eq("id", eventId)
    .single();
  if (error) return { error: error.message } as const;
  await requirePermission(supabase, session.organisationId, "campaigns", action, event.client_id);
  return { session, supabase, event } as const;
}

export async function addSegment(formData: FormData): Promise<{ error?: string }> {
  const eventId = str(formData, "eventId");
  const title = str(formData, "title");
  if (!eventId || !title) return { error: "A title is required." };

  let context;
  try {
    context = await authoriseEvent(eventId, "create");
  } catch {
    return { error: "You do not have permission to edit this event." };
  }
  if ("error" in context) return { error: context.error };
  const { session, supabase, event } = context;

  const { error } = await supabase.from("event_segments").insert({
    organisation_id: session.organisationId,
    event_id: eventId,
    title,
    starts_after_minutes: int(formData, "startsAfterMinutes"),
    duration_minutes: int(formData, "durationMinutes", 15) || 15,
    owner_name: str(formData, "ownerName"),
    location: str(formData, "location"),
    notes: str(formData, "notes"),
  });
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "event_segments",
    clientId: event.client_id,
    metadata: { eventId, title },
  });

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function toggleSegmentComplete(segmentId: string, done: boolean): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: segment, error: fetchError } = await supabase
    .from("event_segments")
    .select("id, event_id, event:events(client_id)")
    .eq("id", segmentId)
    .single();
  if (fetchError) return { error: fetchError.message };

  const clientId = (segment.event as unknown as { client_id: string | null } | null)?.client_id ?? null;
  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "update", clientId);
  } catch {
    return { error: "You do not have permission to edit this event." };
  }

  const { error } = await supabase
    .from("event_segments")
    .update({ completed_at: done ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", segmentId);
  if (error) return { error: error.message };

  revalidatePath(`/events/${segment.event_id}`);
  return {};
}

export async function addSponsor(formData: FormData): Promise<{ error?: string }> {
  const eventId = str(formData, "eventId");
  const name = str(formData, "name");
  if (!eventId || !name) return { error: "A sponsor name is required." };

  let context;
  try {
    context = await authoriseEvent(eventId, "create");
  } catch {
    return { error: "You do not have permission to edit this event." };
  }
  if ("error" in context) return { error: context.error };
  const { session, supabase, event } = context;

  const cash = Number(String(formData.get("cashAmount") ?? "0")) || 0;

  const { error } = await supabase.from("event_sponsors").insert({
    organisation_id: session.organisationId,
    event_id: eventId,
    name,
    tier: (str(formData, "tier") as "supporting" | null) ?? "supporting",
    contact_name: str(formData, "contactName"),
    contact_email: str(formData, "contactEmail"),
    cash_amount: cash,
    in_kind_description: str(formData, "inKindDescription"),
    notes: str(formData, "notes"),
  });
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "event_sponsors",
    clientId: event.client_id,
    metadata: { eventId, name, cash },
  });

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function updateSponsorStatus(
  sponsorId: string,
  status: "prospect" | "pitched" | "committed" | "paid" | "declined",
): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: sponsor, error: fetchError } = await supabase
    .from("event_sponsors")
    .select("id, event_id, status, event:events(client_id)")
    .eq("id", sponsorId)
    .single();
  if (fetchError) return { error: fetchError.message };

  const clientId = (sponsor.event as unknown as { client_id: string | null } | null)?.client_id ?? null;
  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "update", clientId);
  } catch {
    return { error: "You do not have permission to edit this event." };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("event_sponsors")
    .update({
      status,
      paid_at: status === "paid" ? today : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sponsorId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "event_sponsors",
    resourceId: sponsorId,
    clientId,
    metadata: { from: sponsor.status, to: status },
  });

  revalidatePath(`/events/${sponsor.event_id}`);
  return {};
}

export async function addDeliverable(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const sponsorId = str(formData, "sponsorId");
  const description = str(formData, "description");
  if (!sponsorId || !description) return { error: "Describe what was promised." };

  const { data: sponsor, error: fetchError } = await supabase
    .from("event_sponsors")
    .select("id, event_id, event:events(client_id)")
    .eq("id", sponsorId)
    .single();
  if (fetchError) return { error: fetchError.message };

  const clientId = (sponsor.event as unknown as { client_id: string | null } | null)?.client_id ?? null;
  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "create", clientId);
  } catch {
    return { error: "You do not have permission to edit this event." };
  }

  const { error } = await supabase.from("event_sponsor_deliverables").insert({
    organisation_id: session.organisationId,
    sponsor_id: sponsorId,
    description,
    due_date: str(formData, "dueDate"),
  });
  if (error) return { error: error.message };

  revalidatePath(`/events/${sponsor.event_id}`);
  return {};
}

export async function toggleDeliverable(deliverableId: string, done: boolean): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: deliverable, error: fetchError } = await supabase
    .from("event_sponsor_deliverables")
    .select("id, sponsor:event_sponsors(event_id, event:events(client_id))")
    .eq("id", deliverableId)
    .single();
  if (fetchError) return { error: fetchError.message };

  const sponsor = deliverable.sponsor as unknown as {
    event_id: string;
    event: { client_id: string | null } | null;
  } | null;
  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "update", sponsor?.event?.client_id ?? null);
  } catch {
    return { error: "You do not have permission to edit this event." };
  }

  const { error } = await supabase
    .from("event_sponsor_deliverables")
    .update({ delivered_at: done ? new Date().toISOString() : null })
    .eq("id", deliverableId);
  if (error) return { error: error.message };

  if (sponsor?.event_id) revalidatePath(`/events/${sponsor.event_id}`);
  return {};
}
