"use server";

import { revalidatePath } from "next/cache";
import {
  computeChannelSummary,
  evaluateTaskEnvelopeGate,
  normaliseTaskEnvelope,
  renderKnowledgeContext,
  selectKnowledgeForContext,
  validateClientAdapterSelection,
  type ClientAdapter,
  type SourceReference,
} from "@ihp/types";
import { configuredProviders, executeChat, selectProvider, AiRoutingError } from "@ihp/ai-router";
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

const DRAFT_WORKSPACE_TASK_TYPES = [
  "report_drafting",
  "copy_generation",
  "client_follow_up",
  "long_form_strategy",
] as const;

type DraftWorkspaceTaskType = (typeof DRAFT_WORKSPACE_TASK_TYPES)[number];

const TASK_TYPES: { value: DraftWorkspaceTaskType; label: string }[] = [
  { value: "report_drafting", label: "Report commentary draft" },
  { value: "copy_generation", label: "Marketing copy draft" },
  { value: "client_follow_up", label: "Client follow-up draft" },
  { value: "long_form_strategy", label: "Strategy notes draft" },
];

const AI_TASK_CAPABILITY_ROUTE: Record<DraftWorkspaceTaskType, { selectedApp: string; selectedPlugin: string }> = {
  report_drafting: { selectedApp: "reporting_measurement", selectedPlugin: "metrics_interpretation" },
  copy_generation: { selectedApp: "content_communications", selectedPlugin: "ai_draft_workspace" },
  client_follow_up: { selectedApp: "content_communications", selectedPlugin: "ai_draft_workspace" },
  long_form_strategy: { selectedApp: "decisions", selectedPlugin: "strategy_drafting" },
};

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

function buildTaskEnvelopeSourceReferences(input: {
  clientId: string;
  citations: Citation[];
  knowledge: ReturnType<typeof selectKnowledgeForContext>;
}): SourceReference[] {
  const contextRefs: SourceReference[] = input.citations.map((citation) => ({
    sourceType: citation.document_type,
    sourceId: citation.document_id,
    clientId: input.clientId,
    locator: citation.title,
    version: null,
    evidenceLabel: "CONFIRMED",
    usage: "material",
    notes: citation.excerpt,
  }));

  const knowledgeRefs: SourceReference[] = input.knowledge.selected.map((selection) => ({
    sourceType: "knowledge_entry",
    sourceId: selection.entry.id,
    clientId: selection.entry.clientId,
    locator: selection.entry.title,
    version: selection.entry.updatedAt,
    evidenceLabel: selection.stale ? "VERIFY" : "CONFIRMED",
    usage: "material",
    notes: selection.included === "summary" ? "Summary used instead of full body due to context budget." : null,
  }));

  return [...contextRefs, ...knowledgeRefs];
}

