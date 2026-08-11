import Link from "next/link";
import { canPublishLandingPage, type QaResult } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  AddBuildProjectDialog,
  ApproveBriefButton,
  BuildTemplateFromComponentsDialog,
  CloneTemplateDialog,
  CreateTemplateDialog,
  NewBriefDialog,
  NewPageProjectDialog,
  PageStatusActions,
  PublishDialog,
  QaRunDialog,
  ReusableComponentApprovalButtons,
  ReuseStatusButtons,
} from "./factory-dialogs";

export default async function LandingPageFactoryPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [
    { data: buildProjects },
    { data: briefs },
    { data: pages },
    { data: qaRuns },
    { data: approvals },
    { data: clients },
    { data: campaigns },
    { data: projects },
    { data: templates },
    { data: components },
    { data: versions },
  ] = await Promise.all([
      supabase
        .from("build_library_projects")
        .select("id, project_name, source_provider, page_type, industry, status, reuse_permitted, repository_url, deployment_url, client:clients(name)")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("landing_page_briefs")
        .select("id, title, offer, main_cta, status, launch_date, client_id, campaign_id, client:clients(name), campaign:campaigns(name)")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("landing_page_projects")
        .select(
          "id, name, generation_mode, status, preview_url, production_url, brief_id, draft_version_id, submitted_version_id, published_version_id, client:clients(name), brief:landing_page_briefs(title)",
        )
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("qa_runs")
        .select("landing_page_project_id, landing_page_version_id, overall, created_at")
        .eq("organisation_id", session.organisationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("approvals")
        .select("subject_id, status, landing_page_version_id")
        .eq("organisation_id", session.organisationId)
        .eq("subject_type", "landing_page")
        .in("status", ["approved", "pending"]),
      supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
      supabase.from("campaigns").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
      supabase.from("projects").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
      supabase
        .from("landing_page_templates")
        .select("id, name, description, category, source, template_key, created_at")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("reusable_components")
        .select("id, name, category, approval_status, conversion_purpose, source_section_id, source_landing_page_version_id")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("landing_page_versions")
        .select("id, landing_page_project_id, version_number, version_name, status")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

  const latestQaByProject = new Map<string, { overall: QaResult; versionId: string | null }>();
  const latestQaByProjectVersion = new Map<string, QaResult>();
  for (const run of qaRuns ?? []) {
    const versionKey = `${run.landing_page_project_id}:${run.landing_page_version_id ?? "none"}`;
    if (!latestQaByProjectVersion.has(versionKey)) {
      latestQaByProjectVersion.set(versionKey, run.overall);
    }
    if (!latestQaByProject.has(run.landing_page_project_id)) {
      latestQaByProject.set(run.landing_page_project_id, {
        overall: run.overall,
        versionId: run.landing_page_version_id,
      });
    }
  }

  const approvedPageVersionKeys = new Set(
    (approvals ?? [])
      .filter((approval) => approval.status === "approved")
      .map((approval) => `${approval.subject_id}:${approval.landing_page_version_id ?? "none"}`),
  );
  const pendingPageIds = new Set((approvals ?? []).filter((approval) => approval.status === "pending").map((approval) => approval.subject_id));
  const versionById = new Map((versions ?? []).map((version) => [version.id, version]));

  const approvedBriefs = (briefs ?? []).filter((b) => b.status === "approved");
  const reusableReferences = (buildProjects ?? []).filter((p) => p.reuse_permitted);
  const approvedComponents = (components ?? [])
    .filter((component) => component.approval_status === "approved")
    .map((component) => ({ id: component.id, name: component.name, category: component.category }));

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
          <CreateTemplateDialog />
          <BuildTemplateFromComponentsDialog components={approvedComponents} />
          <NewBriefDialog
            clients={clients ?? []}
            campaigns={(campaigns ?? []).map((campaign) => ({ id: campaign.id, name: campaign.name }))}
          />
          <NewPageProjectDialog
            briefs={approvedBriefs.map((b) => ({ id: b.id, name: b.title }))}
            references={reusableReferences.map((r) => ({ id: r.id, name: r.project_name }))}
            templates={(templates ?? []).map((template) => ({ id: template.id, name: template.name }))}
            projects={(projects ?? []).map((project) => ({ id: project.id, name: project.name }))}
          />
        </div>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Page projects ({(pages ?? []).length})</TabsTrigger>
          <TabsTrigger value="briefs">Briefs ({(briefs ?? []).length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({(templates ?? []).length})</TabsTrigger>
          <TabsTrigger value="components">Components ({(components ?? []).length})</TabsTrigger>
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
                  const submittedVersion = p.submitted_version_id ? versionById.get(p.submitted_version_id) ?? null : null;
                  const latestQa =
                    p.submitted_version_id
                      ? (latestQaByProjectVersion.get(`${p.id}:${p.submitted_version_id}`) ?? null)
                      : (latestQaByProject.get(p.id)?.overall ?? null);
                  const qaVersionId =
                    p.submitted_version_id
                      ? p.submitted_version_id
                      : (latestQaByProject.get(p.id)?.versionId ?? null);
                  const approvedVersionKey = `${p.id}:${p.submitted_version_id ?? "none"}`;
                  const gate = canPublishLandingPage({
                    projectStatus: p.status,
                    latestQaOverall: latestQa,
                    clientApproved: approvedPageVersionKeys.has(approvedVersionKey),
                    submittedVersionId: p.submitted_version_id,
                    latestQaVersionId: qaVersionId,
                    approvedVersionId: approvedPageVersionKeys.has(approvedVersionKey) ? p.submitted_version_id : null,
                  });
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/landing-page-factory/${p.id}`} className="font-medium hover:underline">
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Brief: {(p.brief as unknown as { title: string } | null)?.title ?? "No brief linked"}
                        </p>
                        {submittedVersion ? (
                          <p className="text-xs text-muted-foreground">
                            Submitted: {submittedVersion.version_name} · v{submittedVersion.version_number}
                          </p>
                        ) : null}
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
                        {qaVersionId ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">Exact version tracked</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="capitalize">
                            {p.status.replace(/_/g, " ")}
                          </Badge>
                          {pendingPageIds.has(p.id) ? (
                            <p className="text-[11px] text-muted-foreground">Client approval pending</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="space-y-1.5">
                        <PageStatusActions projectId={p.id} status={p.status} />
                        {["preview", "qa", "internal_approval"].includes(p.status) ? (
                          <QaRunDialog
                            projectId={p.id}
                            versionId={p.draft_version_id ?? p.submitted_version_id ?? null}
                            projectName={p.name}
                          />
                        ) : null}
                        {p.status === "approved_to_publish" ? (
                          <PublishDialog projectId={p.id} projectName={p.name} blocked={!gate.allowed} reasons={gate.reasons} />
                        ) : null}
                        <Link href={`/landing-page-factory/${p.id}`} className="block text-xs text-brand hover:underline">
                          Open editor
                        </Link>
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
                    <TableCell className="text-xs">
                      <p>{b.main_cta}</p>
                      <p className="text-muted-foreground">{(b.campaign as unknown as { name: string } | null)?.name ?? "No campaign"}</p>
                    </TableCell>
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

        <TabsContent value="templates" className="pt-4">
          {!templates || templates.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No templates yet. Create the first reusable template from the built-in Lip Blush conversion preset.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Preset</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <p className="font-medium">{template.name}</p>
                      <p className="max-w-md text-xs text-muted-foreground">{template.description ?? "No description yet."}</p>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{template.category.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {template.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{template.template_key}</TableCell>
                    <TableCell>
                      <CloneTemplateDialog templateId={template.id} templateName={template.name} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="components" className="pt-4">
          {!components || components.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reusable components yet. Promote approved sections from a page version to start the library.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>
                      <p className="font-medium">{component.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {component.source_section_id
                          ? `Source section: ${component.source_section_id}`
                          : "Imported into the native reusable library"}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{component.category.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs">{component.conversion_purpose ?? "No purpose recorded yet."}</TableCell>
                    <TableCell>
                      <Badge variant={component.approval_status === "approved" ? "default" : component.approval_status === "rejected" ? "destructive" : "outline"} className="capitalize">
                        {component.approval_status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ReusableComponentApprovalButtons componentId={component.id} status={component.approval_status} />
                    </TableCell>
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
