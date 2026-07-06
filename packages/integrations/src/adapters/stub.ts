import type { ServerEnv } from "@ihp/config";
import type { IntegrationAdapter, IntegrationHealth, IntegrationProviderSlug } from "../types";

/**
 * Placeholder adapter for providers whose real implementation lands in a
 * later phase (Stripe in Phase 2, Meta/Google Ads and Klaviyo in Phase 3,
 * Vercel/Netlify/Cloudflare in Phase 4). It reports configuration status
 * honestly and never claims to be reachable, so Settings > Integrations
 * never shows a false "connected".
 */
export function createStubAdapter(
  provider: IntegrationProviderSlug,
  displayName: string,
  envKeys: (keyof ServerEnv)[],
  env: ServerEnv,
): IntegrationAdapter {
  return {
    provider,
    displayName,
    requiredScopes: [],
    isConfigured(): boolean {
      return envKeys.length > 0 && envKeys.every((k) => Boolean(env[k]));
    },
    async checkHealth(): Promise<IntegrationHealth> {
      const configured = this.isConfigured();
      return {
        provider,
        configured,
        reachable: "unknown",
        error: configured ? undefined : `${displayName} adapter not yet implemented (planned for a later phase)`,
      };
    },
  };
}
