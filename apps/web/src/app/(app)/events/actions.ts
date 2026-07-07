"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export async function createEvent(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const name = String(formData.get("name") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  if (!name) throw new Error("Event name is required");

  await requirePermission(supabase, session.organisationId, "campaigns", "create", clientId);

  const targetRaw = String(formData.get("targetAttendance") ?? "").trim();

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name,
      venue: String(formData.get("venue") ?? "").trim() || null,
      starts_at: String(formData.get("startsAt") ?? "").trim() || null,
      ends_at: String(formData.get("endsAt") ?? "").trim() || null,
      ticket_link: String(formData.get("ticketLink") ?? "").trim() || null,
      target_attendance: targetRaw ? Number(targetRaw) : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "events",
    resourceId: event.id,
    clientId,
    metadata: { name },
  });

  revalidatePath("/events");
}

export async function updateEventStatus(
  eventId: string,
  status: "planning" | "on_sale" | "live" | "complete" | "cancelled",
): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "campaigns", "update");

  const { error } = await supabase.from("events").update({ status }).eq("id", eventId);
  if (error) throw new Error(error.message);

  revalidatePath("/events");
}

export async function updateTicketSales(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "campaigns", "update");

  const eventId = String(formData.get("eventId") ?? "");
  const sold = Number(String(formData.get("ticketsSold") ?? "0"));
  const revenue = Number(String(formData.get("ticketRevenue") ?? "0"));
  if (!eventId || !Number.isFinite(sold) || !Number.isFinite(revenue)) throw new Error("Invalid ticket figures");

  const { error } = await supabase
    .from("events")
    .update({ tickets_sold: sold, ticket_revenue: revenue })
    .eq("id", eventId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "events",
    resourceId: eventId,
    metadata: { ticketsSold: sold, ticketRevenue: revenue },
  });

  revalidatePath("/events");
}
