import type { ServerEnv } from "@ihp/config";
import { executeOpenAiChat, type ChatMessage, type ChatResult } from "./providers/openai";
import type { ProviderSlug } from "./types";
import { AiRoutingError } from "./types";

export function configuredProviders(env: ServerEnv): ProviderSlug[] {
  const providers: ProviderSlug[] = [];
  if (env.OPENAI_API_KEY) providers.push("openai");
  if (env.GEMINI_API_KEY) providers.push("gemini");
  if (env.ANTHROPIC_API_KEY) providers.push("anthropic");
  return providers;
}

/**
 * Executes a draft-mode chat with the routed provider. OpenAI is live;
 * Gemini and Anthropic throw a clear routing error until their adapters
 * activate with credentials — selectProvider should already have excluded
 * them via availableProviders, so reaching those branches is a bug signal,
 * not a user-facing state.
 */
export async function executeChat(
  env: ServerEnv,
  provider: ProviderSlug,
  messages: ChatMessage[],
  options?: { model?: string; maxOutputTokens?: number },
): Promise<ChatResult> {
  switch (provider) {
    case "openai": {
      if (!env.OPENAI_API_KEY) throw new AiRoutingError("OpenAI is not configured.");
      return executeOpenAiChat(env.OPENAI_API_KEY, messages, options);
    }
    case "gemini":
      throw new AiRoutingError("Gemini execution is not yet implemented. Supply GEMINI_API_KEY and the adapter activates in a later pass.");
    case "anthropic":
      throw new AiRoutingError("Claude execution is not yet implemented. Supply ANTHROPIC_API_KEY and the adapter activates in a later pass.");
  }
}
