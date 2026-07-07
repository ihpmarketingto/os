import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ConcludeExperimentDialog, NewExperimentDialog, StartExperimentButton } from "./experiment-dialogs";

export default async function WebsiteCroPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: experiments }, { data: clients }] = await Promise.all([
    supabase
      .from("experiments")
      .select("id, name, hypothesis, page_url, success_metric, status, result, decision, learnings, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Website and CRO</h1>
          <p className="text-sm text-muted-foreground">
            The experiment tracker: hypothesis in, decision and learnings out. Website audits live in Documents for now.
          </p>
        </div>
        <NewExperimentDialog clients={clients ?? []} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {!experiments || experiments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No experiments yet. Every test needs a hypothesis and a success metric before it runs.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Experiment</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {experiments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <p className="font-medium">{e.name}</p>
                      <p className="max-w-md text-xs text-muted-foreground">{e.hypothesis}</p>
                    </TableCell>
                    <TableCell>{(e.client as unknown as { name: string } | null)?.name}</TableCell>
                    <TableCell className="text-xs">{e.success_metric ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "running" ? "default" : "outline"} className="capitalize">
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{e.decision ?? "—"}</TableCell>
                    <TableCell>
                      {e.status === "planned" ? <StartExperimentButton experimentId={e.id} /> : null}
                      {e.status === "running" ? <ConcludeExperimentDialog experimentId={e.id} name={e.name} /> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
