import type { ServerEnv } from "@ihp/config";
import { createGithubAdapter } from "./adapters/github";
import { createGoogleWorkspaceAdapter } from "./adapters/google-workspace";
import { createStubAdapter } from "./adapters/stub";
import type { IntegrationAdapter, IntegrationHealth, IntegrationProviderSlug } from "./types";

export function buildIntegrationRegistry(env: ServerEnv): Record<IntegrationProviderSlug, IntegrationAdapter> {
  return {
    github: createGithubAdapter(env),
    google_workspace: createGoogleWorkspaceAdapter(env),
    stripe: createStubAdapter("stripe", "Stripe", ["STRIPE_SECRET_KEY"], env),
    resend: createStubAdapter("resend", "Resend", ["RESEND_API_KEY"], env),
    sendgrid: createStubAdapter("sendgrid", "SendGrid", ["SENDGRID_API_KEY"], env),
    meta_ads: createStubAdapter("meta_ads", "Meta Ads", [], env),
    google_ads: createStubAdapter("google_ads", "Google Ads", [], env),
    klaviyo: createStubAdapter("klaviyo", "Klaviyo", [], env),
    vercel: createStubAdapter("vercel", "Vercel", ["VERCEL_API_TOKEN"], env),
    netlify: createStubAdapter("netlify", "Netlify", ["NETLIFY_API_TOKEN"], env),
    cloudflare_pages: createStubAdapter("cloudflare_pages", "Cloudflare Pages", ["CLOUDFLARE_API_TOKEN"], env),
  };
}

/**
 * Never throws — a broken adapter shows up as an error health record for
 * that one provider, the other integrations keep working.
 */
export async function getAllIntegrationsHealth(env: ServerEnv): Promise<IntegrationHealth[]> {
  const registry = buildIntegrationRegistry(env);
  return Promise.all(
    Object.values(registry).map(async (adapter) => {
      try {
        return await adapter.checkHealth();
      } catch (err) {
        return {
          provider: adapter.provider,
          configured: adapter.isConfigured(),
          reachable: false as const,
          error: err instanceof Error ? err.message : "Unknown integration error",
        };
      }
    }),
  );
}
