"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export async function createInfluencer(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "crm", "create");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  const followersRaw = String(formData.get("followers") ?? "").trim();

  const { data: influencer, error } = await supabase
    .from("influencers")
    .insert({
      organisation_id: session.organisationId,
      client_id: String(formData.get("clientId") ?? "").trim() || null,
      name,
      handle: String(formData.get("handle") ?? "").trim() || null,
      platform: String(formData.get("platform") ?? "").trim() || null,
      followers: followersRaw ? Number(followersRaw) : null,
      email: String(formData.get("email") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "influencers",
    resourceId: influencer.id,
    metadata: { name },
  });

  revalidatePath("/pr-influencers");
}

export async function updateInfluencerStatus(
  influencerId: string,
  status: "prospect" | "contacted" | "negotiating" | "active" | "past",
): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "crm", "update");

  const { error } = await supabase.from("influencers").update({ status }).eq("id", influencerId);
  if (error) throw new Error(error.message);

  revalidatePath("/pr-influencers");
}

export async function createMediaContact(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "crm", "create");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const { data: contact, error } = await supabase
    .from("media_contacts")
    .insert({
      organisation_id: session.organisationId,
      name,
      outlet: String(formData.get("outlet") ?? "").trim() || null,
      beat: String(formData.get("beat") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "media_contacts",
    resourceId: contact.id,
    metadata: { name },
  });

  revalidatePath("/pr-influencers");
}
