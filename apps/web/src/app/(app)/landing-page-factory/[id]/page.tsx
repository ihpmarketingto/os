import { canPublishLandingPage, normaliseLandingPageDraft, type QaResult } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildDraftFromPreset } from "../template-presets";
import { LandingPageEditor } from "../page-editor";
import { PublishDialog, QaRunDialog } from "../factory-dialogs";

export default async function LandingPageFactoryProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: project, error: projectError } = await supabase
    .from("landing_page_projects")
    .select(
      "id, name, status, client_id, brief_id, project_id, preview_url, production_url, draft_version_id, submitted_version_id, published_version_id, client:clients(id, name, website, brand_kit), brief:landing_page_briefs(id, title, offer, audience, goal, conversion_action, main_cta, secondary_cta, traffic_source, price, promotion, deadline, booking_link, testimonials, objections, proof_points, differentiators, required_claims, forbidden_claims, required_disclaimer, brand_direction, required_tracking, launch_date, campaign_id)",
    )
    .eq("id", id)
    .single();
  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Page project not found");
  }

  const brief = project.brief as unknown as {
    id: string;
    title: string;
    offer: string;
    audience: string | null;
    goal: string | null;
    conversion_action: string;
    main_cta: string;
    secondary_cta: string | null;
    traffic_source: string | null;
    price: string | null;
    promotion: string | null;
    deadline: string | null;
    booking_link: string | null;
    testimonials: string | null;
    objections: string | null;
    proof_points: string | null;
    differentiators: string | null;
    required_claims: string | null;
    forbidden_claims: string | null;
    required_disclaimer: string | null;
    brand_direction: string | null;
    required_tracking: string | null;
    launch_date: string | null;
    campaign_id: string | null;
  } | null;
  const client = project.client as unknown as {
    id: string;
    name: string;
    website: string | null;
    brand_kit: unknown;
  } | null;
  if (!brief || !client) {
    throw new Error("This page project is missing its brief or client.");
  }

  const [
    { data: versions },
    { data: qaRuns },
    { data: approvals },
    { data: documents },
    { data: creativeAssets },
    { data: knowledgeEntries },
    { data: experiments },
    { data: performanceRecords },
    { data: linkedTasks },
    { data: campaign },
  ] = await Promise.all([
    supabase
      .from("landing_page_versions")
      .select("id, version_number, version_name, status, template_key, template_name, title, slug, subdomain, domain, theme_settings, sections, form_settings, tracking_settings, seo_settings, social_settings, asset_slots, source_context, created_at, published_at")
      .eq("landing_page_project_id", id)
      .is("deleted_at", null)
      .order("version_number", { ascending: false }),
    supabase
      .from("qa_runs")
      .select("landing_page_version_id, overall, created_at")
      .eq("landing_page_project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
      .select("status, landing_page_version_id")
      .eq("subject_type", "landing_page")
      .eq("subject_id", id)
      .order("requested_at", { ascending: false }),
    supabase.from("documents").select("id, name").eq("client_id", client.id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("creative_assets").select("id, name").eq("client_id", client.id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase
      .from("knowledge_entries")
      .select("id, title, kind")
      .or(`client_id.eq.${client.id},client_id.is.null`)
      .eq("status", "active")
      .order("title"),
    supabase.from("experiments").select("id, name").eq("client_id", client.id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase
      .from("landing_page_performance_records")
      .select("id, metric_date, visits, leads, qualified_leads, bookings, revenue, verified_learning, experiment:experiments(name)")
      .eq("landing_page_project_id", id)
      .order("metric_date", { ascending: false }),
    project.project_id
      ? supabase.from("tasks").select("id, title, status").eq("project_id", project.project_id).is("deleted_at", null).order("created_at")
      : Promise.resolve({ data: [] as { id: string; title: string; status: string }[] }),
    brief.campaign_id
      ? supabase
          .from("campaigns")
          .select("id, name, objective, offer, audience, channels, kpis, results, learnings")
          .eq("id", brief.campaign_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const editableVersion =
    (versions ?? []).find((version) => version.id === project.draft_version_id) ??
    (versions ?? []).find((version) => ["draft", "changes_requested"].includes(version.status)) ??
    (versions ?? [])[0] ??
    null;

  const initialDraft = editableVersion
    ? normaliseLandingPageDraft({
        templateKey: editableVersion.template_key,
        templateName: editableVersion.template_name,
        versionName: editableVersion.version_name,
        title: editableVersion.title,
        slug: editableVersion.slug,
        subdomain: editableVersion.subdomain,
        domain: editableVersion.domain,
        theme: editableVersion.theme_settings,
        sections: editableVersion.sections,
        form: editableVersion.form_settings,
        tracking: editableVersion.tracking_settings,
        seo: editableVersion.seo_settings,
        social: editableVersion.social_settings,
        assetSlots: editableVersion.asset_slots,
        sourceContext: editableVersion.source_context,
        notes: null,
      })
    : buildDraftFromPreset({
        presetKey: "lip_blush_conversion",
        client,
        brief,
        campaign,
      });

  const latestQa = (qaRuns ?? []).find((run) => run.landing_page_version_id === project.submitted_version_id) ?? null;
  const approvedApproval =
    (approvals ?? []).find(
      (approval) =>
        approval.status === "approved" &&
        approval.landing_page_version_id === project.submitted_version_id,
    ) ?? null;

  const publishGate = canPublishLandingPage({
    projectStatus: project.status,
    latestQaOverall: (latestQa?.overall as QaResult | undefined) ?? null,
    clientApproved: Boolean(approvedApproval),
    submittedVersionId: project.submitted_version_id,
    latestQaVersionId: latestQa?.landing_page_version_id ?? null,
    approvedVersionId: approvedApproval?.landing_page_version_id ?? null,
  });

  const campaignOptions = campaign ? [{ id: campaign.id, name: campaign.name }] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{client.name}</Badge>
            <Badge variant="secondary" className="capitalize">
              {project.status.replace(/_/g, " ")}
            </Badge>
            {project.production_url ? <Badge>Live</Badge> : null}
          </div>
          <div>
            <h1 className="font-heading text-2xl">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {brief.offer}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {editableVersion ? <QaRunDialog projectId={project.id} versionId={editableVersion.id} projectName={project.name} /> : null}
          {project.status === "approved_to_publish" ? (
            <PublishDialog projectId={project.id} projectName={project.name} blocked={!publishGate.allowed} reasons={publishGate.reasons} />
          ) : null}
          {project.preview_url ? (
            <Button render={<a href={project.preview_url} target="_blank" rel="noreferrer" />}>
              Open preview
            </Button>
          ) : null}
          {project.production_url ? (
            <Button variant="outline" render={<a href={project.production_url} target="_blank" rel="noreferrer" />}>
              Open live page
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked entities</CardTitle>
            <CardDescription>Client, offer, campaign, work items, approval and performance records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Client: {client.name}</p>
            <p>Brief: {brief.title}</p>
            <p>Campaign: {campaign?.name ?? "No campaign linked"}</p>
            <p>Delivery project: {project.project_id ? "Linked" : "Not linked yet"}</p>
            <p>Experiments: {experiments?.length ?? 0}</p>
            <p>Performance records: {performanceRecords?.length ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publish readiness</CardTitle>
            <CardDescription>Exact-version QA and approval stay tied to the submitted version.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {publishGate.allowed ? (
              <p className="text-emerald-700">Ready to publish once you record the production deployment.</p>
            ) : (
              publishGate.reasons.map((reason) => (
                <p key={reason} className="text-muted-foreground">
                  • {reason}
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current version pointers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Draft: {project.draft_version_id ?? "None"}</p>
            <p>Submitted: {project.submitted_version_id ?? "None"}</p>
            <p>Published: {project.published_version_id ?? "None"}</p>
          </CardContent>
        </Card>
      </div>

      <LandingPageEditor
        key={`${project.id}:${editableVersion?.id ?? "none"}:${project.status}`}
        projectId={project.id}
        projectStatus={project.status}
        initialVersionId={editableVersion?.id ?? null}
        initialDraft={initialDraft}
        previewUrl={project.preview_url}
        productionUrl={project.production_url}
        versionHistory={versions ?? []}
        documents={(documents ?? []).map((doc) => ({ id: doc.id, name: doc.name }))}
        creativeAssets={(creativeAssets ?? []).map((asset) => ({ id: asset.id, name: asset.name }))}
        knowledgeEntries={(knowledgeEntries ?? []).map((entry) => ({ id: entry.id, name: entry.title, kind: entry.kind }))}
        experiments={(experiments ?? []).map((experiment) => ({ id: experiment.id, name: experiment.name }))}
        campaigns={campaignOptions}
        performanceRecords={(performanceRecords ?? []).map((record) => ({
          id: record.id,
          metric_date: record.metric_date,
          visits: record.visits,
          leads: record.leads,
          qualified_leads: record.qualified_leads,
          bookings: record.bookings,
          revenue: Number(record.revenue),
          verified_learning: record.verified_learning,
          experiment: (record.experiment as unknown as { name: string } | null) ?? null,
        }))}
        linkedTasks={linkedTasks ?? []}
      />
    </div>
  );
}
