export type IntegrationProviderSlug =
  | "google_workspace"
  | "github"
  | "stripe"
  | "resend"
  | "sendgrid"
  | "meta_ads"
  | "google_ads"
  | "klaviyo"
  | "vercel"
  | "netlify"
  | "cloudflare_pages";

export interface IntegrationHealth {
  provider: IntegrationProviderSlug;
  configured: boolean;
  reachable: boolean | "unknown";
  error?: string;
}

/**
 * Every integration implements this shape so the framework can degrade
 * gracefully: a missing/broken adapter shows as "not connected" in
 * Settings > Integrations rather than crashing the request that touched it.
 */
export interface IntegrationAdapter {
  provider: IntegrationProviderSlug;
  displayName: string;
  requiredScopes: string[];
  isConfigured(): boolean;
  /** Cheap reachability check — never throws, always resolves to a health record. */
  checkHealth(): Promise<IntegrationHealth>;
}
