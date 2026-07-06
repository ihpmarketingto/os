import type { ServerEnv } from "@ihp/config";
import type { IntegrationAdapter, IntegrationHealth, IntegrationKind, IntegrationProviderSlug } from "../types";

/**
 * Placeholder adapter for providers whose real implementation lands in a
 * later phase. It reports configuration status honestly and never claims
 * to be reachable, so Settings > Integrations never shows a false
 * "connected".
 */
export function createStubAdapter(
  provider: IntegrationProviderSlug,
  displayName: string,
  envKeys: (keyof ServerEnv)[],
  env: ServerEnv,
  options?: { kind?: IntegrationKind; requiredCredentials?: string[] },
): IntegrationAdapter {
  const kind = options?.kind ?? "planned";
  return {
    provider,
    displayName,
    kind,
    requiredScopes: [],
    requiredCredentials: options?.requiredCredentials ?? envKeys.map(String),
    isConfigured(): boolean {
      return envKeys.length > 0 && envKeys.every((k) => Boolean(env[k]));
    },
    async checkHealth(): Promise<IntegrationHealth> {
      const configured = this.isConfigured();
      return {
        provider,
        configured,
        reachable: "unknown",
        error: configured ? undefined : `${displayName} adapter not yet implemented (${kind})`,
      };
    },
  };
}
