import { z } from "zod";

export const EVIDENCE_LABELS = ["CONFIRMED", "WORKING", "HISTORICAL", "VERIFY", "UNSET"] as const;
export const OPERATING_MODES = ["shadow", "approval", "guardrailed_execution"] as const;
export const DELIVERY_STATUSES = ["implemented", "scaffolded", "proposed", "deferred", "requires_approval"] as const;
export const REVIEW_STATUSES = ["draft", "working", "approved", "archived"] as const;
export const IDENTITY_TYPES = [
  "internal_operator",
  "client_founder",
  "client_team_member",
  "brand",
  "audience",
  "subject_matter_specialist",
  "system",
] as const;
export const IDENTITY_SCOPES = ["organisation", "client", "app", "plugin", "task"] as const;
export const WORKFLOW_STEPS = [
  "identify",
  "load",
  "diagnose",
  "plan",
  "gate",
  "produce_or_execute",
  "verify",
  "record",
  "hand_off",
] as const;

export const EvidenceLabelSchema = z.enum(EVIDENCE_LABELS);
export const OperatingModeSchema = z.enum(OPERATING_MODES);
export const DeliveryStatusSchema = z.enum(DELIVERY_STATUSES);
export const ReviewStatusSchema = z.enum(REVIEW_STATUSES);
export const IdentityTypeSchema = z.enum(IDENTITY_TYPES);
export const IdentityScopeSchema = z.enum(IDENTITY_SCOPES);
export const WorkflowStepSchema = z.enum(WORKFLOW_STEPS);

export const StableIdSchema = z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, {
  message: "Stable IDs must use snake_case.",
});

export const SourceUsageSchema = z.enum(["retrieved", "opened", "material", "claim_origin"]);

export const SourceReferenceSchema = z.object({
  sourceType: z.string().min(1),
  sourceId: z.string().min(1).nullable().default(null),
  clientId: z.string().min(1).nullable().default(null),
  locator: z.string().min(1).nullable().default(null),
  version: z.string().min(1).nullable().default(null),
  evidenceLabel: EvidenceLabelSchema.default("UNSET"),
  usage: SourceUsageSchema.default("retrieved"),
  notes: z.string().min(1).nullable().default(null),
});

export const IdentityContributionSchema = z.object({
  identityId: StableIdSchema,
  authorityKind: z.enum(["judgment", "voice", "approval", "restriction", "source_owner"]),
  notes: z.string().min(1).nullable().default(null),
});

export const IdentityRegistryEntrySchema = z.object({
  stableId: StableIdSchema,
  displayName: z.string().min(1),
  identityType: IdentityTypeSchema,
  owner: z.string().min(1).nullable().default(null),
  scope: IdentityScopeSchema,
  authority: z.array(z.string().min(1)).default([]),
  sourceReferences: z.array(SourceReferenceSchema).default([]),
  reasoningPrinciples: z.array(z.string().min(1)).default([]),
  voiceGuidance: z.string().min(1).nullable().default(null),
  restrictions: z.array(z.string().min(1)).default([]),
  version: z.string().min(1),
  reviewStatus: ReviewStatusSchema,
  lastApprovedDate: z.string().min(1).nullable().default(null),
  approver: z.string().min(1).nullable().default(null),
  evidenceLabel: EvidenceLabelSchema.default("UNSET"),
});

export const DomainAppManifestSchema = z.object({
  stableId: StableIdSchema,
  displayName: z.string().min(1),
  purpose: z.string().min(1),
  sharedContext: z.array(z.string().min(1)).default([]),
  pluginIds: z.array(StableIdSchema).default([]),
  permissions: z.array(z.string().min(1)).default([]),
  deliveryStatus: DeliveryStatusSchema,
  version: z.string().min(1),
  rollbackPath: z.string().min(1),
});

