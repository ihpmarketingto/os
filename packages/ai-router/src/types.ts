export type ProviderSlug = "openai" | "gemini" | "anthropic";

export type AiMode = "read" | "draft" | "action_proposal";

export type AiTaskType =
  | "report_drafting"
  | "copy_generation"
  | "meeting_summary"
  | "client_follow_up"
  | "structured_extraction"
  | "tool_calling"
  | "workspace_document_analysis"
  | "multimodal_analysis"
  | "research"
  | "code_generation"
  | "code_review"
  | "repo_analysis"
  | "long_form_strategy"
  | "copy_refinement"
  | "build_library_analysis";

/**
 * Ordered provider preference per task type, per spec section 23's
 * provider profiles. First configured + allowed provider in the list wins;
 * the rest are fallbacks if the preferred provider is unavailable.
 */
export const PROVIDER_TASK_AFFINITY: Record<AiTaskType, ProviderSlug[]> = {
  report_drafting: ["openai", "anthropic", "gemini"],
  copy_generation: ["openai", "anthropic", "gemini"],
  meeting_summary: ["openai", "gemini", "anthropic"],
  client_follow_up: ["openai", "anthropic", "gemini"],
  structured_extraction: ["openai", "gemini", "anthropic"],
  tool_calling: ["openai", "gemini", "anthropic"],
  workspace_document_analysis: ["gemini", "openai", "anthropic"],
  multimodal_analysis: ["gemini", "openai", "anthropic"],
  research: ["gemini", "openai", "anthropic"],
  code_generation: ["anthropic", "openai", "gemini"],
  code_review: ["anthropic", "openai", "gemini"],
  repo_analysis: ["anthropic", "openai", "gemini"],
  long_form_strategy: ["anthropic", "openai", "gemini"],
  copy_refinement: ["anthropic", "openai", "gemini"],
  build_library_analysis: ["anthropic", "openai", "gemini"],
};

/**
 * Actions AI may never take unattended, regardless of mode or role — per
 * spec section 23. action_proposal mode can *propose* these; only an
 * explicit human decision on the resulting ai_action_proposals row executes
 * them (see packages/database ai_action_proposals table).
 */
export const IRREVERSIBLE_ACTIONS = [
  "send_client_email",
  "publish_content",
  "publish_landing_page",
  "launch_campaign",
  "change_paid_media_budget",
  "pause_campaign",
  "spend_money",
  "refund_money",
  "send_invoice",
  "sign_contract",
  "delete_data",
  "alter_permissions",
  "change_billing_information",
  "invite_user",
  "share_confidential_data_externally",
] as const;
export type IrreversibleAction = (typeof IRREVERSIBLE_ACTIONS)[number];

export interface ClientAiSettings {
  aiEnabled: boolean;
  allowedProviders: ProviderSlug[];
  financialDataAccessible: boolean;
  contactDataAccessible: boolean;
  contractsAccessible: boolean;
  documentsAccessible: boolean;
}

export interface SpendLimitCheck {
  (candidate: { provider: ProviderSlug; organisationId: string; clientId?: string | null; userId?: string | null }): Promise<boolean> | boolean;
}

export interface RoutingRequest {
  taskType: AiTaskType;
  mode: AiMode;
  organisationId: string;
  clientId?: string | null;
  userId?: string | null;
  clientAiSettings?: ClientAiSettings;
  preferredProvider?: ProviderSlug;
  /** Providers actually configured (env vars present) and reachable right now. */
  availableProviders: ProviderSlug[];
  withinSpendLimit?: SpendLimitCheck;
}

export interface RoutingDecision {
  provider: ProviderSlug;
  reason: string;
  fallbacksConsidered: ProviderSlug[];
}

export class AiRoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiRoutingError";
  }
}

export class AiActionNotAllowedError extends Error {
  constructor(action: IrreversibleAction, mode: AiMode) {
    super(
      `AI cannot execute "${action}" in mode "${mode}". Irreversible actions require an approved ai_action_proposals row.`,
    );
    this.name = "AiActionNotAllowedError";
  }
}
