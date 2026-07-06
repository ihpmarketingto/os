import {
  AiActionNotAllowedError,
  AiRoutingError,
  IRREVERSIBLE_ACTIONS,
  PROVIDER_TASK_AFFINITY,
  type AiMode,
  type IrreversibleAction,
  type RoutingDecision,
  type RoutingRequest,
} from "./types";

/**
 * Picks a provider for a task. Never silently sends client data anywhere:
 * if the client has AI disabled, or no allowed/configured provider survives
 * filtering, this throws instead of guessing.
 */
export async function selectProvider(request: RoutingRequest): Promise<RoutingDecision> {
  const { taskType, clientAiSettings, availableProviders, preferredProvider, organisationId, clientId, userId, withinSpendLimit } = request;

  if (clientAiSettings && !clientAiSettings.aiEnabled) {
    throw new AiRoutingError("AI is disabled for this client. Enable it in Client 360 > AI settings first.");
  }

  const affinity = PROVIDER_TASK_AFFINITY[taskType];
  const ordered = preferredProvider ? [preferredProvider, ...affinity.filter((p) => p !== preferredProvider)] : affinity;

  const candidates = ordered.filter((provider) => {
    if (!availableProviders.includes(provider)) return false;
    if (clientAiSettings && !clientAiSettings.allowedProviders.includes(provider)) return false;
    return true;
  });

  const fallbacksConsidered: typeof candidates = [];
  for (const provider of candidates) {
    if (withinSpendLimit) {
      const ok = await withinSpendLimit({ provider, organisationId, clientId, userId });
      if (!ok) {
        fallbacksConsidered.push(provider);
        continue;
      }
    }
    return {
      provider,
      reason:
        provider === affinity[0]
          ? `Preferred provider for task type "${taskType}"`
          : `Fell back to "${provider}" after ${fallbacksConsidered.length} unavailable/over-limit candidate(s)`,
      fallbacksConsidered,
    };
  }

  throw new AiRoutingError(
    `No available provider for task "${taskType}". Candidates considered: ${ordered.join(", ") || "none"}. ` +
      "Check client AI provider allow-list, org integration connections, and spend limits.",
  );
}

/**
 * Call before executing anything an AI run wants to do. Only action_proposal
 * mode may even *propose* an irreversible action, and this function does not
 * execute it — it only gates whether a proposal may be created at all.
 * Execution happens later, only after a human decides on the resulting
 * ai_action_proposals row.
 */
export function assertActionAllowed(action: IrreversibleAction, mode: AiMode): void {
  if (!IRREVERSIBLE_ACTIONS.includes(action)) return;
  if (mode !== "action_proposal") {
    throw new AiActionNotAllowedError(action, mode);
  }
}

export * from "./types";
