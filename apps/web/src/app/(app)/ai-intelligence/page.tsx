import { hasPermission } from "@ihp/database";
import { configuredProviders } from "@ihp/ai-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import { DraftForm } from "./draft-form";
import { getTaskTypes } from "./actions";

export default async function AiIntelligencePage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const canUse = await hasPermission(supabase, session.organisationId, "ai_settings", "ai_retrieve");
  if (!canUse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">AI Intelligence</CardTitle>
          <CardDescription>Your role does not include AI workspace access.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const providers = configuredProviders(serverEnv);
  const taskTypes = await getTaskTypes();

  const [{ data: clients }, { data: recentRuns }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, ai_enabled")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("ai_runs")
      .select("id, task_type, model_name, status, estimated_cost, created_at, client:clients(name), user:profiles(full_name)")
      .eq("organisation_id", session.organisationId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">AI Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Draft mode only. Every run is logged with its sources, provider, model and estimated cost.
          </p>
        </div>
        <div className="flex gap-2">
          {(["openai", "gemini", "anthropic"] as const).map((p) => (
            <Badge key={p} variant={providers.includes(p) ? "default" : "outline"} className="capitalize">
              {p}
              {providers.includes(p) ? "" : ": no key"}
            </Badge>
          ))}
        </div>
      </div>

      {providers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-sm text-muted-foreground">
            No AI provider is configured. Add OPENAI_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY to activate the
            workspace.
          </CardContent>
        </Card>
      ) : (
        <DraftForm clients={(clients ?? []).map((c) => ({ id: c.id, name: c.name, aiEnabled: c.ai_enabled }))} taskTypes={taskTypes} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent runs</CardTitle>
          <CardDescription>The audit trail keeps every prompt, output, source and cost.</CardDescription>
        </CardHeader>
        <CardContent>
          {!recentRuns || recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI runs yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {recentRuns.map((run) => (
                <li key={run.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium capitalize">{run.task_type.replace(/_/g, " ")}</span>
                    {" for "}
                    {(run.client as unknown as { name: string } | null)?.name ?? "no client"}
                    {" by "}
                    {(run.user as unknown as { full_name: string | null } | null)?.full_name ?? "unknown"}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={run.status === "success" ? "default" : "outline"} className="capitalize">
                      {run.status}
                    </Badge>
                    {run.model_name}
                    {run.estimated_cost !== null ? ` · US$${Number(run.estimated_cost).toFixed(4)}` : ""}
                    {" · "}
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
