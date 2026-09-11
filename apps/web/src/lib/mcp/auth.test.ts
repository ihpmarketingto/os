import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@ihp/database/client-server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@ihp/config", () => ({
  loadServerEnv: () => ({
    APP_URL: "http://localhost:3000",
    SUPABASE_URL: "https://test-project.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    SECRETS_ENCRYPTION_KEY: "test-encryption-key",
  }),
}));

type MembershipResult = {
  data: Array<{
    organisation_id: string;
    roles: { slug: string };
  }>;
  error: null;
};

class MembershipQuery implements PromiseLike<MembershipResult> {
  constructor(private readonly result: MembershipResult) {}

  select() {
    return this;
  }

  eq() {
    return this;
  }

  then<TResult1 = MembershipResult, TResult2 = never>(
    onfulfilled?: ((value: MembershipResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function accessToken(overrides: Record<string, unknown> = {}): string {
  const payload = {
    iss: "https://test-project.supabase.co/auth/v1",
    aud: "https://os-ihp1.vercel.app/api/mcp",
    exp: Math.floor(Date.now() / 1000) + 3_600,
    role: "authenticated",
    client_id: "chatgpt-test-client",
    ihp_mcp_resource: "https://os-ihp1.vercel.app/api/mcp",
    ...overrides,
  };

  return [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "test-signature",
  ].join(".");
}

let authenticateMcpRequest: typeof import("./auth").authenticateMcpRequest;
let mcpPost: typeof import("@/app/api/mcp/route").POST;
let metadataGet: typeof import("@/app/.well-known/oauth-protected-resource/route").GET;
let proxy: typeof import("@/proxy").proxy;

beforeAll(async () => {
  ({ authenticateMcpRequest } = await import("./auth"));
  ({ POST: mcpPost } = await import("@/app/api/mcp/route"));
  ({ GET: metadataGet } = await import("@/app/.well-known/oauth-protected-resource/route"));
  ({ proxy } = await import("@/proxy"));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MCP authentication and discovery", () => {
  it("returns a bearer challenge for an unauthenticated MCP request", async () => {
    const response = await mcpPost(
      new Request("https://os-ihp1.vercel.app/api/mcp", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://os-ihp1.vercel.app/.well-known/oauth-protected-resource"',
    );
  });

  it("publishes the exact MCP resource and Supabase issuer", async () => {
    const response = await metadataGet();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      resource: "https://os-ihp1.vercel.app/api/mcp",
      authorization_servers: ["https://test-project.supabase.co/auth/v1"],
    });
  });

  it("rejects client portal roles even when Supabase validates the token", async () => {
    const token = accessToken();
    const membershipQuery = new MembershipQuery({
      data: [
        {
          organisation_id: "00000000-0000-4000-8000-000000000001",
          roles: { slug: "client_admin" },
        },
      ],
      error: null,
    });

    mocks.createClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(membershipQuery),
    });

    const result = await authenticateMcpRequest(
      new Request("https://os-ihp1.vercel.app/api/mcp", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    expect("response" in result).toBe(true);
    if (!("response" in result)) throw new Error("Expected a forbidden response.");
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toMatchObject({ error: "forbidden" });
  });

  it("preserves the OAuth query string through the login redirect", async () => {
    mocks.createSupabaseServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const response = await proxy(
      new NextRequest(
        "https://os-ihp1.vercel.app/oauth/consent?authorization_id=auth-request-123",
      ),
    );
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).not.toBeNull();
    expect(new URL(location ?? "https://invalid.example").searchParams.get("redirectTo")).toBe(
      "/oauth/consent?authorization_id=auth-request-123",
    );
  });
});
