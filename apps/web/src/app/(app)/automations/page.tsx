import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasPermission } from "@ihp/database";
import { RuleToggle, RunSweepButton } from "./automation-controls";

export default async function AutomationsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const canEdit = await hasPermission(supabase, session.organisationId, "team_settings", "update");

  const [{ data: rules }, { data: recentRuns }] = await Promise.all([
    supabase
      .from("automation_rules")
      .select("rule_key, name, description, trigger_type, is_enabled, last_run_at")
      .eq("organisation_id", session.organisationId)
      .order("trigger_type")
      .order("rule_key"),
    supabase
      .from("automation_runs")
      .select("rule_key, summary, status, created_at")
      .eq("organisation_id", session.organisationId)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">Automations</h1>
          <p className="text-sm text-muted-foreground">
            Event rules fire the moment things happen; sweep rules run on demand (scheduled runs arrive with a
            cron caller). Automations create tasks and notifications only. They never send, publish or spend.
          </p>
        </div>
        {canEdit ? <RunSweepButton /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rules</CardTitle>
          <CardDescription>Each rule acts at most once per subject; re-running is always safe.</CardDescription>
        </CardHeader>
        <CardContent>
          {!rules || rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules installed. Run the seed script to load defaults.</p>
          ) : (
            <ul className="divide-y">
              {rules.map((rule) => (
                <li key={rule.rule_key} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {rule.name}{" "}
                      <Badge variant="outline" className="ml-1 text-[10px] capitalize">
                        {rule.trigger_type}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                    {rule.last_run_at ? (
                      <p className="text-xs text-muted-foreground">Last swept {new Date(rule.last_run_at).toLocaleString()}</p>
                    ) : null}
                  </div>
                  <RuleToggle ruleKey={rule.rule_key} enabled={rule.is_enabled} canEdit={canEdit} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent automation activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentRuns || recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No automation runs yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {recentRuns.map((run, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span>
                    <span className="font-medium">{run.rule_key.replace(/_/g, " ")}</span>
                    {run.summary ? <span className="text-muted-foreground">: {run.summary}</span> : null}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
