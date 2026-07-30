"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { allowedNextStatuses, type BookingStatus } from "@ihp/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export async function createBooking(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const title = str(formData, "title");
  const scheduledAt = str(formData, "scheduledAt");
  const clientId = str(formData, "clientId");
  if (!title || !scheduledAt) throw new Error("Title and date and time are required");

  await requirePermission(supabase, session.organisationId, "crm", "create", clientId);

  const depositAmount = str(formData, "depositAmount");
  const duration = str(formData, "durationMinutes");

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      lead_id: str(formData, "leadId"),
      title,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration ? Number(duration) : 30,
      source: "internal",
      deposit_status: depositAmount ? "pending" : "not_required",
      deposit_amount: depositAmount ? Number(depositAmount) : null,
      owner_id: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "bookings",
    resourceId: booking.id,
    clientId,
    metadata: { title, scheduledAt },
  });

  revalidatePath("/bookings");
}

/**
 * Moves a booking through its lifecycle. The allowed transitions come from
 * @ihp/types rather than being trusted from the client, because a resolved
 * booking that can be reopened is a show rate that can be quietly rewritten.
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, client_id")
    .eq("id", bookingId)
    .single();
  if (fetchError) return { error: fetchError.message };

  if (!allowedNextStatuses(booking.status as BookingStatus).includes(status)) {
    return { error: `A ${booking.status} booking cannot become ${status}.` };
  }

  try {
    await requirePermission(supabase, session.organisationId, "crm", "update", booking.client_id);
  } catch {
    return { error: "You do not have permission to change this booking." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "bookings",
    resourceId: bookingId,
    clientId: booking.client_id,
    metadata: { from: booking.status, to: status },
  });

  revalidatePath("/bookings");
  return {};
}

/** Records what came of a consultation, which is what makes the close rate real. */
export async function recordBookingOutcome(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const bookingId = str(formData, "bookingId");
  const outcome = str(formData, "outcome");
  if (!bookingId || (outcome !== "closed_won" && outcome !== "closed_lost")) {
    return { error: "Pick an outcome." };
  }

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, client_id")
    .eq("id", bookingId)
    .single();
  if (fetchError) return { error: fetchError.message };

  // An outcome only means something for a consultation that actually happened.
  if (booking.status !== "attended") {
    return { error: "Mark the booking attended before recording an outcome." };
  }

  try {
    await requirePermission(supabase, session.organisationId, "crm", "update", booking.client_id);
  } catch {
    return { error: "You do not have permission to change this booking." };
  }

  const revenue = str(formData, "revenue");
  const { error } = await supabase
    .from("bookings")
    .update({
      outcome,
      revenue: outcome === "closed_won" && revenue ? Number(revenue) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "bookings",
    resourceId: bookingId,
    clientId: booking.client_id,
    metadata: { outcome, revenue: revenue ?? null },
  });

  revalidatePath("/bookings");
  return {};
}

export async function updateDepositStatus(
  bookingId: string,
  depositStatus: "not_required" | "pending" | "paid" | "refunded",
): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, client_id, deposit_status")
    .eq("id", bookingId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "crm", "update", booking.client_id);
  } catch {
    return { error: "You do not have permission to change this booking." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ deposit_status: depositStatus, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "bookings",
    resourceId: bookingId,
    clientId: booking.client_id,
    metadata: { depositFrom: booking.deposit_status, depositTo: depositStatus },
  });

  revalidatePath("/bookings");
  return {};
}