export const PluginManifestSchema = z.object({
  stableId: StableIdSchema,
  parentApp: StableIdSchema,
  displayName: z.string().min(1),
  purpose: z.string().min(1),
  supportedTasks: z.array(z.string().min(1)).default([]),
  requiredContext: z.array(z.string().min(1)).default([]),
  requiredIdentities: z.array(IdentityTypeSchema).default([]),
  requiredSources: z.array(z.string().min(1)).default([]),
  permissions: z.array(z.string().min(1)).default([]),
  inputContract: z.record(z.string(), z.unknown()).default({}),
  outputContract: z.record(z.string(), z.unknown()).default({}),
  approvalRequirements: z.array(z.string().min(1)).default([]),
  evaluationCriteria: z.array(z.string().min(1)).default([]),
  knownLimitations: z.array(z.string().min(1)).default([]),
  version: z.string().min(1),
  rollbackPath: z.string().min(1),
  deliveryStatus: DeliveryStatusSchema,
});

export const ApprovalRequirementSchema = z.object({
  label: z.string().min(1),
  approverRole: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected", "not_required"]).default("pending"),
});

export const TaskOutputDestinationSchema = z.object({
  kind: z.enum(["internal_draft", "approval_queue", "task_queue", "client_delivery", "external_system"]),
  target: z.string().min(1),
});

export const TaskEnvelopeSchema = z.object({
  taskId: z.string().min(1),
  clientId: z.string().min(1).nullable().default(null),
  userRequest: z.string().min(1),
  relevantIdentityRefs: z.array(IdentityContributionSchema).default([]),
  selectedApp: StableIdSchema,
  selectedPlugin: StableIdSchema,
  sourceReferences: z.array(SourceReferenceSchema).default([]),
  operatingMode: OperatingModeSchema,
  authorityState: z.enum(["missing", "limited", "confirmed"]).default("missing"),
  permissionState: z.enum(["unverified", "granted", "denied"]).default("unverified"),
  approvalRequirements: z.array(ApprovalRequirementSchema).default([]),
  currentStep: WorkflowStepSchema.default("identify"),
  currentStatus: z.enum(["draft", "in_progress", "blocked", "completed", "handed_off", "failed"]).default("draft"),
  outputDestination: TaskOutputDestinationSchema,
  auditReferences: z.array(z.string().min(1)).default([]),
});

export const ClientAdapterSchema = z.object({
  stableId: StableIdSchema,
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  founderIdentityIds: z.array(z.string().min(1)).default([]),
  teamIdentityIds: z.array(z.string().min(1)).default([]),
  brandIdentityId: z.string().min(1).nullable().default(null),
  audienceIdentityIds: z.array(z.string().min(1)).default([]),
  approvedSourceLocations: z.array(z.string().min(1)).default([]),
  connectedTools: z.array(z.string().min(1)).default([]),
  permissionPolicy: z.record(z.string(), z.unknown()).default({}),
  claimPolicy: z.record(z.string(), z.unknown()).default({}),
  approvalOwners: z.array(z.string().min(1)).default([]),
  businessRules: z.array(z.string().min(1)).default([]),
  dataBoundaries: z.array(z.string().min(1)).default([]),
  enabledApps: z.array(StableIdSchema).default([]),
  enabledPlugins: z.array(StableIdSchema).default([]),
  currentOperatingMode: OperatingModeSchema,
  clientConfiguration: z.record(z.string(), z.unknown()).default({}),
  version: z.string().min(1),
  reviewStatus: ReviewStatusSchema,
});

export const LearningProposalDestinationSchema = z.object({
  kind: z.enum(["os", "identity", "app", "plugin", "client_adapter", "knowledge_entry", "permission_policy", "claim_policy"]),
  targetId: z.string().min(1),
});

export const LearningApprovalRecordSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  decidedBy: z.string().min(1).nullable().default(null),
  decidedAt: z.string().min(1).nullable().default(null),
  notes: z.string().min(1).nullable().default(null),
});

export const LearningVersionImpactSchema = z.object({
  targetVersion: z.string().min(1).nullable().default(null),
  nextVersion: z.string().min(1).nullable().default(null),
  rollbackPath: z.string().min(1).nullable().default(null),
});

