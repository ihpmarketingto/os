"use server";

import { revalidatePath } from "next/cache";
import { parseMetricsCsv } from "@ihp/types";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import type { CampaignStatus, MetricChannel } from "@/lib/marketing/constants";

export async function createCampaign(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = String(formData.get("clientId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!clientId || !name) throw new Error("Client and campaign name are required");

  await requirePermission(supabase, session.organisationId, "campaigns", "create", clientId);

  const channels = String(formData.get("channels") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const budgetRaw = String(formData.get("budget") ?? "").trim();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name,
      objective: String(formData.get("objective") ?? "").trim() || null,
      offer: String(formData.get("offer") ?? "").trim() || null,
      audience: String(formData.get("audience") ?? "").trim() || null,
      channels,
      budget: budgetRaw ? Number(budgetRaw) : null,
      kpis: String(formData.get("kpis") ?? "").trim() || null,
      start_date: String(formData.get("startDate") ?? "").trim() || null,
      end_date: String(formData.get("endDate") ?? "").trim() || null,
      owner_id: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "campaigns",
    resourceId: campaign.id,
    clientId,
    metadata: { name },
  });

  revalidatePath("/campaigns");
}

export async function updateCampaignStatus(campaignId: string, clientId: string, status: CampaignStatus): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "campaigns", "update", clientId);

  const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaignId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "campaigns",
    resourceId: campaignId,
    clientId,
    metadata: { status },
  });

  revalidatePath("/campaigns");
}

export interface ImportMetricsState {
  imported?: number;
  errors?: string[];
}

/**
 * CSV import for channel metrics — the supported data path until the
 * Meta/Google/Klaviyo API adapters activate (see docs/integrations.md).
 * Format: date,spend,impressions,clicks,leads,conversions,revenue
 */
export async function importMetricsCsv(_prev: ImportMetricsState, formData: FormData): Promise<ImportMetricsState> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = String(formData.get("clientId") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim() as MetricChannel;
  const campaignId = String(formData.get("campaignId") ?? "").trim() || null;
  const csvText = String(formData.get("csv") ?? "");

  if (!clientId || !channel) return { errors: ["Pick a client and a channel."] };

  await requirePermission(supabase, session.organisationId, "campaigns", "update", clientId);

  const { rows, errors } = parseMetricsCsv(csvText);
  if (errors.length > 0 && rows.length === 0) return { errors };
  if (rows.length === 0) return { errors: ["No data rows found."] };

  const { error: insertError } = await supabase.from("campaign_metrics").insert(
    rows.map((row) => ({
      organisation_id: session.organisationId,
      client_id: clientId,
      campaign_id: campaignId,
      channel,
      metric_date: row.metric_date,
      spend: row.spend,
      impressions: row.impressions,
      clicks: row.clicks,
      leads: row.leads,
      conversions: row.conversions,
      revenue: row.revenue,
      source: "csv_import" as const,
      created_by: session.userId,
    })),
  );
  if (insertError) return { errors: [insertError.message] };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "campaign_metrics",
    clientId,
    metadata: { channel, rowsImported: rows.length, rowErrors: errors.length },
  });

  revalidatePath("/paid-media");
  revalidatePath("/seo");
  revalidatePath("/email-lifecycle");
  revalidatePath("/campaigns");

  return { imported: rows.length, errors: errors.length > 0 ? errors : undefined };
}
