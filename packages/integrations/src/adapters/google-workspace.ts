import type { ServerEnv } from "@ihp/config";
import type { IntegrationAdapter, IntegrationHealth } from "../types";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Narrowest-scope-first, per spec section 24: request only the Workspace
 * scope a specific workflow needs, not a bundle of everything up front.
 */
export const GOOGLE_WORKSPACE_SCOPES = {
  gmailReadOnly: "https://www.googleapis.com/auth/gmail.readonly",
  gmailCompose: "https://www.googleapis.com/auth/gmail.compose",
  calendarReadOnly: "https://www.googleapis.com/auth/calendar.readonly",
  calendarEvents: "https://www.googleapis.com/auth/calendar.events",
  driveReadOnly: "https://www.googleapis.com/auth/drive.readonly",
  docs: "https://www.googleapis.com/auth/documents",
  sheets: "https://www.googleapis.com/auth/spreadsheets",
} as const;

export type GoogleWorkspaceScopeKey = keyof typeof GOOGLE_WORKSPACE_SCOPES;

export function createGoogleWorkspaceAdapter(env: ServerEnv): IntegrationAdapter {
  return {
    provider: "google_workspace",
    displayName: "Google Workspace",
    requiredScopes: [],
    isConfigured(): boolean {
      return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
    },
    async checkHealth(): Promise<IntegrationHealth> {
      if (!this.isConfigured()) {
        return { provider: "google_workspace", configured: false, reachable: "unknown" };
      }
      try {
        const res = await fetch("https://oauth2.googleapis.com/tokeninfo");
        // Any HTTP response (even 400 for a missing token param) confirms reachability.
        return { provider: "google_workspace", configured: true, reachable: res.status < 500 };
      } catch (err) {
        return {
          provider: "google_workspace",
          configured: true,
          reachable: false,
          error: err instanceof Error ? err.message : "Unknown error contacting Google",
        };
      }
    },
  };
}

export function buildGoogleAuthorizeUrl(
  env: ServerEnv,
  redirectUri: string,
  state: string,
  scopeKeys: GoogleWorkspaceScopeKey[],
): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: scopeKeys.map((k) => GOOGLE_WORKSPACE_SCOPES[k]).join(" "),
    state,
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(
  env: ServerEnv,
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number; scopes: string[] }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scopes: data.scope.split(" "),
  };
}
