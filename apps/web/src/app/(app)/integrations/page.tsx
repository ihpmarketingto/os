import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildIntegrationRegistry, getAllIntegrationsHealth } from "@ihp/integrations";
import { serverEnv } from "@/lib/env/server";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const OAUTH_PROVIDERS = new Set(["github", "google_workspace"]);

const KIND_LABEL: Record<string, string> = {
  native: "Native API",
  webhook: "Webhook-based",
  csv: "CSV import/export",
  planned: "Planned",
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { connected, error } = await searchParams;
  const supabase = await getSupabaseServerClient();

  const registry = buildIntegrationRegistry(serverEnv);
  const [health, { data: connections }] = await Promise.all([
    getAllIntegrationsHealth(serverEnv),
    supabase
      .from("integration_connections")
      .select("provider, status, scopes, last_synced_at")
      .eq("organisation_id", session.organisationId),
  ]);

  const connectionByProvider = new Map((connections ?? []).map((c) => [c.provider, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          OAuth tokens are encrypted before storage and never exposed to the browser. Read-only, least-privilege
          scopes are requested by default. Badges show whether each integration is native, webhook-based, CSV-based
          or planned.
        </p>
      </div>

      {connected ? (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-center gap-2 py-4 text-sm">
            <CheckCircle2 className="size-4 text-success" /> Connected {connected.replace(/_/g, " ")} successfully.
          </CardContent>
        </Card>
      ) : null}
      {error ? (
        <Card className="border-risk/40 bg-risk/5">
          <CardContent className="flex items-center gap-2 py-4 text-sm">
            <AlertTriangle className="size-4 text-risk" /> Connection failed ({error}). Check server logs and try again.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {health.map((h) => {
          const adapter = registry[h.provider];
          const connection = connectionByProvider.get(h.provider);
          const isConnected = connection?.status === "connected";
          const canOauth = OAUTH_PROVIDERS.has(h.provider);

          return (
            <Card key={h.provider}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {adapter.displayName}
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {KIND_LABEL[adapter.kind]}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {isConnected
                      ? `Connected · scopes: ${connection?.scopes?.join(", ") || "none"}`
                      : h.configured
                        ? "Configured, not yet connected"
                        : adapter.requiredCredentials.length > 0
                          ? `Needs: ${adapter.requiredCredentials.join(", ")}`
                          : "Awaiting credentials"}
                  </CardDescription>
                </div>
                {isConnected ? (
                  <Badge className="bg-success text-white">Connected</Badge>
                ) : h.configured ? (
                  <Badge variant="secondary">Configured</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Not connected</Badge>
                )}
              </CardHeader>
              <CardContent>
                {canOauth ? (
                  h.configured && !isConnected ? (
                    <Button
                      size="sm"
                      nativeButton={false}
                      render={<a href={`/api/integrations/${h.provider}/authorize`}>Connect</a>}
                    />
                  ) : (
                    <Button size="sm" disabled>
                      {isConnected ? "Connected" : "Set OAuth env vars to enable"}
                    </Button>
                  )
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    {adapter.kind === "planned" ? "Adapter not yet implemented" : "Supply credentials to activate"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
