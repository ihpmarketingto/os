"use server";

import { revalidatePath } from "next/cache";
import { computeChannelSummary } from "@ihp/types";
import { configuredProviders, executeChat, selectProvider, AiRoutingError, type AiTaskType } from "@ihp/ai-router";
import { hasPermission, requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env/server";

/**
 * Monthly organisation spend cap for AI drafts, in USD. Admin-configurable
 * caps per client/user/workflow are still-open Phase 5 scope; this hard
 * default guarantees tracking is never uncapped in the meantime.
 */
const MONTHLY_ORG_SPEND_CAP_USD = 25;

const TASK_TYPES: { value: AiTaskType; label: string }[] = [
  { value: "report_drafting", label: "Report commentary draft" },
  { value: "copy_generation", label: "Marketing copy draft" },
  { value: "client_follow_up", label: "Client follow-up draft" },
  { value: "long_form_strategy", label: "Strategy notes draft" },
];
export async function getTaskTypes() {
  return TASK_TYPES;
}

interface Citation {
  document_type: string;
  document_id: string | null;
  title: string;
  excerpt: string;
}

export interface DraftResult {
  output?: string;
  citations?: { title: string; excerpt: string }[];
  provider?: string;
  model?: string;
  estimatedCostUsd?: number;
  error?: string;
}

export async function runDraft(_prev: DraftResult, formData: FormData): Promise<DraftResult> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = String(formData.get("clientId") ?? "").trim();
  const taskType = String(formData.get("taskType") ?? "").trim() as AiTaskType;
  const instruction = String(formData.get("instruction") ?? "").trim();

  if (!clientId || !taskType || !instruction) {
    return { error: "Pick a client, a task type, and write an instruction." };
  }
  if (!TASK_TYPES.some((t) => t.value === taskType)) {
    return { error: "Unknown task type." };
  }

  try {
    // Gate 1: the user must be allowed to let AI retrieve this client's context.
    await requirePermission(supabase, session.organisationId, "ai_settings", "ai_retrieve", clientId);

    // Gate 2: the client must have AI enabled, and only allowed providers count.
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, industry, status, ai_enabled, ai_settings, health_score, retainer_amount")
      .eq("id", clientId)
      .single();
    if (clientError) throw new Error(clientError.message);
    if (!client.ai_enabled) {
      return { error: `AI is disabled for ${client.name}. An Agency Owner can enable it in the client's AI settings.` };
    }
    const aiSettings = (client.ai_settings ?? {}) as { allowed_providers?: string[] };
    const allowedProviders = (aiSettings.allowed_providers ?? ["openai", "gemini", "anthropic"]) as ("openai" | "gemini" | "anthropic")[];

    // Gate 3: monthly spend cap.
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: monthRuns } = await supabase
      .from("ai_runs")
      .select("estimated_cost")
      .eq("organisation_id", session.organisationId)
      .gte("created_at", monthStart.toISOString());
    const monthSpend = (monthRuns ?? []).reduce((sum, r) => sum + Number(r.estimated_cost ?? 0), 0);
    if (monthSpend >= MONTHLY_ORG_SPEND_CAP_USD) {
      return {
        error: `The organisation's monthly AI spend cap (US$${MONTHLY_ORG_SPEND_CAP_USD}) is reached. Raise the cap or wait for the new month.`,
      };
    }

    // Route the request.
    const available = configuredProviders(serverEnv);
    const decision = await selectProvider({
      taskType,
      mode: "draft",
      organisationId: session.organisationId,
      clientId,
      userId: session.userId,
      availableProviders: available,
      clientAiSettings: {
        aiEnabled: client.ai_enabled,
        allowedProviders,
        financialDataAccessible: false,
        contactDataAccessible: false,
        contractsAccessible: false,
        documentsAccessible: true,
      },
    });

    // Minimum authorised context: a handful of summarised, RLS-checked
    // reads. Each block becomes a recorded citation. Financial and contact
    // data stay out unless the client profile explicitly allows them
    // (Phase 5 core keeps both off).
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ data: metrics }, { data: latestReport }, { data: openTasks }, { data: liveCampaigns }] =
      await Promise.all([
        supabase
          .from("campaign_metrics")
          .select("channel, spend, impressions, clicks, leads, conversions, revenue")
          .eq("client_id", clientId)
          .gte("metric_date", thirtyDaysAgo.toISOString().slice(0, 10)),
        supabase
          .from("reports")
          .select("id, title, executive_summary, key_wins, risks, next_month_plan, period_start, period_end")
          .eq("client_id", clientId)
          .in("status", ["published", "client_review", "internal_review"])
          .order("period_end", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("tasks")
          .select("title, status, due_date")
          .eq("client_id", clientId)
          .not("status", "in", "(complete,cancelled)")
          .order("due_date", { ascending: true })
          .limit(8),
        supabase
          .from("campaigns")
          .select("name, objective, status, budget")
          .eq("client_id", clientId)
          .in("status", ["live", "optimising", "ready_to_launch"])
          .limit(5),
      ]);

    const citations: Citation[] = [];
    const contextBlocks: string[] = [];

    contextBlocks.push(
      `Client: ${client.name} (${client.industry ?? "industry unspecified"}), status ${client.status}, health score ${client.health_score ?? "not computed"}.`,
    );
    citations.push({
      document_type: "client_profile",
      document_id: client.id,
      title: `Client profile: ${client.name}`,
      excerpt: `Industry ${client.industry ?? "n/a"}; status ${client.status}.`,
    });

    if (metrics && metrics.length > 0) {
      const summary = computeChannelSummary(metrics);
      const line = `Last 30 days across channels: spend $${summary.spend.toFixed(2)}, revenue $${summary.revenue.toFixed(2)}, ROAS ${summary.roas?.toFixed(2) ?? "n/a"}, leads ${summary.leads}, CPL ${summary.cpl ? "$" + summary.cpl.toFixed(2) : "n/a"}, CTR ${summary.ctr ? (summary.ctr * 100).toFixed(2) + "%" : "n/a"}.`;
      contextBlocks.push(line);
      citations.push({
        document_type: "campaign_metrics",
        document_id: null,
        title: "Channel metrics, last 30 days",
        excerpt: line,
      });
    }

    if (latestReport) {
      const line = `Latest report "${latestReport.title}" (${latestReport.period_start} to ${latestReport.period_end}): ${latestReport.executive_summary ?? ""} Wins: ${latestReport.key_wins ?? "n/a"}. Risks: ${latestReport.risks ?? "n/a"}. Plan: ${latestReport.next_month_plan ?? "n/a"}`;
      contextBlocks.push(line);
      citations.push({
        document_type: "report",
        document_id: latestReport.id,
        title: latestReport.title,
        excerpt: (latestReport.executive_summary ?? "").slice(0, 200),
      });
    }

    if (openTasks && openTasks.length > 0) {
      const line = `Open tasks: ${openTasks.map((t) => `${t.title} (${t.status}${t.due_date ? ", due " + t.due_date : ""})`).join("; ")}.`;
      contextBlocks.push(line);
      citations.push({
        document_type: "tasks",
        document_id: null,
        title: "Open delivery tasks",
        excerpt: line.slice(0, 200),
      });
    }

    if (liveCampaigns && liveCampaigns.length > 0) {
      const line = `Active campaigns: ${liveCampaigns.map((c) => `${c.name} (${c.status}, objective: ${c.objective ?? "n/a"})`).join("; ")}.`;
      contextBlocks.push(line);
      citations.push({
        document_type: "campaigns",
        document_id: null,
        title: "Active campaigns",
        excerpt: line.slice(0, 200),
      });
    }

    const systemPrompt = [
      "You are IHP Intelligence, the internal drafting assistant for IHP Marketing, a Canadian full-funnel growth agency.",
      "Rules, without exception:",
      "- Use Canadian spelling. Never use em dashes.",
      "- Write with authority, specificity and commercial clarity. No vague filler such as 'unlock', 'elevate', 'revolutionary' or 'game-changing'.",
      "- Use ONLY the client context provided below. Never invent metrics, testimonials, outcomes, claims or client facts. If context is missing, say what is missing instead of guessing.",
      "- This is a DRAFT for internal review. It will not be sent or published without human approval.",
      "",
      "Client context:",
      ...contextBlocks.map((b) => `- ${b}`),
    ].join("\n");

    let result;
    try {
      result = await executeChat(serverEnv, decision.provider, [
        { role: "system", content: systemPrompt },
        { role: "user", content: instruction },
      ]);
    } catch (execError) {
      // Spec section 6: every AI interaction records its error result too.
      const message = execError instanceof Error ? execError.message : "Unknown provider error";
      const { data: providerRow } = await supabase.from("ai_providers").select("id").eq("slug", decision.provider).single();
      await supabase.from("ai_runs").insert({
        organisation_id: session.organisationId,
        client_id: clientId,
        user_id: session.userId,
        ai_provider_id: providerRow?.id ?? null,
        task_type: taskType,
        mode: "draft",
        prompt: instruction,
        status: "error",
        error_message: message.slice(0, 500),
      });
      revalidatePath("/ai-intelligence");
      return { error: message };
    }

    // Log the run and its citations — the audit trail for every AI interaction.
    const { data: providerRow } = await supabase.from("ai_providers").select("id").eq("slug", decision.provider).single();
    const { data: run, error: runError } = await supabase
      .from("ai_runs")
      .insert({
        organisation_id: session.organisationId,
        client_id: clientId,
        user_id: session.userId,
        ai_provider_id: providerRow?.id ?? null,
        model_name: result.model,
        task_type: taskType,
        mode: "draft",
        prompt: instruction,
        output: result.output,
        status: "success",
        estimated_cost: result.estimatedCostUsd,
        approval_result: "not_required",
      })
      .select("id")
      .single();
    if (runError) throw new Error(runError.message);

    if (citations.length > 0) {
      const { error: citationError } = await supabase
        .from("ai_source_citations")
        .insert(citations.map((c) => ({ ai_run_id: run.id, ...c })));
      if (citationError) {
        // A run without its citation trail violates the audit rules — fail
        // loudly rather than quietly returning an uncited draft.
        throw new Error(`Draft generated but citations could not be recorded: ${citationError.message}`);
      }
    }

    await writeAuditLog(supabase, {
      organisationId: session.organisationId,
      actorUserId: session.userId,
      actorType: "user",
      action: "ai_retrieve",
      resource: "ai_runs",
      resourceId: run.id,
      clientId,
      metadata: { taskType, provider: decision.provider, model: result.model, estimatedCostUsd: result.estimatedCostUsd, sources: citations.length },
    });

    revalidatePath("/ai-intelligence");

    return {
      output: result.output,
      citations: citations.map((c) => ({ title: c.title, excerpt: c.excerpt })),
      provider: decision.provider,
      model: result.model,
      estimatedCostUsd: result.estimatedCostUsd,
    };
  } catch (err) {
    if (err instanceof AiRoutingError) {
      return { error: err.message };
    }
    console.error("[ai-workspace] draft failed", err);
    return { error: err instanceof Error ? err.message : "The draft could not be generated." };
  }
}

/** Turns an AI draft into a task for human follow-through. Draft mode's only side door, and it is a draft artifact too. */
export async function convertRunToTask(runId: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: run, error } = await supabase
    .from("ai_runs")
    .select("id, client_id, task_type, output")
    .eq("id", runId)
    .single();
  if (error || !run?.output) return { error: "Run not found or has no output." };

  const canCreate = await hasPermission(supabase, session.organisationId, "tasks", "create", run.client_id);
  if (!canCreate) return { error: "You do not have permission to create tasks for this client." };

  const { error: taskError } = await supabase.from("tasks").insert({
    organisation_id: session.organisationId,
    client_id: run.client_id,
    title: `Review AI draft: ${run.task_type.replace(/_/g, " ")}`,
    category: "review",
    priority: "medium",
    assignee_id: session.userId,
  });
  if (taskError) return { error: taskError.message };

  revalidatePath("/tasks");
  return {};
}
