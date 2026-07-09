"use server";

import { revalidatePath } from "next/cache";
import { canPublishLandingPage, summariseQaRun, type QaItem } from "@ihp/types";
import { requirePermission, writeAuditLog, type Json } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { isRuleEnabled, notifyUsers, recordRun } from "@/lib/automations/engine";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export async function addBuildLibraryProject(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update");

  const projectName = str(formData, "projectName");
  if (!projectName) throw new Error("Project name is required");

  const { data: project, error } = await supabase
    .from("build_library_projects")
    .insert({
      organisation_id: session.organisationId,
      client_id: str(formData, "clientId"),
      project_name: projectName,
      repository_url: str(formData, "repositoryUrl"),
      deployment_url: str(formData, "deploymentUrl"),
      replit_url: str(formData, "replitUrl"),
      source_provider: (str(formData, "sourceProvider") as "github" | "replit" | "manual" | null) ?? "manual",
      page_type: str(formData, "pageType"),
      industry: str(formData, "industry"),
      conversion_goal: str(formData, "conversionGoal"),
      traffic_source: str(formData, "trafficSource"),
      learnings: str(formData, "learnings"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "build_library_projects",
    resourceId: project.id,
    metadata: { projectName },
  });

  revalidatePath("/landing-page-factory");
}

export async function setBuildProjectReuse(
  projectId: string,
  status: "reviewed" | "approved_for_reuse" | "restricted",
): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "landing_page_factory", "approve");

  const { error } = await supabase
    .from("build_library_projects")
    .update({ status, reuse_permitted: status === "approved_for_reuse" })
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "build_library_projects",
    resourceId: projectId,
    metadata: { status },
  });

  revalidatePath("/landing-page-factory");
}

export async function createBrief(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const title = str(formData, "title");
  const offer = str(formData, "offer");
  const conversionAction = str(formData, "conversionAction");
  const mainCta = str(formData, "mainCta");
  if (!clientId || !title || !offer || !conversionAction || !mainCta) {
    throw new Error("Client, title, offer, conversion action and main CTA are required");
  }

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update", clientId);

  const { data: brief, error } = await supabase
    .from("landing_page_briefs")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      campaign_id: str(formData, "campaignId"),
      title,
      offer,
      product_service: str(formData, "productService"),
      audience: str(formData, "audience"),
      goal: str(formData, "goal"),
      conversion_action: conversionAction,
      main_cta: mainCta,
      secondary_cta: str(formData, "secondaryCta"),
      traffic_source: str(formData, "trafficSource"),
      price: str(formData, "price"),
      promotion: str(formData, "promotion"),
      deadline: str(formData, "deadline"),
      booking_link: str(formData, "bookingLink"),
      testimonials: str(formData, "testimonials"),
      objections: str(formData, "objections"),
      proof_points: str(formData, "proofPoints"),
      differentiators: str(formData, "differentiators"),
      required_claims: str(formData, "requiredClaims"),
      forbidden_claims: str(formData, "forbiddenClaims"),
      required_disclaimer: str(formData, "requiredDisclaimer"),
      brand_direction: str(formData, "brandDirection"),
      required_tracking: str(formData, "requiredTracking"),
      launch_date: str(formData, "launchDate"),
      approval_owner_id: session.userId,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "landing_page_briefs",
    resourceId: brief.id,
    clientId,
    metadata: { title },
  });

  revalidatePath("/landing-page-factory");
}

export async function approveBrief(briefId: string): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "landing_page_factory", "approve");

  const { error } = await supabase
    .from("landing_page_briefs")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", briefId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "landing_page_briefs",
    resourceId: briefId,
    metadata: { status: "approved" },
  });

  revalidatePath("/landing-page-factory");
}

