import { describe, expect, it } from "vitest";
import {
  ClientAdapterSchema,
  IHP_DOMAIN_APP_MANIFESTS,
  IHP_PLUGIN_MANIFESTS,
  LearningProposalSchema,
  TaskEnvelopeSchema,
  evaluateLearningPromotionGate,
  evaluateTaskEnvelopeGate,
  validateClientAdapterSelection,
  validateOperatingModelRegistry,
} from "./operating-model";

describe("validateOperatingModelRegistry", () => {
  it("accepts the built-in App and Plugin manifests", () => {
    const result = validateOperatingModelRegistry(IHP_DOMAIN_APP_MANIFESTS, IHP_PLUGIN_MANIFESTS);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects a Plugin whose parent App does not exist", () => {
    const plugin = IHP_PLUGIN_MANIFESTS[0];
    if (!plugin) {
      throw new Error("Expected a built-in Plugin manifest.");
    }

    const result = validateOperatingModelRegistry(IHP_DOMAIN_APP_MANIFESTS, [
      {
        ...plugin,
        stableId: "orphan_plugin",
        parentApp: "missing_app",
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toContain("missing App");
  });
});

describe("validateClientAdapterSelection", () => {
  it("blocks cross-client source references", () => {
    const adapter = ClientAdapterSchema.parse({
      stableId: "sample_client",
      clientId: "client-a",
      clientName: "Sample Client",
      founderIdentityIds: [],
      teamIdentityIds: [],
      brandIdentityId: null,
      audienceIdentityIds: [],
      approvedSourceLocations: [],
      connectedTools: [],
      permissionPolicy: {},
      claimPolicy: {},
      approvalOwners: [],
      businessRules: [],
      dataBoundaries: [],
      enabledApps: ["content_communications"],
      enabledPlugins: ["ai_draft_workspace"],
      currentOperatingMode: "shadow",
      clientConfiguration: {},
      version: "1.0.0",
      reviewStatus: "working",
    });

    const envelope = TaskEnvelopeSchema.parse({
      taskId: "task-1",
      clientId: "client-a",
      userRequest: "Draft a follow-up email",
      relevantIdentityRefs: [],
      selectedApp: "content_communications",
      selectedPlugin: "ai_draft_workspace",
      sourceReferences: [
        {
          sourceType: "knowledge_entry",
          sourceId: "kb-1",
          clientId: "client-b",
          locator: null,
          version: null,
          evidenceLabel: "CONFIRMED",
          usage: "material",
          notes: null,
        },
      ],
      operatingMode: "shadow",
      authorityState: "confirmed",
      permissionState: "granted",
      approvalRequirements: [],
      currentStep: "load",
      currentStatus: "in_progress",
      outputDestination: { kind: "internal_draft", target: "ai_intelligence" },
      auditReferences: [],
    });

    const result = validateClientAdapterSelection(adapter, envelope);

    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("different client");
  });
});

describe("evaluateTaskEnvelopeGate", () => {
  it("blocks execution when authority is missing", () => {
    const envelope = TaskEnvelopeSchema.parse({
      taskId: "task-2",
      clientId: "client-a",
      userRequest: "Publish this landing page",
      relevantIdentityRefs: [],
      selectedApp: "web_funnel_builds",
      selectedPlugin: "landing_page_factory",
      sourceReferences: [],
      operatingMode: "approval",
      authorityState: "missing",
      permissionState: "granted",
      approvalRequirements: [{ label: "Sarah approval", approverRole: "sarah", status: "approved" }],
      currentStep: "gate",
      currentStatus: "in_progress",
      outputDestination: { kind: "client_delivery", target: "landing_page_factory" },
      auditReferences: [],
    });

    const result = evaluateTaskEnvelopeGate(envelope, { requestedOutcome: "execution" });

    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Missing authority");
  });
});

describe("evaluateLearningPromotionGate", () => {
  it("blocks learning promotion when approval has not been recorded", () => {
    const proposal = LearningProposalSchema.parse({
      proposalId: "proposal-1",
      clientId: "client-a",
      rawEvidenceReferences: [
        {
          sourceType: "call_transcript",
          sourceId: "call-1",
          clientId: "client-a",
          locator: "transcript:12",
          version: "2026-08-10",
          evidenceLabel: "WORKING",
          usage: "claim_origin",
          notes: null,
        },
      ],
      proposedLearning: "Clients convert faster when pricing is shown before booking.",
      proposedDestination: { kind: "plugin", targetId: "landing_page_factory" },
      reasonForPromotion: "Repeated in three transcript reviews.",
      confidenceLabel: "WORKING",
      contradictionsOrRisks: ["Only observed in one service line so far."],
      status: "pending_approval",
      requiredApprover: "sarah",
      approvalRecord: { status: "pending", decidedBy: null, decidedAt: null, notes: null },
      versionImpact: { targetVersion: "1.0.0", nextVersion: null, rollbackPath: "Revert to prior plugin manifest." },
    });

    const result = evaluateLearningPromotionGate(proposal);

    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("approved decision record");
  });
});
