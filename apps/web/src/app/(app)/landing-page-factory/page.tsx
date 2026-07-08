import { canPublishLandingPage, type QaResult } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  AddBuildProjectDialog,
  ApproveBriefButton,
  NewBriefDialog,
  NewPageProjectDialog,
  PageStatusActions,
  PublishDialog,
  QaRunDialog,
  ReuseStatusButtons,
} from "./factory-dialogs";

export default async function LandingPageFactoryPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: buildProjects }, { data: briefs }, { data: pages }, { data: qaRuns }, { data: approvals }, { data: clients }] =
    await Promise.all([
      supabase
        .from("build_library_projects")
        .select("id, project_name, source_provider, page_type, industry, status, reuse_permitted, repository_url, deployment_url, client:clients(name)")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("landing_page_briefs")
        .select("id, title, offer, main_cta, status, launch_date, client:clients(name)")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("landing_page_projects")
        .select("id, name, generation_mode, status, preview_url, production_url, client:clients(name)")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("qa_runs")
        .select("landing_page_project_id, overall, created_at")
        .eq("organisation_id", session.organisationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("approvals")
        .select("subject_id, status")
        .eq("organisation_id", session.organisationId)
        .eq("subject_type", "landing_page")
        .eq("status", "approved"),
      supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
    ]);

  const latestQaByProject = new Map<string, QaResult>();
  for (const run of qaRuns ?? []) {
    if (!latestQaByProject.has(run.landing_page_project_id)) {
      latestQaByProject.set(run.landing_page_project_id, run.overall);
    }
  }
  const approvedPageIds = new Set((approvals ?? []).map((a) => a.subject_id));

  const approvedBriefs = (briefs ?? []).filter((b) => b.status === "approved");
  const reusableReferences = (buildProjects ?? []).filter((p) => p.reuse_permitted);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">Landing Page Factory</h1>
          <p className="text-sm text-muted-foreground">
            Governed reference material in, approved brief, QA and client sign-off before anything ships. Generated
            code lives in dedicated repositories, never in IHP OS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddBuildProjectDialog clients={clients ?? []} />
          <NewBriefDialog clients={clients ?? []} />
          <NewPageProjectDialog
            briefs={approvedBriefs.map((b) => ({ id: b.id, name: b.title }))}
            references={reusableReferences.map((r) => ({ id: r.id, name: r.project_name }))}
          />
        </div>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Page projects ({(pages ?? []).length})</TabsTrigger>
          <TabsTrigger value="briefs">Briefs ({(briefs ?? []).length})</TabsTrigger>
          <TabsTrigger value="library">Build Library ({(buildProjects ?? []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="pt-4">
          {!pages || pages.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No page projects yet. Approve a brief, then start a page project from it.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>QA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((p) => {
                  const latestQa = latestQaByProject.get(p.id) ?? null;
                  const gate = canPublishLandingPage({
                    projectStatus: p.status,
                    latestQaOverall: latestQa,
                    clientApproved: approvedPageIds.has(p.id),
                  });
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                        {p.preview_url ? (
                          <a href={p.preview_url} className="text-xs text-brand hover:underline" target="_blank" rel="noreferrer">
                            Preview
                          </a>
                        ) : null}
                        {p.production_url ? (
                          <a href={p.production_url} className="ml-2 text-xs text-success hover:underline" target="_blank" rel="noreferrer">
                            Live
                          </a>
                        ) : null}
                      </TableCell>
                      <TableCell>{(p.client as unknown as { name: string } | null)?.name}</TableCell>
                      <TableCell className="text-xs capitalize">{p.generation_mode.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        {latestQa ? (
                          <Badge
                            variant={latestQa === "pass" ? "default" : latestQa === "warning" ? "secondary" : "destructive"}
                            className="capitalize"
                          >
                            {latestQa}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No QA</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{p.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="space-y-1.5">
                        <PageStatusActions projectId={p.id} status={p.status} />
                        {["preview", "qa", "internal_approval"].includes(p.status) ? (
                          <QaRunDialog projectId={p.id} projectName={p.name} />
                        ) : null}
                        {p.status === "approved_to_publish" ? (
                          <PublishDialog projectId={p.id} projectName={p.name} blocked={!gate.allowed} reasons={gate.reasons} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="briefs" className="pt-4">
          {!briefs || briefs.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No briefs yet. The brief is the contract for every page build.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brief</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Main CTA</TableHead>
                  <TableHead>Launch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {briefs.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-medium">{b.title}</p>
                      <p className="max-w-md text-xs text-muted-foreground">{b.offer}</p>
                    </TableCell>
                    <TableCell>{(b.client as unknown as { name: string } | null)?.name}</TableCell>
                    <TableCell className="text-xs">{b.main_cta}</TableCell>
                    <TableCell className="text-xs">{b.launch_date ?? "TBC"}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "approved" ? "default" : "outline"} className="capitalize">
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{b.status === "draft" ? <ApproveBriefButton briefId={b.id} /> : null}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="library" className="pt-4">
          {!buildProjects || buildProjects.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reference projects yet. Add past Replit and GitHub work; nothing is reusable until approved.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Original client</TableHead>
                  <TableHead>Reuse</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildProjects.map((bp) => (
                  <TableRow key={bp.id}>
                    <TableCell>
                      <p className="font-medium">{bp.project_name}</p>
                      {bp.repository_url ? (
                        <a href={bp.repository_url} className="text-xs text-brand hover:underline" target="_blank" rel="noreferrer">
                          Repository
                        </a>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize">{bp.source_provider}</TableCell>
                    <TableCell className="text-xs">{bp.page_type ?? "—"}</TableCell>
                    <TableCell>{(bp.client as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={bp.reuse_permitted ? "default" : "outline"} className="capitalize">
                        {bp.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ReuseStatusButtons projectId={bp.id} status={bp.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
