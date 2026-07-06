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
  | "cloudflare_pages"
  | "gohighlevel"
  | "meta_pixel"
  | "meta_conversions_api"
  | "ga4"
  | "gtm"
  | "calendly"
  | "square"
  | "twilio"
  | "discord"
  | "zapier"
  | "n8n"
  | "quickbooks";

/**
 * How the integration connects (spec section 27A requires this to be
 * explicit in the UI, not implied):
 * - native: direct API/OAuth implementation in this codebase
 * - webhook: we receive (or send) webhooks; no polling API client
 * - csv: manual import/export is the supported path for now
 * - planned: architecture slot exists, no implementation yet
 */
export type IntegrationKind = "native" | "webhook" | "csv" | "planned";

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
  kind: IntegrationKind;
  requiredScopes: string[];
  /** Human-readable list of credentials needed before activation. */
  requiredCredentials: string[];
  isConfigured(): boolean;
  /** Cheap reachability check — never throws, always resolves to a health record. */
  checkHealth(): Promise<IntegrationHealth>;
}
