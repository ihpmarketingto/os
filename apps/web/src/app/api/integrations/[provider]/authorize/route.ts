import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildGithubAuthorizeUrl } from "@ihp/integrations";
import { buildGoogleAuthorizeUrl } from "@ihp/integrations";
import { serverEnv } from "@/lib/env/server";
import { requireSession } from "@/lib/auth/session";

const SUPPORTED = ["github", "google_workspace"] as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  await requireSession(); // redirects to /login if not authenticated

  if (!SUPPORTED.includes(provider as (typeof SUPPORTED)[number])) {
    return NextResponse.json({ error: `Unknown integration provider "${provider}"` }, { status: 404 });
  }

  const state = randomUUID();
  const redirectUri = `${serverEnv.APP_URL}/api/integrations/${provider}/callback`;

  const authorizeUrl =
    provider === "github"
      ? buildGithubAuthorizeUrl(serverEnv, redirectUri, state)
      : buildGoogleAuthorizeUrl(serverEnv, redirectUri, state, ["driveReadOnly", "calendarReadOnly"]);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(`ihp_oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
