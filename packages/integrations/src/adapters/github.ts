import type { ServerEnv } from "@ihp/config";
import type { IntegrationAdapter, IntegrationHealth } from "../types";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_BASE = "https://api.github.com";

/**
 * Read-only repo/branch/folder access for Landing Page Factory ingestion.
 * Scopes are deliberately narrow — `repo:status` + `public_repo` for public
 * work, with the caller upgrading to full `repo` only when a private
 * repository is explicitly selected by the user.
 */
export function createGithubAdapter(env: ServerEnv): IntegrationAdapter {
  return {
    provider: "github",
    displayName: "GitHub",
    kind: "native",
    requiredScopes: ["repo:status", "public_repo"],
    requiredCredentials: ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET"],
    isConfigured(): boolean {
      return Boolean(env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET);
    },
    async checkHealth(): Promise<IntegrationHealth> {
      if (!this.isConfigured()) {
        return { provider: "github", configured: false, reachable: "unknown" };
      }
      try {
        const res = await fetch(`${GITHUB_API_BASE}/zen`);
        return { provider: "github", configured: true, reachable: res.ok };
      } catch (err) {
        return {
          provider: "github",
          configured: true,
          reachable: false,
          error: err instanceof Error ? err.message : "Unknown error contacting GitHub",
        };
      }
    },
  };
}

export function buildGithubAuthorizeUrl(env: ServerEnv, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_OAUTH_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    scope: "repo:status public_repo",
    state,
  });
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeGithubCode(env: ServerEnv, code: string, redirectUri: string): Promise<{ accessToken: string; scopes: string[] }> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string; scope?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`GitHub token exchange failed: ${data.error ?? "no access_token in response"}`);
  }

  return { accessToken: data.access_token, scopes: data.scope ? data.scope.split(",") : [] };
}