export async function createPageProject(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const briefId = str(formData, "briefId");
  const name = str(formData, "name");
  const mode = str(formData, "generationMode") as
    | "clone_and_adapt"
    | "build_from_components"
    | "build_from_strategy"
    | "improve_existing"
    | null;
  if (!briefId || !name || !mode) throw new Error("Brief, name and generation mode are required");

  // Pages only ever start from an APPROVED brief (source-of-truth hierarchy).
  const { data: brief, error: briefError } = await supabase
    .from("landing_page_briefs")
    .select("id, client_id, status")
    .eq("id", briefId)
    .single();
  if (briefError) throw new Error(briefError.message);
  if (brief.status !== "approved") throw new Error("The brief must be approved before a page project can start.");

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update", brief.client_id);

  const referenceId = str(formData, "referenceBuildProjectId");
  if (referenceId) {
    const { data: reference } = await supabase
      .from("build_library_projects")
      .select("id, reuse_permitted")
      .eq("id", referenceId)
      .single();
    if (!reference?.reuse_permitted) {
      throw new Error("That Build Library project is not approved for reuse.");
    }
  }

  const { data: project, error } = await supabase
    .from("landing_page_projects")
    .insert({
      organisation_id: session.organisationId,
      client_id: brief.client_id,
      brief_id: brief.id,
      name,
      generation_mode: mode,
      reference_build_project_id: referenceId,
      repository_url: str(formData, "repositoryUrl"),
      branch: str(formData, "branch"),
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "landing_page_projects",
    resourceId: project.id,
    clientId: brief.client_id,
    metadata: { name, mode },
  });

  revalidatePath("/landing-page-factory");
}

const PAGE_TRANSITIONS: Record<string, string[]> = {
  planning: ["generating"],
  generating: ["preview"],
  preview: ["qa"],
  qa: ["internal_approval", "preview"],
  internal_approval: ["client_approval", "qa"],
  client_approval: ["preview"],
  approved_to_publish: [],
  published: ["archived"],
  archived: [],
};

type PageStatus =
  | "planning"
  | "generating"
  | "preview"
  | "qa"
  | "internal_approval"
  | "client_approval"
  | "approved_to_publish"
  | "published"
  | "archived";

export async function advancePageStatus(
  projectId: string,
  nextStatus: PageStatus,
  previewUrl?: string,
): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: project, error: fetchError } = await supabase
    .from("landing_page_projects")
    .select("id, name, status, client_id, preview_url")
    .eq("id", projectId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update", project.client_id);

  if (!PAGE_TRANSITIONS[project.status]?.includes(nextStatus)) {
    throw new Error(`A page cannot move from ${project.status} to ${nextStatus}.`);
  }

  const effectivePreviewUrl = previewUrl?.trim() || project.preview_url;

  if (nextStatus === "client_approval") {
    if (!effectivePreviewUrl) {
      throw new Error("A preview URL is required before requesting client approval.");
    }
    const { error: approvalError } = await supabase.from("approvals").insert({
      organisation_id: session.organisationId,
      client_id: project.client_id,
      subject_type: "landing_page",
      subject_id: project.id,
      requested_by: session.userId,
      status: "pending",
    });
    if (approvalError) throw new Error(approvalError.message);
  }

  const { error } = await supabase
    .from("landing_page_projects")
    .update({ status: nextStatus, preview_url: effectivePreviewUrl })
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  if (previewUrl?.trim()) {
    await supabase.from("deployments").insert({
      organisation_id: session.organisationId,
      landing_page_project_id: projectId,
      environment: "preview",
      provider: "manual",
      url: previewUrl.trim(),
      status: "succeeded",
      triggered_by: session.userId,
    });
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "landing_page_projects",
    resourceId: projectId,
    clientId: project.client_id,
    metadata: { status: nextStatus },
  });

  revalidatePath("/landing-page-factory");
  revalidatePath("/client-portal");
}