export const LearningProposalSchema = z.object({
  proposalId: z.string().min(1),
  clientId: z.string().min(1).nullable().default(null),
  rawEvidenceReferences: z.array(SourceReferenceSchema).min(1),
  proposedLearning: z.string().min(1),
  proposedDestination: LearningProposalDestinationSchema,
  reasonForPromotion: z.string().min(1),
  confidenceLabel: EvidenceLabelSchema.default("UNSET"),
  contradictionsOrRisks: z.array(z.string().min(1)).default([]),
  status: z.enum(["draft", "pending_approval", "approved", "rejected", "applied"]).default("draft"),
  requiredApprover: z.string().min(1).nullable().default(null),
  approvalRecord: LearningApprovalRecordSchema.default({ status: "pending", decidedBy: null, decidedAt: null, notes: null }),
  versionImpact: LearningVersionImpactSchema.default({ targetVersion: null, nextVersion: null, rollbackPath: null }),
});

export const EvidenceLineageRecordSchema = z.object({
  taskEnvelopeId: z.string().min(1),
  aiRunId: z.string().min(1).nullable().default(null),
  sourceType: z.string().min(1),
  sourceId: z.string().min(1).nullable().default(null),
  sourceClientId: z.string().min(1).nullable().default(null),
  sourceLocator: z.string().min(1).nullable().default(null),
  sourceVersion: z.string().min(1).nullable().default(null),
  usage: SourceUsageSchema,
  claimLocator: z.string().min(1).nullable().default(null),
  suppliedIdentityId: StableIdSchema.nullable().default(null),
  unresolvedUncertainty: z.string().min(1).nullable().default(null),
});

export const EvaluationDimensionSchema = z.object({
  dimension: z.enum([
    "factual_accuracy",
    "source_fidelity",
    "client_isolation",
    "permission_compliance",
    "commercial_logic",
    "strategic_movement",
    "brand_alignment",
    "voice",
    "human_effectiveness",
    "technical_correctness",
    "usefulness",
    "performance_outcomes",
  ]),
  outcome: z.enum(["pass", "warning", "fail", "not_evaluated"]),
  notes: z.string().min(1).nullable().default(null),
});

export const EvaluationRecordSchema = z.object({
  taskEnvelopeId: z.string().min(1).nullable().default(null),
  pluginId: StableIdSchema,
  evaluatorIdentityId: StableIdSchema.nullable().default(null),
  evaluationType: z.enum(["self_check", "independent_qa", "human_review", "performance_follow_up"]),
  independent: z.boolean().default(false),
  dimensions: z.array(EvaluationDimensionSchema).default([]),
  overallOutcome: z.enum(["pass", "warning", "fail", "human_review_required"]),
  notes: z.string().min(1).nullable().default(null),
});

export type SourceReference = z.infer<typeof SourceReferenceSchema>;
export type IdentityRegistryEntry = z.infer<typeof IdentityRegistryEntrySchema>;
export type DomainAppManifest = z.infer<typeof DomainAppManifestSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
export type TaskEnvelope = z.infer<typeof TaskEnvelopeSchema>;
export type ClientAdapter = z.infer<typeof ClientAdapterSchema>;
export type LearningProposal = z.infer<typeof LearningProposalSchema>;
export type EvidenceLineageRecord = z.infer<typeof EvidenceLineageRecordSchema>;
export type EvaluationRecord = z.infer<typeof EvaluationRecordSchema>;

export function normaliseTaskEnvelope(input: unknown): TaskEnvelope {
  return TaskEnvelopeSchema.parse(input);
}

export function normaliseLearningProposal(input: unknown): LearningProposal {
  return LearningProposalSchema.parse(input);
}

export function validateOperatingModelRegistry(
  apps: DomainAppManifest[],
  plugins: PluginManifest[],
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const appIds = new Set<string>();
  const pluginIds = new Set<string>();

  for (const app of apps) {
    if (appIds.has(app.stableId)) {
      issues.push(`Duplicate App stable ID: ${app.stableId}.`);
    }
    appIds.add(app.stableId);
  }

  for (const plugin of plugins) {
    if (pluginIds.has(plugin.stableId)) {
      issues.push(`Duplicate Plugin stable ID: ${plugin.stableId}.`);
    }
    pluginIds.add(plugin.stableId);
    if (!appIds.has(plugin.parentApp)) {
      issues.push(`Plugin ${plugin.stableId} references missing App ${plugin.parentApp}.`);
    }
  }

  return { valid: issues.length === 0, issues };
}

