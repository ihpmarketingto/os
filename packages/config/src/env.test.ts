import { beforeEach, describe, expect, it } from "vitest";
import { __resetEnvCacheForTests, getIntegrationStatus, loadServerEnv, loadPublicEnv } from "./env";

beforeEach(() => {
  __resetEnvCacheForTests();
});

const CORE_ENV = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  SECRETS_ENCRYPTION_KEY: "a".repeat(32),
};

describe("loadServerEnv", () => {
  it("throws when a core var is missing", () => {
    const { APP_URL, ...withoutAppUrl } = CORE_ENV;
    expect(() => loadServerEnv(withoutAppUrl)).toThrow();
  });

  it("succeeds with only core vars set, leaving optional integrations undefined", () => {
    const env = loadServerEnv(CORE_ENV);
    expect(env.SUPABASE_URL).toBe(CORE_ENV.SUPABASE_URL);
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.GITHUB_OAUTH_CLIENT_ID).toBeUndefined();
  });

  it("does not throw when an optional integration var is present but malformed — it's dropped instead", () => {
    const env = loadServerEnv({ ...CORE_ENV, SENTRY_DSN: "not-a-url" });
    expect(env.SENTRY_DSN).toBeUndefined();
  });
});

describe("getIntegrationStatus", () => {
  it("reports false for every integration when none are configured", () => {
    const env = loadServerEnv(CORE_ENV);
    const status = getIntegrationStatus(env);
    expect(status.openai).toBe(false);
    expect(status.github).toBe(false);
  });

  it("reports true only for integrations whose full var set is present", () => {
    const env = loadServerEnv({
      ...CORE_ENV,
      OPENAI_API_KEY: "sk-test",
      GITHUB_OAUTH_CLIENT_ID: "client-id",
      // missing GITHUB_OAUTH_CLIENT_SECRET on purpose
    });
    const status = getIntegrationStatus(env);
    expect(status.openai).toBe(true);
    expect(status.github).toBe(false);
  });
});

describe("loadPublicEnv", () => {
  it("only accepts NEXT_PUBLIC_* fields and rejects a missing one", () => {
    expect(() =>
      loadPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        // NEXT_PUBLIC_APP_URL missing
      }),
    ).toThrow();
  });
});
