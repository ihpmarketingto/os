import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeAuditLog } from "@ihp/database/audit";
import type { McpPrincipal } from "./auth";
import { bearerChallenge, MCP_SCOPES } from "./auth";

const oauthSecurity = [{ type: "oauth2" as const, scopes: [...MCP_SCOPES] }];

const confidenceSchema = z.enum(["CONFIRMED", "WORKING", "HISTORICAL", "VERIFY", "UNSET"]);

const evidenceTypeSchema = z.enum([
  "chatgpt_conversation",
  "meeting_transcript",
  "email",
  "voice_note",
  "customer_dm",
  "customer_comment",
  "review",
  "website",
  "metric_observation",
  "sales_outcome",
  "support_conversation",
  "policy_source",
  "manual_observation",
  "other",
]);

const decisionTypeSchema = z.enum([
  "strategy",
  "offer",
  "pricing",
  "positioning",
  "scope",
  "creative",
  "technical",
  "compliance",
  "commercial",
  "operations",
  "other",
]);

function safeSearchTerm(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function toolError(message: string, auth = false) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
    ...(auth
      ? {
          _meta: {
            "mcp/www_authenticate": [
              bearerChallenge("invalid_token", message),
            ],
          },
        }
      : {}),
  };
}

function textResult(text: string, structuredContent: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text }],
    structuredContent,
  };
}

