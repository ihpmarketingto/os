"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { parseRankingCsv } from "@ihp/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function num(formData: FormData, key: string): number | null {
  const value = str(formData, key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function addKeyword(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const keyword = str(formData, "keyword");
  if (!clientId || !keyword) return { error: "Client and keyword are required." };

  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "create", clientId);
  } catch {
    return { error: "You do not have permission to add keywords for this client." };
  }

  const { data: created, error } = await supabase
    .from("seo_keywords")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      keyword,
      location: str(formData, "location"),
      intent: (str(formData, "intent") as "local" | null) ?? null,
      target_url: str(formData, "targetUrl"),
      search_volume: num(formData, "searchVolume"),
      difficulty: num(formData, "difficulty"),
      is_priority: formData.get("isPriority") === "on",
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) {
    // The unique index is the real guard against tracking the same term twice.
    return {
      error: error.code === "23505" ? "That keyword is already tracked for this client and location." : error.message,
    };
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "seo_keywords",
    resourceId: created.id,
    clientId,
    metadata: { keyword },
  });

  revalidatePath("/seo");
  return {};
}

export interface ImportRankingsState {
  imported?: number;
  skipped?: string[];
  error?: string;
}

/**
 * Imports a day's rankings. Keywords are matched by name against what is
 * already tracked rather than created on the fly, so a typo in an export
 * cannot quietly start a new keyword's history.
 */
export async function importRankings(
  _prev: ImportRankingsState,
  formData: FormData,
): Promise<ImportRankingsState> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const recordedOn = str(formData, "recordedOn");
  const csv = str(formData, "csv");
  if (!clientId || !recordedOn || !csv) return { error: "Client, date and pasted data are all required." };

  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "create", clientId);
  } catch {
    return { error: "You do not have permission to import rankings for this client." };
  }

  const { rows, errors } = parseRankingCsv(csv);
  if (rows.length === 0) return { error: errors[0] ?? "Nothing to import." };

  const { data: keywords, error: keywordError } = await supabase
    .from("seo_keywords")
    .select("id, keyword")
    .eq("organisation_id", session.organisationId)
    .eq("client_id", clientId)
    .is("deleted_at", null);
  if (keywordError) return { error: keywordError.message };

  const byName = new Map((keywords ?? []).map((k) => [k.keyword.trim().toLowerCase(), k.id]));
  const skipped = [...errors];
  const readings: {
    organisation_id: string;
    keyword_id: string;
    recorded_on: string;
    position: number | null;
    ranking_url: string | null;
  }[] = [];

  for (const row of rows) {
    const keywordId = byName.get(row.keyword.trim().toLowerCase());
    if (!keywordId) {
      skipped.push(`"${row.keyword}" is not tracked for this client.`);
      continue;
    }
    readings.push({
      organisation_id: session.organisationId,
      keyword_id: keywordId,
      recorded_on: recordedOn,
      position: row.position,
      ranking_url: row.rankingUrl,
    });
  }

  if (readings.length === 0) return { error: "No rows matched a tracked keyword.", skipped };

  // Re-importing a day corrects it rather than appending a second reading,
  // which the unique index on (keyword_id, recorded_on) makes possible.
  const { error } = await supabase
    .from("seo_rankings")
    .upsert(readings, { onConflict: "keyword_id,recorded_on" });
  if (error) return { error: error.message, skipped };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "seo_rankings",
    clientId,
    metadata: { recordedOn, imported: readings.length, skipped: skipped.length },
  });

  revalidatePath("/seo");
  return { imported: readings.length, skipped };
}

export async function recordGbpPeriod(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const periodStart = str(formData, "periodStart");
  const periodEnd = str(formData, "periodEnd");
  if (!clientId || !periodStart || !periodEnd) return { error: "Client and both dates are required." };
  if (periodEnd < periodStart) return { error: "The period ends before it starts." };

  try {
    await requirePermission(supabase, session.organisationId, "campaigns", "create", clientId);
  } catch {
    return { error: "You do not have permission to record metrics for this client." };
  }

  const rating = num(formData, "averageRating");
  const { error } = await supabase.from("gbp_metrics").upsert(
    {
      organisation_id: session.organisationId,
      client_id: clientId,
      period_start: periodStart,
      period_end: periodEnd,
      profile_views: num(formData, "profileViews") ?? 0,
      search_impressions: num(formData, "searchImpressions") ?? 0,
      calls: num(formData, "calls") ?? 0,
      direction_requests: num(formData, "directionRequests") ?? 0,
      website_clicks: num(formData, "websiteClicks") ?? 0,
      bookings: num(formData, "bookings") ?? 0,
      reviews_total: num(formData, "reviewsTotal"),
      new_reviews: num(formData, "newReviews"),
      average_rating: rating,
    },
    { onConflict: "client_id,period_start,period_end" },
  );
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "gbp_metrics",
    clientId,
    metadata: { periodStart, periodEnd },
  });

  revalidatePath("/seo");
  return {};
}
