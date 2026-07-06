import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDashed, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import { getAllIntegrationsHealth } from "@ihp/integrations";
import { getIntegrationStatus, INTEGRATION_ENV_KEYS } from "@ihp/config";

const QUICK_ACTIONS = [
  { label: "Add lead", href: "/crm" },
  { label: "Create proposal", href: "/crm" },
  { label: "Add client", href: "/clients" },
  { label: "Start onboarding", href: "/projects" },
  { label: "Create campaign", href: "/campaigns" },
  { label: "Create project", href: "/projects" },
  { label: "Add task", href: "/tasks" },
  { label: "Create content brief", href: "/content-studio" },
];

export default async function HomePage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: recentAudit }, { data: flags }, integrationHealth] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, action, resource, resource_id, created_at, actor_type")
      .eq("organisation_id", session.organisationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("feature_flags").select("key, is_enabled, organisation_id, rollout").order("key"),
    getAllIntegrationsHealth(serverEnv),
  ]);

  const aiProviderStatus = getIntegrationStatus(serverEnv);
  const aiProviders = Object.keys(INTEGRATION_ENV_KEYS).filter((k) => ["openai", "gemini", "anthropic"].includes(k));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back{session.fullName ? `, ${session.fullName.split(" ")[0]}` : ""}</p>
          <h1 className="font-heading text-3xl">{session.organisationName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.slice(0, 4).map((action) => (
            <Button
              key={action.href + action.label}
              variant="outline"
              size="sm"
              render={
                <Link href={action.href}>
                  <Plus className="mr-1 size-3.5" />
                  {action.label}
                </Link>
              }
            />
          ))}
        </div>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Phase 0 foundation is live</CardTitle>
          <CardDescription>
            Revenue, pipeline, client health and delivery widgets activate as CRM (Phase 1), Finance (Phase 2) and
            Marketing Delivery (Phase 3) ship. This Home view surfaces what exists today: your audit trail,
            feature flags and integration health.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integration health</CardTitle>
            <CardDescription>Non-AI integrations, checked live just now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {integrationHealth.map((health) => (
              <div key={health.provider} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="capitalize">{health.provider.replace(/_/g, " ")}</span>
                <StatusBadge configured={health.configured} reachable={health.reachable} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI provider router</CardTitle>
            <CardDescription>Configured via environment variables. No AI runs happen until Phase 5 ships.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {aiProviders.map((provider) => (
              <div key={provider} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="capitalize">{provider}</span>
                {aiProviderStatus[provider as keyof typeof aiProviderStatus] ? (
                  <Badge className="bg-success text-white">Configured</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Live from the audit trail (audit_logs).</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAudit && recentAudit.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {recentAudit.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <span>
                      <span className="font-medium capitalize">{entry.action}</span> on {entry.resource}
                      {entry.resource_id ? ` (${entry.resource_id.slice(0, 8)})` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRow message="No activity recorded yet. Every create, update, delete, export and AI action will show up here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature flags</CardTitle>
            <CardDescription>Turn a phase on for this organisation once it&rsquo;s ready to use.</CardDescription>
          </CardHeader>
          <CardContent>
            {flags && flags.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {flags.map((flag) => (
                  <li key={flag.key} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <span>{flag.key}</span>
                    {flag.is_enabled ? (
                      <Badge className="bg-success text-white">
                        <CheckCircle2 className="mr-1 size-3" /> On
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <CircleDashed className="mr-1 size-3" /> Off
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRow message="No feature flags found. Run the seed script to load Phase 0 defaults." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatusBadge({ configured, reachable }: { configured: boolean; reachable: boolean | "unknown" }) {
  if (!configured) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not connected
      </Badge>
    );
  }
  if (reachable === true) {
    return (
      <Badge className="bg-success text-white">
        <CheckCircle2 className="mr-1 size-3" /> Reachable
      </Badge>
    );
  }
  if (reachable === false) {
    return (
      <Badge className="bg-risk text-white">
        <AlertTriangle className="mr-1 size-3" /> Error
      </Badge>
    );
  }
  return <Badge variant="secondary">Connected</Badge>;
}

function EmptyRow({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}
