import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { approveOAuthAuthorization, denyOAuthAuthorization } from "./actions";

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;
  if (!authorizationId) notFound();

  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // The proxy normally performs this redirect. Keep a fail-closed fallback
    // here so the authorization_id survives even if routing changes later.
    redirect(`/login?redirectTo=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
  }

  const { data: authDetails, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !authDetails) {
    return (
      <Card className="border-border bg-card/95 py-6 shadow-2xl shadow-black/25 backdrop-blur-sm">
        <CardHeader className="gap-3 px-6">
          <p className="brand-eyebrow">Secure connection</p>
          <CardTitle className="font-heading text-3xl font-bold tracking-[-0.04em]">Authorization request unavailable</CardTitle>
          <CardDescription className="leading-6">
            This request may have expired or already been completed. Return to ChatGPT and start the connection again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Supabase may return a redirect immediately when the user already granted
  // this client and the current request does not require another consent step.
  if (!("authorization_id" in authDetails)) {
    redirect(authDetails.redirect_url);
  }

  const scopes = authDetails.scope?.trim()
    ? authDetails.scope.trim().split(/\s+/)
    : [];

  return (
    <Card className="border-border bg-card/95 py-6 shadow-2xl shadow-black/25 backdrop-blur-sm">
      <CardHeader className="gap-3 px-6">
        <p className="brand-eyebrow">Secure connection</p>
        <CardTitle className="font-heading text-3xl font-bold tracking-[-0.04em]">
          Connect {authDetails.client.name}
        </CardTitle>
        <CardDescription className="leading-6">
          This gives the connected AI client access as your current IHP OS user. Existing organisation, client and role permissions still apply.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 px-6">
        <div className="rounded-md border bg-muted/50 p-4 text-sm">
          <p className="font-medium">What this connection can do</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Find clients you already have permission to access.</li>
            <li>Load approved Client Brain context.</li>
            <li>Capture evidence and explicit decisions.</li>
            <li>Create approval-gated learning proposals.</li>
            <li>Create internal tasks.</li>
          </ul>
        </div>

        <div className="space-y-1 text-sm">
          <p><span className="font-medium">Client:</span> {authDetails.client.name}</p>
          <p className="break-all text-muted-foreground">
            <span className="font-medium text-foreground">Redirect:</span> {authDetails.redirect_uri}
          </p>
        </div>

        {scopes.length > 0 ? (
          <div>
            <p className="brand-eyebrow text-[10px]">
              Requested identity scopes
            </p>
            <p className="mt-1 text-sm">{scopes.join(", ")}</p>
          </div>
        ) : null}

        <p className="text-xs leading-5 text-muted-foreground">
          This v1 bridge cannot send client messages, publish content, change ad budgets, sign contracts, move money or deploy production work.
        </p>

        <div className="flex gap-2">
          <form action={approveOAuthAuthorization}>
            <input type="hidden" name="authorization_id" value={authorizationId} />
            <Button type="submit">Allow connection</Button>
          </form>

          <form action={denyOAuthAuthorization}>
            <input type="hidden" name="authorization_id" value={authorizationId} />
            <Button type="submit" variant="outline">Deny</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