export function validateClientAdapterSelection(
  adapter: ClientAdapter,
  envelope: TaskEnvelope,
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (envelope.clientId && envelope.clientId !== adapter.clientId) {
    reasons.push("Task Envelope client does not match the selected Client Adapter.");
  }
  if (!adapter.enabledApps.includes(envelope.selectedApp)) {
    reasons.push(`App ${envelope.selectedApp} is not enabled for this client.`);
  }
  if (!adapter.enabledPlugins.includes(envelope.selectedPlugin)) {
    reasons.push(`Plugin ${envelope.selectedPlugin} is not enabled for this client.`);
  }

  for (const source of envelope.sourceReferences) {
    if (source.clientId && source.clientId !== adapter.clientId) {
      reasons.push(`Source ${source.sourceType} belongs to a different client.`);
    }
  }

  return { allowed: reasons.length === 0, reasons };
}

export function evaluateTaskEnvelopeGate(
  envelope: TaskEnvelope,
  options: { requestedOutcome: "draft" | "decision" | "execution" | "publish" },
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (envelope.permissionState !== "granted") {
    reasons.push("Permission has not been granted for this task.");
  }

  if (options.requestedOutcome !== "draft" && envelope.authorityState !== "confirmed") {
    reasons.push("Missing authority blocks this action.");
  }

  if (options.requestedOutcome !== "draft" && envelope.operatingMode === "shadow") {
    reasons.push("Shadow mode allows diagnosis and drafting, not execution.");
  }

  if (options.requestedOutcome === "publish" || options.requestedOutcome === "execution") {
    const pendingApprovals = envelope.approvalRequirements.filter((requirement) => requirement.status !== "approved" && requirement.status !== "not_required");
    if (pendingApprovals.length > 0) {
      reasons.push("Required approvals are still missing.");
    }
  }

  return { allowed: reasons.length === 0, reasons };
}

export function evaluateLearningPromotionGate(
  proposal: LearningProposal,
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (proposal.requiredApprover === null) {
    reasons.push("A required approver must be recorded before learning can be promoted.");
  }
  if (proposal.approvalRecord.status !== "approved") {
    reasons.push("Learning cannot be promoted without an approved decision record.");
  }
  if (!["approved", "applied"].includes(proposal.status)) {
    reasons.push("Learning must be in an approved state before promotion.");
  }
  if (proposal.versionImpact.nextVersion === null) {
    reasons.push("Version impact must identify the next version before promotion.");
  }

  return { allowed: reasons.length === 0, reasons };
}

export const IHP_DOMAIN_APP_MANIFESTS = DomainAppManifestSchema.array().parse([
  {
    stableId: "source_intelligence",
    displayName: "Source Intelligence",
    purpose: "Loads, filters and ranks client-safe evidence before any draft, diagnosis or recommendation is produced.",
    sharedContext: ["knowledge_entries", "ai_source_citations", "ai_knowledge_citations"],
    pluginIds: ["source_routing"],
    permissions: ["content.read", "ai_settings.ai_retrieve"],
    deliveryStatus: "implemented",
    version: "1.0.0",
    rollbackPath: "Disable source-routing consumers and fall back to direct, explicitly scoped retrieval queries.",
  },
  {
    stableId: "content_communications",
    displayName: "Content and Communications",
    purpose: "Handles draft creation, review and approval for outbound written communication and content.",
    sharedContext: ["content_items", "approvals", "knowledge_entries"],
    pluginIds: ["ai_draft_workspace"],
    permissions: ["content.create", "content.update", "ai_settings.ai_retrieve"],
    deliveryStatus: "implemented",
    version: "1.0.0",
    rollbackPath: "Return to the existing Content Studio and AI Intelligence flows without manifest-based routing.",
  },
  {
    stableId: "decisions",
    displayName: "Decisions",
    purpose: "Frames strategy notes and other judgment-heavy internal work without pretending that drafting is the same thing as approval.",
    sharedContext: ["knowledge_entries", "campaign_metrics", "reports"],
    pluginIds: ["strategy_drafting"],
    permissions: ["ai_settings.ai_retrieve"],
    deliveryStatus: "implemented",
    version: "1.0.0",
    rollbackPath: "Use the existing AI Intelligence draft flow without a decision-specific manifest route.",
  },
  {
    stableId: "web_funnel_builds",
    displayName: "Web and Funnel Builds",
    purpose: "Owns governed landing page generation, QA, approvals, publishing history and rollback.",
    sharedContext: ["landing_page_briefs", "landing_page_projects", "landing_page_versions", "qa_runs", "deployments"],
    pluginIds: ["landing_page_factory"],
    permissions: ["landing_page_factory.read", "landing_page_factory.update", "landing_page_factory.approve"],
    deliveryStatus: "implemented",
    version: "1.0.0",
    rollbackPath: "Use the underlying Landing Page Factory workflow directly and keep versioned pages as the source of truth.",
  },
  {
    stableId: "reporting_measurement",
    displayName: "Reporting and Measurement",
    purpose: "Turns campaign and client data into explainable summaries, reporting context and measurement-oriented decisions.",
    sharedContext: ["campaign_metrics", "reports", "experiments"],
    pluginIds: ["metrics_interpretation"],
    permissions: ["reports.read", "campaigns.read", "ai_settings.ai_retrieve"],
    deliveryStatus: "implemented",
    version: "1.0.0",
    rollbackPath: "Continue using the existing reports and campaign views without manifest-based routing.",
  },
]);

