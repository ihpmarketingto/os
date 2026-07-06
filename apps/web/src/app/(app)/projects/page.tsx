import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectStatusSelect } from "./status-select";

export default async function ProjectsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: projects }, { data: clients }, { data: templates }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, service_type, status, client:clients(name, slug), owner:profiles(full_name)")
      .eq("organisation_id", session.organisationId)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).order("name"),
    supabase.from("task_templates").select("id, name").is("organisation_id", null).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Projects</h1>
          <p className="text-sm text-muted-foreground">Every active and past delivery project across clients.</p>
        </div>
        <NewProjectDialog clients={clients ?? []} templates={templates ?? []} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {!projects || projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet. Create one directly or convert a closed-won deal from CRM.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => {
                  const client = p.client as unknown as { name: string; slug: string } | null;
                  const owner = p.owner as unknown as { full_name: string | null } | null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        {client ? (
                          <Link href={`/clients/${client.slug}`} className="hover:underline">
                            {client.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{p.service_type ?? "—"}</TableCell>
                      <TableCell>{owner?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <ProjectStatusSelect projectId={p.id} status={p.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
