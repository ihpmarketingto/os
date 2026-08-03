import { z } from "zod";

/**
 * Core env vars are required for IHP OS to boot at all.
 * Everything else is optional so a single unconfigured integration
 * (AI provider, Google Workspace, Stripe, etc.) never takes the app down —
 * it just shows as "not connected" in Settings > Integrations.
 */
const coreServerSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Symmetric key used to encrypt OAuth tokens / integration secrets at rest. 32-byte base64. */
  SECRETS_ENCRYPTION_KEY: z.string().min(32),
});

const optionalIntegrationSchema = z.object({
  // AI providers — IHP Intelligence router
  OPENAI_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // Google Workspace OAuth
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),

  // GitHub OAuth (Landing Page Factory ingestion)
  GITHUB_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_APP_ID: z.string().min(1).optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1).optional(),

  // Stripe — invoices, retainers, payment status
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Email delivery
  RESEND_API_KEY: z.string().min(1).optional(),
  SENDGRID_API_KEY: z.string().min(1).optional(),

  // Deployment targets
  VERCEL_API_TOKEN: z.string().min(1).optional(),
  NETLIFY_API_TOKEN: z.string().min(1).optional(),
  CLOUDFLARE_API_TOKEN: z.string().min(1).optional(),

  // Error monitoring
  SENTRY_DSN: z.string().url().optional(),

  /**
   * Shared secret the scheduled sweep endpoint requires. Optional so the app
   * still boots without it, but the endpoint refuses to run when it is
   * missing rather than defaulting to open: an unauthenticated route that
   * mutates every organisation is not something to fail open on.
   */
  CRON_SECRET: z.string().min(16).optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export const serverEnvSchema = coreServerSchema.merge(optionalIntegrationSchema);
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

export const INTEGRATION_ENV_KEYS = {
  openai: ["OPENAI_API_KEY"],
  gemini: ["GEMINI_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"],
  googleWorkspace: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
  github: ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET"],
  stripe: ["STRIPE_SECRET_KEY"],
  resend: ["RESEND_API_KEY"],
  sendgrid: ["SENDGRID_API_KEY"],
} as const satisfies Record<string, readonly (keyof ServerEnv)[]>;

export type IntegrationKey = keyof typeof INTEGRATION_ENV_KEYS;

let cachedServerEnv: ServerEnv | null = null;
let cachedPublicEnv: PublicEnv | null = null;

/**
 * Throws only when a CORE var is missing/invalid. Optional integration vars
 * that fail validation are dropped with a warning rather than crashing boot,
 * so one bad key never takes down the whole app.
 */
export function loadServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  // On Vercel, fall back to the deployment's own URL when APP_URL is not set
  // explicitly. This keeps preview deployments self-consistent (OAuth
  // redirects and magic links point at the deployment being tested) instead
  // of failing validation or redirecting to production.
  const withVercelFallback = { ...source };
  if (!withVercelFallback.APP_URL) {
    const vercelHost = source.VERCEL_PROJECT_PRODUCTION_URL ?? source.VERCEL_URL;
    if (vercelHost) withVercelFallback.APP_URL = `https://${vercelHost}`;
  }

  const core = coreServerSchema.parse(withVercelFallback);
  const optionalResult = optionalIntegrationSchema.safeParse(source);
  const optional = optionalResult.success ? optionalResult.data : {};

  if (!optionalResult.success) {
    for (const issue of optionalResult.error.issues) {
      console.warn(`[env] integration var ${issue.path.join(".")} invalid, treating as unconfigured: ${issue.message}`);
    }
  }

  cachedServerEnv = { ...core, ...optional } as ServerEnv;
  return cachedServerEnv;
}

export function loadPublicEnv(source: Record<string, string | undefined> = process.env): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;
  cachedPublicEnv = publicSchema.parse(source);
  return cachedPublicEnv;
}

export function getIntegrationStatus(env: ServerEnv): Record<IntegrationKey, boolean> {
  const status = {} as Record<IntegrationKey, boolean>;
  for (const [key, envKeys] of Object.entries(INTEGRATION_ENV_KEYS)) {
    status[key as IntegrationKey] = envKeys.every((k) => Boolean(env[k]));
  }
  return status;
}

/** Test-only: clears memoized env so tests can exercise different inputs. */
export function __resetEnvCacheForTests(): void {
  cachedServerEnv = null;
  cachedPublicEnv = null;
}