export async function recordQaRun(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update");

  const projectId = str(formData, "projectId");
  if (!projectId) throw new Error("Project is required");

  const items: QaItem[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("check:")) {
      const check = key.slice("check:".length);
      const result = String(value) as QaItem["result"];
      const note = str(formData, `note:${check}`);
      items.push({ check, result, ...(note ? { note } : {}) });
    }
  }
  if (items.length === 0) throw new Error("No checklist results submitted");

  const overall = summariseQaRun(items);

  const { error } = await supabase.from("qa_runs").insert({
    organisation_id: session.organisationId,
    landing_page_project_id: projectId,
    run_by: session.userId,
    overall,
    items: items as unknown as Json,
    notes: str(formData, "notes"),
  });
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "qa_runs",
    resourceId: projectId,
    metadata: { overall, itemCount: items.length },
  });

  // Automation: a failing QA run notifies the page owner (publish is
  // already blocked by the gate regardless).
  if (overall === "fail" && (await isRuleEnabled(supabase, session.organisationId, "qa_failed_notify"))) {
    const { data: project } = await supabase
      .from("landing_page_projects")
      .select("name, client_id, created_by")
      .eq("id", projectId)
      .single();
    if (project?.created_by) {
      const failedChecks = items.filter((i) => i.result === "fail").map((i) => i.check);
      if (await recordRun(supabase, session.organisationId, "qa_failed_notify", `${projectId}:${new Date().toISOString()}`, `QA failed for ${project.name}`)) {
        await notifyUsers(supabase, session.organisationId, [project.created_by], {
          title: `QA failed: ${project.name}`,
          body: `Failed checks: ${failedChecks.slice(0, 4).join(", ")}${failedChecks.length > 4 ? "..." : ""}. Publishing is blocked.`,
          href: "/landing-page-factory",
          clientId: project.client_id,
        });
      }
    }
  }

  revalidatePath("/landing-page-factory");
}

/**
 * The hard gate. Publishing requires approved_to_publish status (set only by
 * the client's approval decision), a latest QA run that did not fail, and
 * the landing_page_factory approve permission.
 */
export async function publishPage(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const projectId = str(formData, "projectId");
  const productionUrl = str(formData, "productionUrl");
  if (!projectId || !productionUrl) throw new Error("Project and production URL are required");

  const { data: project, error: fetchError } = await supabase
    .from("landing_page_projects")
    .select("id, name, status, client_id, created_by")
    .eq("id", projectId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "approve", project.client_id);

  const [{ data: latestQa }, { data: approval }] = await Promise.all([
    supabase
      .from("qa_runs")
      .select("overall")
      .eq("landing_page_project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("approvals")
      .select("status")
      .eq("subject_type", "landing_page")
      .eq("subject_id", projectId)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle(),
  ]);

  const gate = canPublishLandingPage({
    projectStatus: project.status,
    latestQaOverall: latestQa?.overall ?? null,
    clientApproved: Boolean(approval),
  });
  if (!gate.allowed) {
    throw new Error(`Publish blocked: ${gate.reasons.join(" ")}`);
  }

  const { error } = await supabase
    .from("landing_page_projects")
    .update({ status: "published", production_url: productionUrl })
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  await supabase.from("deployments").insert({
    organisation_id: session.organisationId,
    landing_page_project_id: projectId,
    environment: "production",
    provider: "manual",
    url: productionUrl,
    status: "succeeded",
    triggered_by: session.userId,
  });

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "external_action",
    resource: "landing_page_projects",
    resourceId: projectId,
    clientId: project.client_id,
    metadata: { published: true, productionUrl },
  });

  // Automation: deployment succeeded → notify the project owner.
  if (project.created_by && (await isRuleEnabled(supabase, session.organisationId, "page_published_notify"))) {
    if (await recordRun(supabase, session.organisationId, "page_published_notify", projectId, `Publish notification for ${project.name}`)) {
      await notifyUsers(supabase, session.organisationId, [project.created_by], {
        title: `Published: ${project.name}`,
        body: `Live at ${productionUrl}`,
        href: "/landing-page-factory",
        clientId: project.client_id,
      });
    }
  }

  revalidatePath("/landing-page-factory");
  revalidatePath("/client-portal");
}
