import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { createIhpMcpServer } from "@/lib/mcp/bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  const authentication = await authenticateMcpRequest(request);
  if ("response" in authentication) return authentication.response;

  const server = createIhpMcpServer(authentication.principal);

  // Fresh stateless transport for every request. This is compatible with
  // serverless hosts such as Vercel and avoids retaining MCP session state
  // between invocations.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } finally {
    await transport.close().catch(() => undefined);
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