async function requireClient(principal: McpPrincipal, clientId: string) {
  const { data, error } = await principal.supabase
    .from("clients")
    .select("id, name, slug, industry, status, website, ai_enabled, ai_settings, health_score, health_score_explanation, account_manager_id")
    .eq("organisation_id", principal.organisationId)
    .eq("id", clientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Client not found or not accessible.");
  return data;
}

export function createIhpMcpServer(principal: McpPrincipal): McpServer {
  const server = new McpServer(
    { name: "ihp-os", version: "1.0.0" },
    {
      instructions:
        "IHP OS is the governed source of truth beneath Sarah's ChatGPT work. Before writing client data, resolve the client with find_client. Use capture_evidence for observations and raw conversation material. Use record_decision only for decisions the user explicitly confirms. Use propose_learning for candidate durable truth. Never treat an inference as approved knowledge.",
    },
  );

  server.registerTool(
    "find_client",
    {
      title: "Find IHP client",
      description:
        "Use this when the user refers to an IHP client by name, nickname, partial name or slug and you need the stable client ID before reading or writing client context.",
      inputSchema: {
        query: z.string().trim().min(1).max(120),
        include_inactive: z.boolean().optional(),
      },
      outputSchema: {
        clients: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            status: z.string(),
            industry: z.string().nullable(),
          }),
        ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { securitySchemes: oauthSecurity },
    },
    async ({ query, include_inactive }) => {
      const normalized = safeSearchTerm(query);
      let request = principal.supabase
        .from("clients")
        .select("id, name, slug, status, industry")
        .eq("organisation_id", principal.organisationId)
        .is("deleted_at", null)
        .or(`name.ilike.%${normalized}%,slug.ilike.%${normalized}%`)
        .order("name")
        .limit(10);

      if (!include_inactive) {
        request = request.in("status", ["prospect", "active", "paused"]);
      }

      const { data, error } = await request;
      if (error) return toolError(`Could not search clients: ${error.message}`);

      const clients = data ?? [];
      return textResult(
        clients.length === 0
          ? `No accessible IHP clients matched "${query}".`
          : `Found ${clients.length} matching client${clients.length === 1 ? "" : "s"}.`,
        { clients },
      );
    },
  );

  server.registerTool(
    "get_client_context",
    {
      title: "Load governed client context",
      description:
        "Use this after find_client when the user wants to work on a client. Returns current approved knowledge, confirmed and unresolved decisions, recent evidence, active services, open work and recent meetings/notes for the selected client.",
      inputSchema: {
        client_id: z.string().uuid(),
        query: z.string().trim().max(500).optional(),
        evidence_limit: z.number().int().min(0).max(30).optional(),
      },
      outputSchema: {
        client: z.record(z.string(), z.unknown()),
        knowledge: z.array(z.record(z.string(), z.unknown())),
        decisions: z.array(z.record(z.string(), z.unknown())),
        recent_evidence: z.array(z.record(z.string(), z.unknown())),
        services: z.array(z.record(z.string(), z.unknown())),
        open_tasks: z.array(z.record(z.string(), z.unknown())),
        active_projects: z.array(z.record(z.string(), z.unknown())),
        recent_meetings: z.array(z.record(z.string(), z.unknown())),
        recent_notes: z.array(z.record(z.string(), z.unknown())),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { securitySchemes: oauthSecurity },
    },
    async ({ client_id, query, evidence_limit }) => {
      try {
        const client = await requireClient(principal, client_id);
        const raw = principal.raw;
        const evidenceLimit = evidence_limit ?? 12;

        const [
          knowledgeResult,
          decisionsResult,
          evidenceResult,
          servicesResult,
          tasksResult,
          projectsResult,
          meetingsResult,
          notesResult,
        ] = await Promise.all([
          principal.supabase
            .from("knowledge_entries")
            .select("id, kind, title, body, summary, tags, confidentiality, source_reference, review_due_on, last_reviewed_at, updated_at")
            .eq("organisation_id", principal.organisationId)
            .eq("status", "active")
            .is("deleted_at", null)
            .or(`client_id.is.null,client_id.eq.${client_id}`)
            .order("updated_at", { ascending: false })
            .limit(50),

          raw
            .from("decision_records")
            .select("id, decision_type, title, decision, rationale, status, effective_at, source_evidence_id, supersedes_id, affects")
            .eq("organisation_id", principal.organisationId)
            .eq("client_id", client_id)
            .in("status", ["confirmed", "unresolved"])
            .is("deleted_at", null)
            .order("effective_at", { ascending: false })
            .limit(40),

          evidenceLimit === 0
            ? Promise.resolve({ data: [], error: null })
            : raw
                .from("evidence_items")
                .select("id, evidence_type, title, summary, source_locator, observed_at, captured_at, confidence_label, confidentiality, tags, status, extracted_data")
                .eq("organisation_id", principal.organisationId)
                .eq("client_id", client_id)
                .neq("status", "archived")
                .is("deleted_at", null)
                .order("captured_at", { ascending: false })
                .limit(evidenceLimit),

          principal.supabase
            .from("client_services")
            .select("id, status, cadence, included_hours, last_fulfilled_period, package:service_packages(name, slug, category, cadence)")
            .eq("organisation_id", principal.organisationId)
            .eq("client_id", client_id)
            .eq("status", "active")
            .is("deleted_at", null),

          principal.supabase
            .from("tasks")
            .select("id, title, category, priority, status, due_date, assignee_id, project_id")
            .eq("organisation_id", principal.organisationId)
            .eq("client_id", client_id)
            .not("status", "in", "(complete,cancelled)")
            .is("deleted_at", null)
            .order("due_date", { ascending: true, nullsFirst: false })
            .limit(30),

          principal.supabase
            .from("projects")
            .select("id, name, service_type, project_type, status, start_date, end_date, owner_id")
            .eq("organisation_id", principal.organisationId)
            .eq("client_id", client_id)
            .in("status", ["planning", "active", "on_hold"])
            .is("deleted_at", null)
            .order("updated_at", { ascending: false })
            .limit(20),

          principal.supabase
            .from("meetings")
            .select("id, title, meeting_type, scheduled_at, notes")
            .eq("organisation_id", principal.organisationId)
            .eq("client_id", client_id)
            .order("scheduled_at", { ascending: false })
            .limit(10),

          principal.supabase
            .from("notes")
            .select("id, subject_type, subject_id, body, created_at")
            .eq("organisation_id", principal.organisationId)
            .eq("client_id", client_id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        const failures = [
          knowledgeResult,
          decisionsResult,
          evidenceResult,
          servicesResult,
          tasksResult,
          projectsResult,
          meetingsResult,
          notesResult,
        ].filter((result) => result.error);

        if (failures.length) {
          console.error("[mcp] context query failures", failures.map((f) => f.error));
          return toolError("Some client context sources could not be loaded. No partial context was returned.");
        }

        const knowledge = (knowledgeResult.data ?? []).filter((entry) => {
          if (!query?.trim()) return true;
          const needle = query.toLowerCase();
          return [entry.title, entry.summary, entry.body, ...(entry.tags ?? [])]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle));
        });

        const structured = {
          client,
          knowledge,
          decisions: decisionsResult.data ?? [],
          recent_evidence: evidenceResult.data ?? [],
          services: servicesResult.data ?? [],
          open_tasks: tasksResult.data ?? [],
          active_projects: projectsResult.data ?? [],
          recent_meetings: meetingsResult.data ?? [],
          recent_notes: notesResult.data ?? [],
        };

        await writeAuditLog(principal.supabase, {
          organisationId: principal.organisationId,
          actorUserId: principal.userId,
          actorType: "ai_agent",
          action: "ai_retrieve",
          resource: "client_brain",
          resourceId: client_id,
          clientId: client_id,
          metadata: {
            source: "chatgpt_mcp",
            query: query ?? null,
            knowledge_count: knowledge.length,
            decision_count: decisionsResult.data?.length ?? 0,
            evidence_count: evidenceResult.data?.length ?? 0,
          },
        });

        return textResult(
          `Loaded governed context for ${client.name}.`,
          structured,
        );
      } catch (error) {
        return toolError(error instanceof Error ? error.message : "Could not load client context.");
      }
    },
  );

  server.registerTool(
    "search_knowledge",
    {
      title: "Search IHP knowledge",
      description:
        "Use this when the user wants to retrieve approved IHP or client knowledge without loading the full client context. Client-confidential material is only returned for the selected accessible client.",
      inputSchema: {
        query: z.string().trim().min(1).max(500),
        client_id: z.string().uuid().optional(),
        kinds: z
          .array(
            z.enum([
              "sop",
              "playbook",
              "brand_voice",
              "offer",
              "icp",
              "objection",
              "winning_pattern",
              "positioning",
              "policy",
              "faq",
            ]),
          )
          .max(10)
          .optional(),
      },
      outputSchema: {
        entries: z.array(z.record(z.string(), z.unknown())),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { securitySchemes: oauthSecurity },
    },
    async ({ query, client_id, kinds }) => {
      if (client_id) {
        try {
          await requireClient(principal, client_id);
        } catch (error) {
          return toolError(error instanceof Error ? error.message : "Client is not accessible.");
        }
      }

      let request = principal.supabase
        .from("knowledge_entries")
        .select("id, client_id, kind, title, body, summary, tags, confidentiality, source_reference, review_due_on, last_reviewed_at, updated_at")
        .eq("organisation_id", principal.organisationId)
        .eq("status", "active")
        .is("deleted_at", null)
        .or(client_id ? `client_id.is.null,client_id.eq.${client_id}` : "client_id.is.null")
        .or(`title.ilike.%${safeSearchTerm(query)}%,summary.ilike.%${safeSearchTerm(query)}%,body.ilike.%${safeSearchTerm(query)}%`)
        .order("updated_at", { ascending: false })
        .limit(30);

      if (kinds?.length) request = request.in("kind", kinds);

      const { data, error } = await request;
      if (error) return toolError(`Could not search IHP knowledge: ${error.message}`);

      return textResult(`Found ${data?.length ?? 0} knowledge entries.`, {
        entries: data ?? [],
      });
    },
  );

  server.registerTool(
    "capture_evidence",
    {
      title: "Capture client evidence",
      description:
        "Use this when the user explicitly asks to save an observation, ChatGPT discussion, transcript, quote, review, metric finding or other source material. This records evidence only. It does not silently make the material approved client truth.",
      inputSchema: {
        client_id: z.string().uuid().optional(),
        evidence_type: evidenceTypeSchema,
        title: z.string().trim().min(1).max(240),
        raw_text: z.string().min(1).max(100_000),
        summary: z.string().max(2_000).optional(),
        source_locator: z.string().max(2_000).optional(),
        observed_at: z.string().datetime().optional(),
        confidence_label: confidenceSchema.optional(),
        confidentiality: z.enum(["agency_general", "client_confidential"]).optional(),
        tags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
        extracted_data: z.record(z.string(), z.unknown()).optional(),
      },
      outputSchema: {
        evidence_id: z.string(),
        status: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      _meta: { securitySchemes: oauthSecurity },
    },
    async (input) => {
      if (input.client_id) {
        try {
          await requireClient(principal, input.client_id);
        } catch (error) {
          return toolError(error instanceof Error ? error.message : "Client is not accessible.");
        }
      }

      const confidentiality =
        input.confidentiality ?? (input.client_id ? "client_confidential" : "agency_general");

      if (!input.client_id && confidentiality === "client_confidential") {
        return toolError("Agency-wide evidence cannot be marked client-confidential.");
      }

      const { data, error } = await principal.raw
        .from("evidence_items")
        .insert({
          organisation_id: principal.organisationId,
          client_id: input.client_id ?? null,
          evidence_type: input.evidence_type,
          title: input.title,
          raw_text: input.raw_text,
          summary: input.summary ?? null,
          source_locator: input.source_locator ?? null,
          observed_at: input.observed_at ?? null,
          captured_by: principal.userId,
          confidence_label: input.confidence_label ?? "UNSET",
          confidentiality,
          tags: input.tags ?? [],
          extracted_data: input.extracted_data ?? {},
          status: "raw",
        })
        .select("id, status")
        .single();

      if (error) return toolError(`Could not capture evidence: ${error.message}`);

      await writeAuditLog(principal.supabase, {
        organisationId: principal.organisationId,
        actorUserId: principal.userId,
        actorType: "ai_agent",
        action: "create",
        resource: "evidence_item",
        resourceId: data.id,
        clientId: input.client_id ?? null,
        metadata: {
          source: "chatgpt_mcp",
          evidence_type: input.evidence_type,
          confidence_label: input.confidence_label ?? "UNSET",
        },
      });

      return textResult("Evidence captured. It has not been promoted to durable knowledge.", {
        evidence_id: data.id,
        status: data.status,
      });
    },
  );

  server.registerTool(
    "record_decision",
    {
      title: "Record confirmed decision",
      description:
        "Use this only when the user explicitly confirms a business decision or asks to record a decision. Do not use it for ideas, recommendations or inferred preferences. Use capture_evidence or propose_learning instead when certainty is lower.",
      inputSchema: {
        client_id: z.string().uuid().optional(),
        decision_type: decisionTypeSchema,
        title: z.string().trim().min(1).max(240),
        decision: z.string().trim().min(1).max(10_000),
        rationale: z.string().max(5_000).optional(),
        status: z.enum(["confirmed", "unresolved"]).optional(),
        effective_at: z.string().datetime().optional(),
        source_evidence_id: z.string().uuid().optional(),
        supersedes_id: z.string().uuid().optional(),
        affects: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
      },
      outputSchema: {
        decision_id: z.string(),
        status: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      _meta: { securitySchemes: oauthSecurity },
    },
    async (input) => {
      if (input.client_id) {
        try {
          await requireClient(principal, input.client_id);
        } catch (error) {
          return toolError(error instanceof Error ? error.message : "Client is not accessible.");
        }
      }

      const { data, error } = await principal.raw
        .from("decision_records")
        .insert({
          organisation_id: principal.organisationId,
          client_id: input.client_id ?? null,
          decision_type: input.decision_type,
          title: input.title,
          decision: input.decision,
          rationale: input.rationale ?? null,
          status: input.status ?? "confirmed",
          effective_at: input.effective_at ?? new Date().toISOString(),
          decided_by: principal.userId,
          source_evidence_id: input.source_evidence_id ?? null,
          supersedes_id: input.supersedes_id ?? null,
          affects: input.affects ?? [],
        })
        .select("id, status")
        .single();

      if (error) return toolError(`Could not record decision: ${error.message}`);

      if (input.supersedes_id && (input.status ?? "confirmed") === "confirmed") {
        const { error: supersedeError } = await principal.raw
          .from("decision_records")
          .update({ status: "superseded", updated_at: new Date().toISOString() })
          .eq("organisation_id", principal.organisationId)
          .eq("id", input.supersedes_id);

        if (supersedeError) {
          console.error("[mcp] could not supersede prior decision", supersedeError);
          return toolError(
            "The new decision was recorded, but the prior decision could not be marked superseded. Review the decision history.",
          );
        }
      }

      await writeAuditLog(principal.supabase, {
        organisationId: principal.organisationId,
        actorUserId: principal.userId,
        actorType: "ai_agent",
        action: "create",
        resource: "decision_record",
        resourceId: data.id,
        clientId: input.client_id ?? null,
        metadata: {
          source: "chatgpt_mcp",
          decision_type: input.decision_type,
          status: data.status,
          supersedes_id: input.supersedes_id ?? null,
        },
      });

      return textResult("Decision recorded.", {
        decision_id: data.id,
        status: data.status,
      });
    },
  );

  server.registerTool(
    "propose_learning",
    {
      title: "Propose durable learning",
      description:
        "Use this when evidence suggests a durable client or IHP truth should be reviewed for promotion into knowledge, such as a changed offer, ICP insight, objection, positioning rule or winning pattern. This creates an approval-gated learning proposal and does not apply it automatically.",
      inputSchema: {
        client_id: z.string().uuid().optional(),
        proposed_learning: z.string().trim().min(1).max(10_000),
        knowledge_kind: z.enum([
          "sop",
          "playbook",
          "brand_voice",
          "offer",
          "icp",
          "objection",
          "winning_pattern",
          "positioning",
          "policy",
          "faq",
        ]),
        title: z.string().trim().min(1).max(240),
        reason_for_promotion: z.string().trim().min(1).max(5_000),
        confidence_label: confidenceSchema.optional(),
        evidence_ids: z.array(z.string().uuid()).max(50).optional(),
        contradictions_or_risks: z.array(z.string().max(1_000)).max(30).optional(),
      },
      outputSchema: {
        learning_proposal_id: z.string(),
        status: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      _meta: { securitySchemes: oauthSecurity },
    },
    async (input) => {
      if (input.client_id) {
        try {
          await requireClient(principal, input.client_id);
        } catch (error) {
          return toolError(error instanceof Error ? error.message : "Client is not accessible.");
        }
      }

      const { data, error } = await principal.supabase
        .from("learning_proposals")
        .insert({
          organisation_id: principal.organisationId,
          client_id: input.client_id ?? null,
          proposed_by_profile_id: principal.userId,
          raw_evidence_references: (input.evidence_ids ?? []).map((id) => ({
            type: "evidence_item",
            id,
          })),
          proposed_learning: input.proposed_learning,
          proposed_destination: {
            type: "knowledge_entry",
            kind: input.knowledge_kind,
            title: input.title,
          },
          reason_for_promotion: input.reason_for_promotion,
          confidence_label: input.confidence_label ?? "UNSET",
          contradictions_or_risks: input.contradictions_or_risks ?? [],
          status: "pending_approval",
          required_approver_id: principal.roleSlug === "agency_owner" ? principal.userId : null,
        })
        .select("id, status")
        .single();

      if (error) return toolError(`Could not create learning proposal: ${error.message}`);

      await writeAuditLog(principal.supabase, {
        organisationId: principal.organisationId,
        actorUserId: principal.userId,
        actorType: "ai_agent",
        action: "create",
        resource: "learning_proposal",
        resourceId: data.id,
        clientId: input.client_id ?? null,
        metadata: {
          source: "chatgpt_mcp",
          knowledge_kind: input.knowledge_kind,
          confidence_label: input.confidence_label ?? "UNSET",
        },
      });

      return textResult("Learning proposal created and left pending approval.", {
        learning_proposal_id: data.id,
        status: data.status,
      });
    },
  );

  server.registerTool(
    "create_task",
    {
      title: "Create internal IHP task",
      description:
        "Use this when the user explicitly asks to turn work from the conversation into an internal IHP OS task. This creates a task only. It does not send anything to a client or execute the work.",
      inputSchema: {
        client_id: z.string().uuid().optional(),
        project_id: z.string().uuid().optional(),
        title: z.string().trim().min(1).max(300),
        category: z.string().trim().max(120).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        due_date: z.string().date().optional(),
        assignee_id: z.string().uuid().optional(),
        billable: z.boolean().optional(),
      },
      outputSchema: {
        task_id: z.string(),
        status: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      _meta: { securitySchemes: oauthSecurity },
    },
    async (input) => {
      if (input.client_id) {
        try {
          await requireClient(principal, input.client_id);
        } catch (error) {
          return toolError(error instanceof Error ? error.message : "Client is not accessible.");
        }
      }

      const { data, error } = await principal.supabase
        .from("tasks")
        .insert({
          organisation_id: principal.organisationId,
          client_id: input.client_id ?? null,
          project_id: input.project_id ?? null,
          title: input.title,
          category: input.category ?? "chatgpt_capture",
          priority: input.priority ?? "medium",
          due_date: input.due_date ?? null,
          assignee_id: input.assignee_id ?? principal.userId,
          billable: input.billable ?? false,
          status: "not_started",
        })
        .select("id, status")
        .single();

      if (error) return toolError(`Could not create task: ${error.message}`);

      await writeAuditLog(principal.supabase, {
        organisationId: principal.organisationId,
        actorUserId: principal.userId,
        actorType: "ai_agent",
        action: "create",
        resource: "task",
        resourceId: data.id,
        clientId: input.client_id ?? null,
        metadata: {
          source: "chatgpt_mcp",
          project_id: input.project_id ?? null,
        },
      });

      return textResult("Internal IHP task created.", {
        task_id: data.id,
        status: data.status,
      });
    },
  );

  return server;
}
