"use server";

import { revalidatePath } from "next/cache";
import { parseCreativeMetricsCsv } from "@ihp/types";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export async function createAdCreative(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const concept = str(formData, "concept");
  const name = str(formData, "name");
  if (!clientId || !concept || !name) throw new Error("Client, concept and creative name are required");

  await requirePermission(supabase, session.organisationId, "campaigns", "create", clientId);

  const { data: creative, error } = await supabase
    .from("ad_creatives")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      campaign_id: str(formData, "campaignId"),
      concept,
      variant_label: str(formData, "variantLabel") ?? "A",
      name,
      channel: (str(formData, "channel") as "meta_ads" | "google_ads" | "social" | "other" | null) ?? "meta_ads",
      format:
        (str(formData, "format") as "static" | "image" | "carousel" | "video" | "ugc_video" | "story" | null) ?? "static",
      audience: str(formData, "audience"),
      primary_text: str(formData, "primaryText"),
      headline: str(formData, "headline"),
      description: str(formData, "description"),
      cta: str(formData, "cta"),
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "ad_creatives",
    resourceId: creative.id,
    clientId,
    metadata: { name, concept },
  });

  revalidatePath("/paid-media");
}

const CREATIVE_TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review"],
  in_review: ["approved", "draft"],
  approved: ["live", "draft"],
  live: ["paused", "retired"],
  paused: ["live", "retired"],
  retired: [],
};

/**
 * Status changes are validated server-side. Nothing reaches `live` without
 * passing through `approved` first, so spend never goes behind creative that
 * has not been signed off.
 */
export async function updateCreativeStatus(
  creativeId: string,
  nextStatus: "draft" | "in_review" | "approved" | "live" | "paused" | "retired",
): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: creative, error: fetchError } = await supabase
    .from("ad_creatives")
    .select("id, name, status, client_id")
    .eq("id", creativeId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "update", creative.client_id);
  } catch {
    return { error: "You do not have permission to change creative for this client." };
  }

  if (!CREATIVE_TRANSITIONS[creative.status]?.includes(nextStatus)) {
    return { error: `Creative cannot move from ${creative.status} to ${nextStatus}.` };
  }

  const { error } = await supabase
    .from("ad_creatives")
    .update({
      status: nextStatus,
      launched_at: nextStatus === "live" ? new Date().toISOString() : undefined,
      retired_at: nextStatus === "retired" ? new Date().toISOString() : undefined,
    })
    .eq("id", creativeId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "ad_creatives",
    resourceId: creativeId,
    clientId: creative.client_id,
    metadata: { status: nextStatus },
  });

  revalidatePath("/paid-media");
  return {};
}

export interface CreativeImportState {
  imported?: number;
  errors?: string[];
}

/**
 * Imports creative-level day rows, matching the creative column against
 * existing creative names for that client. Unmatched names are reported, not
 * silently discarded.
 */
export async function importCreativeMetrics(
  _prev: CreativeImportState,
  formData: FormData,
): Promise<CreativeImportState> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const csvText = String(formData.get("csv") ?? "");
  if (!clientId) return { errors: ["Pick a client."] };

  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "update", clientId);
  } catch {
    return { errors: ["You do not have permission to import metrics for this client."] };
  }

  const { rows, errors } = parseCreativeMetricsCsv(csvText);
  if (rows.length === 0) return { errors: errors.length > 0 ? errors : ["No data rows found."] };

  const { data: creatives } = await supabase
    .from("ad_creatives")
    .select("id, name, channel, campaign_id")
    .eq("client_id", clientId)
    .is("deleted_at", null);

  const byName = new Map((creatives ?? []).map((c) => [c.name.toLowerCase(), c]));
  const unmatched = new Set<string>();
  const inserts = [];

  for (const row of rows) {
    const creative = byName.get(row.creativeName.toLowerCase());
    if (!creative) {
      unmatched.add(row.creativeName);
      continue;
    }
    inserts.push({
      organisation_id: session.organisationId,
      client_id: clientId,
      campaign_id: creative.campaign_id,
      ad_creative_id: creative.id,
      channel: creative.channel === "social" || creative.channel === "other" ? ("other" as const) : creative.channel,
      metric_date: row.metric_date,
      spend: row.spend,
      impressions: row.impressions,
      clicks: row.clicks,
      leads: row.leads,
      conversions: row.conversions,
      revenue: row.revenue,
      source: "csv_import" as const,
      created_by: session.userId,
    });
  }

  const allErrors = [...errors];
  if (unmatched.size > 0) {
    allErrors.push(
      `No creative found matching: ${Array.from(unmatched).join(", ")}. Add the creative first, or correct the name in the file.`,
    );
  }
  if (inserts.length === 0) return { errors: allErrors };

  const { error: insertError } = await supabase.from("campaign_metrics").insert(inserts);
  if (insertError) return { errors: [...allErrors, insertError.message] };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "campaign_metrics",
    clientId,
    metadata: { rowsImported: inserts.length, level: "ad_creative" },
  });

  revalidatePath("/paid-media");
  return { imported: inserts.length, errors: allErrors.length > 0 ? allErrors : undefined };
}

export async function logOptimisation(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const description = str(formData, "description");
  const changeType = str(formData, "changeType");
  if (!clientId || !description || !changeType) throw new Error("Client, change type and description are required");

  await requirePermission(supabase, session.organisationId, "campaigns", "update", clientId);

  const { data: entry, error } = await supabase
    .from("optimisation_log")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      campaign_id: str(formData, "campaignId"),
      ad_creative_id: str(formData, "adCreativeId"),
      change_type: changeType as
        | "budget"
        | "audience"
        | "creative"
        | "bid"
        | "targeting"
        | "placement"
        | "pause"
        | "scale"
        | "other",
      description,
      rationale: str(formData, "rationale"),
      expected_outcome: str(formData, "expectedOutcome"),
      changed_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "optimisation_log",
    resourceId: entry.id,
    clientId,
    metadata: { changeType },
  });

  revalidatePath("/paid-media");
}

export async function recordOptimisationOutcome(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const entryId = str(formData, "entryId");
  const observedOutcome = str(formData, "observedOutcome");
  const decision = str(formData, "decision");
  if (!entryId || !observedOutcome || !decision) throw new Error("Outcome and decision are required");

  await requirePermission(supabase, session.organisationId, "campaigns", "update");

  const { error } = await supabase
    .from("optimisation_log")
    .update({
      observed_outcome: observedOutcome,
      decision: decision as "scale" | "iterate" | "kill" | "hold",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", entryId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "optimisation_log",
    resourceId: entryId,
    metadata: { decision },
  });

  revalidatePath("/paid-media");
}
