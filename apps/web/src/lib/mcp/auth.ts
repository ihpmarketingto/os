import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "@ihp/database";
import { serverEnv } from "@/lib/env/server";

const INTERNAL_ROLES = new Set(["agency_owner", "account_manager", "specialist", "contractor"]);

/**
 * Canonical protected-resource identifier for the internal IHP ChatGPT bridge.
 * Keep this in sync with the Custom Access Token hook and plugin configuration.
 */
export const MCP_RESOURCE_URL = "https://os-ihp1.vercel.app/api/mcp";

/**
 * Supabase currently exposes standard identity scopes rather than custom IHP
 * business scopes. Fine-grained IHP authorization is enforced with the
 * existing role/permission/RLS system, not OAuth scope strings.
 */
export const MCP_SCOPES: readonly string[] = [];

export interface McpPrincipal {
  user: User;
  userId: string;
  organisationId: string;
  roleSlug: string;
  accessToken: string;
  supabase: SupabaseClient<Database>;
  /** Temporary escape hatch for bridge tables until generated DB types include them. */
  raw: SupabaseClient;
}

export function mcpResourceUrl(): string {
  return MCP_RESOURCE_URL;
}

export function protectedResourceMetadataUrl(): string {
  return "https://os-ihp1.vercel.app/.well-known/oauth-protected-resource";
}

export function supabaseOAuthIssuer(): string {
  return `${serverEnv.SUPABASE_URL.replace(/\/$/, "")}/auth/v1`;
}

export function bearerChallenge(
  error = "invalid_token",
  description = "Connect your IHP OS account to continue.",
): string {
  const scopePart = MCP_SCOPES.length ? `, scope="${MCP_SCOPES.join(" ")}"` : "";
  return `Bearer resource_metadata="${protectedResourceMetadataUrl()}"${scopePart}, error="${error}", error_description="${description.replace(/"/g, "'")}"`;
}

export function unauthorizedResponse(
  description = "Connect your IHP OS account to continue.",
): Response {
  return Response.json(
    { error: "unauthorized", error_description: description },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": bearerChallenge("invalid_token", description),
        "Cache-Control": "no-store",
      },
    },
  );
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

type JwtClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  role?: string;
  client_id?: string;
  ihp_mcp_resource?: string;
};

function decodeJwtClaims(token: string): JwtClaims | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as JwtClaims;
  } catch {
    return null;
  }
}

function audienceIncludes(aud: JwtClaims["aud"], expected: string): boolean {
  if (typeof aud === "string") return aud === expected;
  if (Array.isArray(aud)) return aud.includes(expected);
  return false;
}

/**
 * `supabase.auth.getUser(token)` performs server-side token validation against
 * this Supabase project's Auth service. After that succeeds, the decoded claims
 * below are trusted only to enforce additional MCP resource binding:
 * issuer, expiry/not-before, OAuth client presence, and exact audience.
 */
function verifyMcpResourceClaims(token: string): string | null {
  const claims = decodeJwtClaims(token);
  if (!claims) return "The access token could not be decoded.";

  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = supabaseOAuthIssuer();

  if (claims.iss !== expectedIssuer) {
    return "The access token was issued by an unexpected authorization server.";
  }

  if (typeof claims.exp !== "number" || claims.exp <= now) {
    return "The access token is expired.";
  }

  if (typeof claims.nbf === "number" && claims.nbf > now) {
    return "The access token is not valid yet.";
  }

  if (!claims.client_id) {
    return "The access token was not issued through the IHP OAuth connection.";
  }

  if (!audienceIncludes(claims.aud, MCP_RESOURCE_URL)) {
    return "The access token was not issued for the IHP ChatGPT bridge.";
  }

  if (claims.ihp_mcp_resource !== MCP_RESOURCE_URL) {
    return "The access token is missing the IHP MCP resource binding.";
  }

  if (claims.role !== "authenticated") {
    return "The access token does not carry the authenticated application role.";
  }

  return null;
}

export async function authenticateMcpRequest(
  request: Request,
): Promise<{ principal: McpPrincipal } | { response: Response }> {
  const token = extractBearerToken(request);
  if (!token) return { response: unauthorizedResponse() };

  const supabase = createClient<Database>(
    serverEnv.SUPABASE_URL,
    serverEnv.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { response: unauthorizedResponse("Your IHP OS session is invalid or expired.") };
  }

  const resourceError = verifyMcpResourceClaims(token);
  if (resourceError) {
    return { response: unauthorizedResponse(resourceError) };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("organisation_members")
    .select("organisation_id, roles(slug)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    console.error("[mcp] membership lookup failed", membershipError);
    return {
      response: Response.json(
        { error: "membership_lookup_failed" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const internal = (memberships ?? [])
    .map((membership) => ({
      organisationId: membership.organisation_id,
      roleSlug: (membership.roles as unknown as { slug: string } | null)?.slug ?? "",
    }))
    .filter((membership) => INTERNAL_ROLES.has(membership.roleSlug));

  if (internal.length === 0) {
    return {
      response: Response.json(
        { error: "forbidden", error_description: "The ChatGPT bridge is available to internal IHP team members only." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  if (internal.length > 1) {
    return {
      response: Response.json(
        {
          error: "ambiguous_organisation",
          error_description:
            "This IHP OS user belongs to more than one internal organisation. Organisation selection must be added before using the bridge.",
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  return {
    principal: {
      user,
      userId: user.id,
      organisationId: internal[0].organisationId,
      roleSlug: internal[0].roleSlug,
      accessToken: token,
      supabase,
      raw: supabase as unknown as SupabaseClient,
    },
  };
}
