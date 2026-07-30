import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@ihp/database/types.gen";
import { computeChannelSummary, isRenewalDue } from "@ihp/types";
import { isRuleEnabled, notifyUsers, ownerUserIds, recordRun } from "./engine";
import { runServiceDelivery } from "./delivery";

type Supabase = SupabaseClient<Database>;

export interface SweepResult {
  rule: string;
  actions: number;
}

/**
 * Runs every enabled sweep rule once. Callable from the Automations page
 * (and later a scheduled caller). Dedupe keys are chosen so re-running the
 * sweep is always safe: per subject, or per subject per period where a
 * reminder should be able to recur.
 */
export async function runSweep(supabase: Supabase, organisationId: string): Promise<SweepResult[]> {
  const results: SweepResult[] = [];
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const owners = await ownerUserIds(supabase, organisationId);

  // --- service_delivery (runs first: it creates the work everything else
  // --- then reports on and chases) ------------------------------------------
  const deliveryOutcomes = await runServiceDelivery(supabase, organisationId);
  if (deliveryOutcomes.length > 0) {
    results.push({ rule: "service_delivery", actions: deliveryOutcomes.length });
  } else if (await isRuleEnabled(supabase, organisationId, "service_delivery")) {
    results.push({ rule: "service_delivery", actions: 0 });
  }

  // --- invoice_overdue ------------------------------------------------------
  if (await isRuleEnabled(supabase, organisationId, "invoice_overdue")) {
    let actions = 0;
    const { data: lateInvoices } = await supabase
      .from("invoices")
      .select("id, number, due_date, amount, tax_amount, client_id, client:clients(name)")
      .eq("organisation_id", organisationId)
      .eq("status", "sent")
      .lt("due_date", todayIso)
      .is("deleted_at", null);

    for (const invoice of lateInvoices ?? []) {
      const fresh = await recordRun(supabase, organisationId, "invoice_overdue", invoice.id, `Flagged ${invoice.number} overdue`);
      if (!fresh) continue;
      await supabase.from("invoices").update({ status: "overdue" }).eq("id", invoice.id);
      await notifyUsers(supabase, organisationId, owners, {
        title: `Invoice ${invoice.number} is overdue`,
        body: `${(invoice.client as unknown as { name: string } | null)?.name}: due ${invoice.due_date}.`,
        href: "/finance",
        clientId: invoice.client_id,
      });
      actions += 1;
    }
    results.push({ rule: "invoice_overdue", actions });
  }

  // --- renewal_due ----------------------------------------------------------
  if (await isRuleEnabled(supabase, organisationId, "renewal_due")) {
    let actions = 0;
    const [{ data: contracts }, { data: retainers }] = await Promise.all([
      supabase
        .from("contracts")
        .select("id, name, end_date, renewal_notice_days, client_id, client:clients(name)")
        .eq("organisation_id", organisationId)
        .eq("status", "signed")
        .is("deleted_at", null),
      supabase
        .from("retainers")
        .select("id, name, end_date, client_id")
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .is("deleted_at", null),
    ]);

    const due = [
      ...(contracts ?? [])
        .filter((c) => isRenewalDue(c, today))
        .map((c) => ({ id: c.id, kind: "Contract", name: c.name, endDate: c.end_date, clientId: c.client_id, clientName: (c.client as unknown as { name: string } | null)?.name })),
      ...(retainers ?? [])
        .filter((r) => isRenewalDue({ end_date: r.end_date }, today))
        .map((r) => ({ id: r.id, kind: "Retainer", name: r.name, endDate: r.end_date, clientId: r.client_id, clientName: undefined as string | undefined })),
    ];

    for (const item of due) {
      const fresh = await recordRun(supabase, organisationId, "renewal_due", item.id, `${item.kind} "${item.name}" renewal window open`);
      if (!fresh) continue;
      await notifyUsers(supabase, organisationId, owners, {
        title: `${item.kind} renewal due${item.clientName ? `: ${item.clientName}` : ""}`,
        body: `${item.name} ends ${item.endDate}. Start the renewal conversation.`,
        href: "/finance",
        clientId: item.clientId,
      });
      actions += 1;
    }
    results.push({ rule: "renewal_due", actions });
  }

  // --- task_overdue ---------------------------------------------------------
  if (await isRuleEnabled(supabase, organisationId, "task_overdue")) {
    let actions = 0;
    const { data: lateTasks } = await supabase
      .from("tasks")
      .select("id, title, due_date, assignee_id, client_id")
      .eq("organisation_id", organisationId)
      .not("status", "in", "(complete,cancelled)")
      .lt("due_date", todayIso)
      .is("deleted_at", null);

    for (const task of lateTasks ?? []) {
      // Re-remind weekly: the dedupe key includes the ISO week.
      const week = `${today.getUTCFullYear()}-W${Math.ceil(((today.getTime() - Date.UTC(today.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)}`;
      const fresh = await recordRun(supabase, organisationId, "task_overdue", `${task.id}:${week}`, `Overdue reminder for "${task.title}"`);
      if (!fresh) continue;
      await notifyUsers(supabase, organisationId, task.assignee_id ? [task.assignee_id] : owners, {
        title: `Task overdue: ${task.title}`,
        body: `Due ${task.due_date}.`,
        href: "/tasks",
        clientId: task.client_id,
      });
      actions += 1;
    }
    results.push({ rule: "task_overdue", actions });
  }

  // --- stale_touchpoint -----------------------------------------------------
  if (await isRuleEnabled(supabase, organisationId, "stale_touchpoint")) {
    let actions = 0;
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    const [{ data: activeClients }, { data: recentNotes }, { data: recentMeetings }] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, account_manager_id, created_at")
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .is("deleted_at", null),
      supabase.from("notes").select("client_id").eq("organisation_id", organisationId).gte("created_at", cutoff),
      supabase.from("meetings").select("client_id").eq("organisation_id", organisationId).gte("created_at", cutoff),
    ]);

    const touched = new Set([
      ...(recentNotes ?? []).map((n) => n.client_id),
      ...(recentMeetings ?? []).map((m) => m.client_id),
    ]);

    for (const client of activeClients ?? []) {
      if (touched.has(client.id)) continue;
      // Grace period: clients created inside the window are not "stale".
      if (client.created_at >= cutoff) continue;
      const month = todayIso.slice(0, 7);
      const fresh = await recordRun(supabase, organisationId, "stale_touchpoint", `${client.id}:${month}`, `Relationship task for ${client.name}`);
      if (!fresh) continue;
      await supabase.from("tasks").insert({
        organisation_id: organisationId,
        client_id: client.id,
        title: `Check in with ${client.name} (no touchpoint in 30 days)`,
        category: "account_management",
        priority: "high",
        assignee_id: client.account_manager_id,
        due_date: todayIso,
      });
      await notifyUsers(supabase, organisationId, client.account_manager_id ? [client.account_manager_id] : owners, {
        title: `No touchpoint with ${client.name} in 30 days`,
        body: "A relationship task has been created.",
        href: "/tasks",
        clientId: client.id,
      });
      actions += 1;
    }
    results.push({ rule: "stale_touchpoint", actions });
  }

  // --- ad_anomaly -----------------------------------------------------------
  if (await isRuleEnabled(supabase, organisationId, "ad_anomaly")) {
    let actions = 0;
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: metrics } = await supabase
      .from("campaign_metrics")
      .select("client_id, spend, impressions, clicks, leads, conversions, revenue, client:clients(name, account_manager_id)")
      .eq("organisation_id", organisationId)
      .in("channel", ["meta_ads", "google_ads"])
      .gte("metric_date", sevenDaysAgo.toISOString().slice(0, 10));

    const byClient = new Map<string, { name: string; amId: string | null; rows: NonNullable<typeof metrics> }>();
    for (const row of metrics ?? []) {
      const client = row.client as unknown as { name: string; account_manager_id: string | null } | null;
      if (!byClient.has(row.client_id)) {
        byClient.set(row.client_id, { name: client?.name ?? "Unknown", amId: client?.account_manager_id ?? null, rows: [] });
      }
      byClient.get(row.client_id)!.rows.push(row);
    }

    for (const [clientId, group] of byClient) {
      const summary = computeChannelSummary(group.rows);
      const anomalous = summary.spend >= 50 && (summary.leads === 0 || (summary.roas !== null && summary.roas < 1));
      if (!anomalous) continue;
      const week = todayIso.slice(0, 10);
      const fresh = await recordRun(supabase, organisationId, "ad_anomaly", `${clientId}:${week}`, `Anomaly for ${group.name}`);
      if (!fresh) continue;
      await notifyUsers(supabase, organisationId, group.amId ? [group.amId, ...owners] : owners, {
        title: `Ad performance anomaly: ${group.name}`,
        body: `Trailing 7 days: $${summary.spend.toFixed(2)} spend, ${summary.leads} leads, ROAS ${summary.roas?.toFixed(2) ?? "n/a"}. Review pacing and creative.`,
        href: "/paid-media",
        clientId,
      });
      actions += 1;
    }
    results.push({ rule: "ad_anomaly", actions });
  }

  // Stamp last_run_at on the swept rules.
  await supabase
    .from("automation_rules")
    .update({ last_run_at: new Date().toISOString() })
    .eq("organisation_id", organisationId)
    .eq("trigger_type", "sweep");

  return results;
}