export async function runDraft(_prev: DraftResult, formData: FormData): Promise<DraftResult> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = String(formData.get("clientId") ?? "").trim();
  const taskType = String(formData.get("taskType") ?? "").trim() as DraftWorkspaceTaskType;
  const instruction = String(formData.get("instruction") ?? "").trim();

  if (!clientId || !taskType || !instruction) {
    return { error: "Pick a client, a task type, and write an instruction." };
  }
  if (!DRAFT_WORKSPACE_TASK_TYPES.includes(taskType)) {
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
    const { data: clientAdapter } = await supabase
      .from("client_adapters")
      .select(
        "id, stable_key, name, founder_identity_ids, team_identity_ids, brand_identity_id, audience_identity_ids, approved_source_locations, connected_tools, permission_policy, claim_policy, approval_owner_ids, business_rules, data_boundaries, enabled_apps, enabled_plugins, current_operating_mode, client_configuration, version, review_status",
      )
      .eq("client_id", clientId)
      .maybeSingle();

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

    /*
     * IHP's own material. Fetched with the client filter applied in the
     * query, then passed through selectKnowledgeForContext, which is the
     * function that enforces the isolation rule and is tested against
     * exactly this leak. Both layers are deliberate: the query narrows what
     * comes back, the selector guarantees what goes out.
     */
    const { data: knowledgeRows } = await supabase
      .from("knowledge_entries")
      .select("id, client_id, kind, title, body, summary, tags, confidentiality, status, review_due_on, updated_at")
      .eq("organisation_id", session.organisationId)
      .eq("status", "active")
      .is("deleted_at", null)
      .or(`client_id.is.null,client_id.eq.${clientId}`);

    const knowledge = selectKnowledgeForContext(
      (knowledgeRows ?? []).map((k) => ({
        id: k.id,
        clientId: k.client_id,
        kind: k.kind,
        title: k.title,
        body: k.body,
        summary: k.summary,
        tags: k.tags,
        confidentiality: k.confidentiality,
        status: k.status,
        reviewDueOn: k.review_due_on,
        updatedAt: k.updated_at,
      })),
      { clientId, query: instruction },
    );

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

    const capabilityRoute = AI_TASK_CAPABILITY_ROUTE[taskType as DraftWorkspaceTaskType];
    const sourceReferences = buildTaskEnvelopeSourceReferences({ clientId, citations, knowledge });
    const taskEnvelope = normaliseTaskEnvelope({
      taskId: crypto.randomUUID(),
      clientId,
      userRequest: instruction,
      relevantIdentityRefs: [],
      selectedApp: capabilityRoute.selectedApp,
      selectedPlugin: capabilityRoute.selectedPlugin,
      sourceReferences,
      operatingMode: clientAdapter?.current_operating_mode ?? "shadow",
      authorityState: "confirmed",
      permissionState: "granted",
      approvalRequirements: [
        {
          label: "Human review before any external send, publish or launch action",
          approverRole: "internal_reviewer",
          status: "pending",
        },
      ],
      currentStep: "produce_or_execute",
      currentStatus: "in_progress",
      outputDestination: {
        kind: "internal_draft",
        target: "ai_intelligence",
      },
      auditReferences: [],
    });

    if (clientAdapter) {
      const adapterView: ClientAdapter = {
        stableId: clientAdapter.stable_key,
        clientId,
        clientName: client.name,
        founderIdentityIds: (clientAdapter.founder_identity_ids as string[] | null) ?? [],
        teamIdentityIds: (clientAdapter.team_identity_ids as string[] | null) ?? [],
        brandIdentityId: clientAdapter.brand_identity_id,
        audienceIdentityIds: (clientAdapter.audience_identity_ids as string[] | null) ?? [],
        approvedSourceLocations: (clientAdapter.approved_source_locations as string[] | null) ?? [],
        connectedTools: (clientAdapter.connected_tools as string[] | null) ?? [],
        permissionPolicy: (clientAdapter.permission_policy as Record<string, unknown> | null) ?? {},
        claimPolicy: (clientAdapter.claim_policy as Record<string, unknown> | null) ?? {},
        approvalOwners: (clientAdapter.approval_owner_ids as string[] | null) ?? [],
        businessRules: (clientAdapter.business_rules as string[] | null) ?? [],
        dataBoundaries: (clientAdapter.data_boundaries as string[] | null) ?? [],
        enabledApps: (clientAdapter.enabled_apps as string[] | null) ?? [],
        enabledPlugins: (clientAdapter.enabled_plugins as string[] | null) ?? [],
        currentOperatingMode: clientAdapter.current_operating_mode,
        clientConfiguration: (clientAdapter.client_configuration as Record<string, unknown> | null) ?? {},
        version: clientAdapter.version,
        reviewStatus: clientAdapter.review_status,
      };
      const adapterGate = validateClientAdapterSelection(adapterView, taskEnvelope);
      if (!adapterGate.allowed) {
        return { error: adapterGate.reasons.join(" ") };
      }
    }

    const taskGate = evaluateTaskEnvelopeGate(taskEnvelope, { requestedOutcome: "draft" });
    if (!taskGate.allowed) {
      return { error: taskGate.reasons.join(" ") };
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
      ...(knowledge.selected.length > 0 ? ["", renderKnowledgeContext(knowledge.selected)] : []),
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

    // Which knowledge the draft was grounded in, so "where did that claim
    // come from" is answerable afterwards. Same failure posture as above.
    if (knowledge.selected.length > 0) {
      const { error: knowledgeCitationError } = await supabase.from("ai_knowledge_citations").insert(
        knowledge.selected.map((s) => ({
          organisation_id: session.organisationId,
          ai_run_id: run.id,
          knowledge_entry_id: s.entry.id,
        })),
      );
      if (knowledgeCitationError) {
        throw new Error(
          `Draft generated but knowledge citations could not be recorded: ${knowledgeCitationError.message}`,
        );
      }
    }

    const completedEnvelope = {
      id: taskEnvelope.taskId,
      organisation_id: session.organisationId,
      client_id: clientId,
      client_adapter_id: clientAdapter?.id ?? null,
      ai_run_id: run.id,
      requested_by: session.userId,
      user_request: taskEnvelope.userRequest,
      relevant_identity_refs: taskEnvelope.relevantIdentityRefs,
      selected_app: taskEnvelope.selectedApp,
      selected_plugin: taskEnvelope.selectedPlugin,
      source_references: taskEnvelope.sourceReferences,
      operating_mode: taskEnvelope.operatingMode,
      authority_state: taskEnvelope.authorityState,
      permission_state: taskEnvelope.permissionState,
      approval_requirements: taskEnvelope.approvalRequirements,
      current_step: "record" as const,
      current_status: "completed" as const,
      output_destination: taskEnvelope.outputDestination,
      audit_references: [],
    };

    const { error: taskEnvelopeError } = await supabase.from("task_envelopes").insert(completedEnvelope);
    if (taskEnvelopeError) {
      throw new Error(`Draft generated but Task Envelope could not be recorded: ${taskEnvelopeError.message}`);
    }

    if (sourceReferences.length > 0) {
      const { error: lineageError } = await supabase.from("source_lineage_records").insert(
        sourceReferences.map((source) => ({
          organisation_id: session.organisationId,
          client_id: clientId,
          task_envelope_id: taskEnvelope.taskId,
          ai_run_id: run.id,
          source_type: source.sourceType,
          source_id: source.sourceId,
          source_client_id: source.clientId,
          source_locator: source.locator,
          source_version: source.version,
          usage: source.usage,
          claim_locator: null,
          supplied_identity_id: null,
          unresolved_uncertainty:
            source.evidenceLabel === "VERIFY" || source.evidenceLabel === "UNSET"
              ? "This source still needs explicit human verification before it becomes durable truth."
              : null,
        })),
      );
      if (lineageError) {
        throw new Error(`Draft generated but source lineage could not be recorded: ${lineageError.message}`);
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

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      organisation_id: session.organisationId,
      client_id: run.client_id,
      title: `Review AI draft: ${run.task_type.replace(/_/g, " ")}`,
      category: "review",
      priority: "medium",
      assignee_id: session.userId,
    })
    .select("id")
    .single();
  if (taskError) return { error: taskError.message };

  await supabase
    .from("task_envelopes")
    .update({
      work_item_id: task.id,
      current_step: "hand_off",
      current_status: "handed_off",
      updated_at: new Date().toISOString(),
    })
    .eq("ai_run_id", runId);

  revalidatePath("/tasks");
  return {};
}