export const IHP_PLUGIN_MANIFESTS = PluginManifestSchema.array().parse([
  {
    stableId: "source_routing",
    parentApp: "source_intelligence",
    displayName: "Source Routing",
    purpose: "Selects only client-safe, in-scope evidence and records what materially influenced an output.",
    supportedTasks: ["ground_ai_draft", "route_client_safe_sources", "record_source_lineage"],
    requiredContext: ["client_id", "organisation_id", "user_request"],
    requiredIdentities: [],
    requiredSources: ["knowledge_entries", "campaign_metrics", "reports", "tasks", "campaigns"],
    permissions: ["ai_settings.ai_retrieve", "content.read"],
    inputContract: {
      required: ["clientId", "instruction"],
      optional: ["taskType", "sourceBudget"],
    },
    outputContract: {
      provides: ["selectedSources", "knowledgeContext", "citationTrail"],
    },
    approvalRequirements: ["No human approval required for internal draft retrieval in shadow mode."],
    evaluationCriteria: ["source_fidelity", "client_isolation", "permission_compliance", "usefulness"],
    knownLimitations: ["Does not prove human-quality output on its own.", "Requires downstream QA for external use."],
    version: "1.0.0",
    rollbackPath: "Revert to direct retrieval queries in the consuming workflow.",
    deliveryStatus: "implemented",
  },
  {
    stableId: "ai_draft_workspace",
    parentApp: "content_communications",
    displayName: "AI Draft Workspace",
    purpose: "Produces internal drafts that still require human review before sending or publishing.",
    supportedTasks: ["draft_email", "draft_copy", "draft_follow_up", "draft_strategy_notes"],
    requiredContext: ["client_id", "user_request", "selected_sources"],
    requiredIdentities: [],
    requiredSources: ["knowledge_entries", "campaign_metrics", "reports"],
    permissions: ["ai_settings.ai_retrieve"],
    inputContract: {
      required: ["clientId", "taskType", "instruction"],
    },
    outputContract: {
      provides: ["draftText", "citations", "estimatedCostUsd"],
      blocks: ["send", "publish", "launch"],
    },
    approvalRequirements: ["Human review before any external send or publish action."],
    evaluationCriteria: ["factual_accuracy", "source_fidelity", "voice", "human_effectiveness"],
    knownLimitations: ["Shadow-mode drafting does not grant execution authority.", "No automatic learning promotion."],
    version: "1.0.0",
    rollbackPath: "Use the plain AI Intelligence draft flow without Task Envelope recording.",
    deliveryStatus: "implemented",
  },
  {
    stableId: "strategy_drafting",
    parentApp: "decisions",
    displayName: "Strategy Drafting",
    purpose: "Produces internal strategy notes with explicit uncertainty and without granting execution authority.",
    supportedTasks: ["draft_strategy_notes", "frame_options", "surface_open_questions"],
    requiredContext: ["client_id", "user_request", "selected_sources"],
    requiredIdentities: [],
    requiredSources: ["knowledge_entries", "campaign_metrics", "reports"],
    permissions: ["ai_settings.ai_retrieve"],
    inputContract: {
      required: ["clientId", "instruction"],
      optional: ["taskType", "recentMetricsWindow"],
    },
    outputContract: {
      provides: ["strategyDraft", "citationTrail", "openQuestions"],
      blocks: ["publish", "launch", "spend_change"],
    },
    approvalRequirements: ["Human strategy review before any external or spend-related action."],
    evaluationCriteria: ["factual_accuracy", "source_fidelity", "strategic_movement", "commercial_logic"],
    knownLimitations: ["A drafted strategy note is not an approved strategy decision."],
    version: "1.0.0",
    rollbackPath: "Route strategy notes through the generic AI draft workspace only.",
    deliveryStatus: "implemented",
  },
  {
    stableId: "landing_page_factory",
    parentApp: "web_funnel_builds",
    displayName: "Landing Page Factory",
    purpose: "Creates reusable, governed landing pages with exact-version QA, approvals, publishing history and rollback.",
    supportedTasks: ["create_landing_page", "edit_landing_page", "submit_page_for_approval", "record_page_performance"],
    requiredContext: ["client_id", "brief_id", "template_or_preset", "approved_sources"],
    requiredIdentities: ["brand", "audience"],
    requiredSources: ["landing_page_briefs", "knowledge_entries", "documents", "creative_assets", "qa_runs", "approvals"],
    permissions: ["landing_page_factory.read", "landing_page_factory.update", "landing_page_factory.approve"],
    inputContract: {
      required: ["clientId", "briefId", "name", "generationMode"],
      optional: ["templateId", "referenceBuildProjectId", "projectId"],
    },
    outputContract: {
      provides: ["landingPageVersion", "qaHistory", "approvalState", "rollbackPoints"],
    },
    approvalRequirements: ["Explicit client approval before publish.", "Independent QA on the submitted version."],
    evaluationCriteria: ["client_isolation", "permission_compliance", "brand_alignment", "technical_correctness", "performance_outcomes"],
    knownLimitations: ["Builds are governed, not autonomously deployable.", "Production publish still requires human approval."],
    version: "1.0.0",
    rollbackPath: "Use the stored landing_page_versions and deployments history to restore an earlier approved version.",
    deliveryStatus: "implemented",
  },
  {
    stableId: "metrics_interpretation",
    parentApp: "reporting_measurement",
    displayName: "Metrics Interpretation",
    purpose: "Interprets recent performance context for reports and decision support without inventing commercial claims.",
    supportedTasks: ["draft_report_commentary", "summarise_channel_metrics", "frame_measurement_risks"],
    requiredContext: ["client_id", "metrics_window", "user_request"],
    requiredIdentities: [],
    requiredSources: ["campaign_metrics", "reports", "experiments"],
    permissions: ["campaigns.read", "reports.read", "ai_settings.ai_retrieve"],
    inputContract: {
      required: ["clientId", "instruction"],
      optional: ["reportId", "dateWindow"],
    },
    outputContract: {
      provides: ["interpretedFindings", "citationTrail"],
    },
    approvalRequirements: ["Human review before client delivery."],
    evaluationCriteria: ["factual_accuracy", "commercial_logic", "strategic_movement", "usefulness"],
    knownLimitations: ["A passing self-check cannot replace independent review.", "Does not bypass report approval workflow."],
    version: "1.0.0",
    rollbackPath: "Fall back to the existing reports module without AI-assisted interpretation.",
    deliveryStatus: "implemented",
  },
]);

export function getDomainAppManifest(stableId: string): DomainAppManifest | null {
  return IHP_DOMAIN_APP_MANIFESTS.find((app) => app.stableId === stableId) ?? null;
}

export function getPluginManifest(stableId: string): PluginManifest | null {
  return IHP_PLUGIN_MANIFESTS.find((plugin) => plugin.stableId === stableId) ?? null;
}
