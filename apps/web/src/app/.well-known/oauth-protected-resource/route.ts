import {
  MCP_SCOPES,
  mcpResourceUrl,
  supabaseOAuthIssuer,
} from "@/lib/mcp/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      resource: mcpResourceUrl(),
      authorization_servers: [supabaseOAuthIssuer()],
      ...(MCP_SCOPES.length ? { scopes_supported: [...MCP_SCOPES] } : {}),
      resource_documentation: "https://ihpmarketing.com",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
