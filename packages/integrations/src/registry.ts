import type { ServerEnv } from "@ihp/config";
import { createGithubAdapter } from "./adapters/github";
import { createGoogleWorkspaceAdapter } from "./adapters/google-workspace";
import { createStubAdapter } from "./adapters/stub";
import type { IntegrationAdapter, IntegrationHealth, IntegrationProviderSlug } from "./types";

export function buildIntegrationRegistry(env: ServerEnv): Record<IntegrationProviderSlug, IntegrationAdapter> {
  return {
    // Native (working OAuth flows today)
    github: createGithubAdapter(env),
    google_workspace: createGoogleWorkspaceAdapter(env),

    // Planned native — activate in later phases once credentials exist
    stripe: createStubAdapter("stripe", "Stripe", ["STRIPE_SECRET_KEY"], env, {
      requiredCredentials: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    }),
    resend: createStubAdapter("resend", "Resend", ["RESEND_API_KEY"], env),
    sendgrid: createStubAdapter("sendgrid", "SendGrid", ["SENDGRID_API_KEY"], env),
    meta_ads: createStubAdapter("meta_ads", "Meta Ads", [], env, {
      requiredCredentials: ["Meta system-user access token", "Ad account ID"],
    }),
    google_ads: createStubAdapter("google_ads", "Google Ads", [], env, {
      requiredCredentials: ["Google Ads developer token", "OAuth client", "Customer ID"],
    }),
    klaviyo: createStubAdapter("klaviyo", "Klaviyo", [], env, {
      requiredCredentials: ["Klaviyo private API key"],
    }),
    vercel: createStubAdapter("vercel", "Vercel", ["VERCEL_API_TOKEN"], env),
    netlify: createStubAdapter("netlify", "Netlify", ["NETLIFY_API_TOKEN"], env),
    cloudflare_pages: createStubAdapter("cloudflare_pages", "Cloudflare Pages", ["CLOUDFLARE_API_TOKEN"], env),

    // Section 27A lead-acquisition stack
    gohighlevel: createStubAdapter("gohighlevel", "GoHighLevel", [], env, {
      requiredCredentials: ["GoHighLevel agency API key or OAuth app", "Location ID per client"],
    }),
    meta_pixel: createStubAdapter("meta_pixel", "Meta Pixel", [], env, {
      kind: "webhook",
      requiredCredentials: ["Pixel ID per client (client-side snippet, no secret)"],
    }),
    meta_conversions_api: createStubAdapter("meta_conversions_api", "Meta Conversions API", [], env, {
      requiredCredentials: ["Pixel ID", "Conversions API access token per client"],
    }),
    ga4: createStubAdapter("ga4", "Google Analytics 4", [], env, {
      requiredCredentials: ["GA4 property ID", "Measurement ID", "Data API service account (reporting)"],
    }),
    gtm: createStubAdapter("gtm", "Google Tag Manager", [], env, {
      requiredCredentials: ["GTM container ID per client"],
    }),
    calendly: createStubAdapter("calendly", "Calendly", [], env, {
      kind: "webhook",
      requiredCredentials: ["Calendly personal access token or OAuth app", "Webhook signing key"],
    }),
    square: createStubAdapter("square", "Square", [], env, {
      requiredCredentials: ["Square access token", "Location ID"],
    }),
    twilio: createStubAdapter("twilio", "Twilio SMS", [], env, {
      requiredCredentials: ["Twilio account SID", "Auth token", "Messaging service SID", "Registered sender number"],
    }),
    discord: createStubAdapter("discord", "Discord", [], env, {
      kind: "webhook",
      requiredCredentials: ["Discord webhook URL per channel"],
    }),
    zapier: createStubAdapter("zapier", "Zapier", [], env, {
      kind: "webhook",
      requiredCredentials: ["Inbound webhook URLs (created in Zapier)"],
    }),
    n8n: createStubAdapter("n8n", "n8n", [], env, {
      kind: "webhook",
      requiredCredentials: ["n8n webhook URLs", "Optional API key for n8n instance"],
    }),
    quickbooks: createStubAdapter("quickbooks", "QuickBooks", [], env, {
      requiredCredentials: ["QuickBooks OAuth app", "Exact accounting requirements from the accountant"],
    }),
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
