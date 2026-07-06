import { NextResponse, type NextRequest } from "next/server";
import { exchangeGithubCode, exchangeGoogleCode } from "@ihp/integrations";
import { encryptSecret, writeAuditLog } from "@ihp/database";
import { serverEnv } from "@/lib/env/server";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const SUPPORTED = ["github", "google_workspace"] as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const session = await requireSession();

  if (!SUPPORTED.includes(provider as (typeof SUPPORTED)[number])) {
    return NextResponse.json({ error: `Unknown integration provider "${provider}"` }, { status: 404 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get(`ihp_oauth_state_${provider}`)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", serverEnv.APP_URL));
  }

  const redirectUri = `${serverEnv.APP_URL}/api/integrations/${provider}/callback`;
  const supabase = await getSupabaseServerClient();

  try {
    const scopes: string[] = [];
    let accessToken = "";

    if (provider === "github") {
      const result = await exchangeGithubCode(serverEnv, code, redirectUri);
      accessToken = result.accessToken;
      scopes.push(...result.scopes);
    } else {
      const result = await exchangeGoogleCode(serverEnv, code, redirectUri);
      accessToken = result.accessToken;
      scopes.push(...result.scopes);
    }

    const encrypted = encryptSecret(accessToken, serverEnv.SECRETS_ENCRYPTION_KEY);

    await supabase.from("secrets_metadata").upsert(
      {
        organisation_id: session.organisationId,
        provider,
        key_alias: "oauth_access_token",
        encrypted_value: encrypted,
        created_by: session.userId,
        last_rotated_at: new Date().toISOString(),
      },
      { onConflict: "organisation_id,provider,key_alias" },
    );

    await supabase.from("integration_connections").upsert(
      {
        organisation_id: session.organisationId,
        provider,
        connected_by_user_id: session.userId,
        status: "connected",
        scopes,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: "organisation_id,provider" },
    );

    await writeAuditLog(supabase, {
      organisationId: session.organisationId,
      actorUserId: session.userId,
      action: "external_action",
      resource: "integration_connections",
      resourceId: provider,
      metadata: { provider, scopes },
    });

    const response = NextResponse.redirect(new URL("/integrations?connected=" + provider, serverEnv.APP_URL));
    response.cookies.delete(`ihp_oauth_state_${provider}`);
    return response;
  } catch (err) {
    console.error(`[integrations] ${provider} OAuth callback failed`, err);
    return NextResponse.redirect(new URL("/integrations?error=exchange_failed", serverEnv.APP_URL));
  }
}
