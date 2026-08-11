"use server";

import { revalidatePath } from "next/cache";
import {
  buildLandingPageTemplateDraftFromComponents,
  buildLandingPageProductionUrl,
  buildLandingPagePreviewUrl,
  canPublishLandingPage,
  landingPageSectionSchema,
  mapLandingPageSectionKindToReusableCategory,
  normaliseLandingPageDraft,
  resolveLandingPagePreviewVersionId,
  summariseQaRun,
  validateLandingPageClientIsolation,
  type LandingPageDraft,
  type LandingPageValidationResult,
  type QaItem,
} from "@ihp/types";
import { requirePermission, writeAuditLog, type Json } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env/server";
import { slugify } from "@/lib/utils";
import { isRuleEnabled, notifyUsers, recordRun } from "@/lib/automations/engine";
import { buildDraftFromPreset, buildPresetSkeleton } from "./template-presets";

type DeploymentProvider = "vercel" | "netlify" | "cloudflare_pages" | "replit" | "manual";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function strs(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function deploymentProviderFrom(value: string | null): DeploymentProvider {
  switch (value) {
    case "vercel":
    case "netlify":
    case "cloudflare_pages":
    case "replit":
      return value;
    default:
      return "manual";
  }
}

function templateKeyFromName(value: string): string {
  return slugify(value).replace(/-/g, "_");
}

function nativePreviewUrlFor(input: {
  projectId: string;
  projectStatus: string;
  draftVersionId?: string | null;
  submittedVersionId?: string | null;
  publishedVersionId?: string | null;
  previewShareToken?: string | null;
}): string | null {
  if (!input.previewShareToken) return null;

  const versionId = resolveLandingPagePreviewVersionId({
    projectStatus: input.projectStatus,
    draftVersionId: input.draftVersionId,
    submittedVersionId: input.submittedVersionId,
    publishedVersionId: input.publishedVersionId,
  });
  if (!versionId) return null;

  return buildLandingPagePreviewUrl({
    appUrl: serverEnv.APP_URL,
    projectId: input.projectId,
    versionId,
    previewShareToken: input.previewShareToken,
  });
}

function describeEditableFields() {
  return [
    "eyebrow",
    "headline",
    "subheadline",
    "body",
    "badge",
    "ctaLabel",
    "ctaHref",
    "bullets",
    "items",
    "notes",
  ].join(", ");
}

function parseDraft(formData: FormData): LandingPageDraft {
  const raw = str(formData, "draftJson");
  if (!raw) throw new Error("Draft payload is required");
  return normaliseLandingPageDraft(JSON.parse(raw));
}

function toJson(value: unknown): Json {
  return value as Json;
}

function draftToTemplateDefaults(draft: LandingPageDraft): Json {
  return toJson({
    theme: draft.theme,
    form: draft.form,
    tracking: draft.tracking,
    seo: draft.seo,
    social: draft.social,
    assetSlots: draft.assetSlots,
    sourceContext: draft.sourceContext,
  });
}

function buildTemplateBackedDraft(input: {
  template: {
    name: string;
    template_key: string;
    structure: Json;
    defaults: Json;
  };
  brief: {
    title: string;
    offer: string;
    main_cta: string;
    brand_direction: string | null;
    booking_link: string | null;
  };
  client: {
    name: string;
  };
}): LandingPageDraft {
  const defaults = (input.template.defaults as Record<string, unknown> | null) ?? {};
  const themeDefaults = (defaults.theme as Record<string, unknown> | undefined) ?? {};
  const formDefaults = (defaults.form as Record<string, unknown> | undefined) ?? {};
  const trackingDefaults = (defaults.tracking as Record<string, unknown> | undefined) ?? {};
  const seoDefaults = (defaults.seo as Record<string, unknown> | undefined) ?? {};
  const socialDefaults = (defaults.social as Record<string, unknown> | undefined) ?? {};
  const assetSlotDefaults = (defaults.assetSlots as unknown[] | undefined) ?? [];
  const sourceContextDefaults = (defaults.sourceContext as Record<string, unknown> | undefined) ?? {};

  return normaliseLandingPageDraft({
    templateKey: input.template.template_key,
    templateName: input.template.name,
    versionName: "Version 1",
    title: input.brief.title,
    slug: slugify(input.brief.title),
    domain: null,
    subdomain: null,
    theme: {
      ...themeDefaults,
      brandName: input.client.name,
      tagLine:
        input.brief.brand_direction ??
        (typeof themeDefaults.tagLine === "string" ? themeDefaults.tagLine : null),
    },
    sections: input.template.structure,
    form: {
      ...formDefaults,
      bookingUrl:
        input.brief.booking_link ??
        (typeof formDefaults.bookingUrl === "string" ? formDefaults.bookingUrl : null),
      submitLabel:
        input.brief.main_cta ||
        (typeof formDefaults.submitLabel === "string" ? formDefaults.submitLabel : "Reserve my spot"),
    },
    tracking: trackingDefaults,
    seo: {
      ...seoDefaults,
      metaTitle: input.brief.title,
      metaDescription: input.brief.offer,
      ogTitle:
        typeof seoDefaults.ogTitle === "string" && seoDefaults.ogTitle
          ? seoDefaults.ogTitle
          : input.brief.title,
      ogDescription:
        typeof seoDefaults.ogDescription === "string" && seoDefaults.ogDescription
          ? seoDefaults.ogDescription
          : input.brief.offer,
    },
    social: socialDefaults,
    assetSlots: assetSlotDefaults,
    sourceContext: sourceContextDefaults,
    notes: null,
  });
}

function buildDraftValidation(draft: LandingPageDraft, isolationMessages: string[]): LandingPageValidationResult[] {
  const results: LandingPageValidationResult[] = isolationMessages.map((message) => ({
    scope: message.includes("knowledge") ? "knowledge" : "asset",
    severity: "error",
    message,
  }));

  if (draft.form.ctaType === "booking_link" && !draft.form.bookingUrl) {
    results.push({
      scope: "publish",
      severity: "error",
      message: "A booking URL is required when the primary CTA uses a booking destination.",
    });
  }

  if (!draft.tracking.ga4MeasurementId && !draft.tracking.metaPixelId) {
    results.push({
      scope: "publish",
      severity: "warning",
      message: "Tracking IDs are still empty. Add GA4, Meta Pixel, or both before publishing.",
    });
  }

  return results;
}

async function validateDraftIsolation(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  clientId: string,
  draft: LandingPageDraft,
) {
  const documentIds = draft.assetSlots.map((slot) => slot.documentId).filter((value): value is string => Boolean(value));
  const creativeAssetIds = draft.assetSlots
    .map((slot) => slot.creativeAssetId)
    .filter((value): value is string => Boolean(value));
  const knowledgeIds = [
    ...draft.sourceContext.brandVoiceIds,
    ...draft.sourceContext.offerIds,
    ...draft.sourceContext.audienceIds,
    ...draft.sourceContext.restrictionIds,
    ...draft.sourceContext.proofIds,
  ];

  const [{ data: documents }, { data: assets }, { data: knowledgeEntries }] = await Promise.all([
    documentIds.length
      ? supabase.from("documents").select("id, client_id, name").in("id", documentIds)
      : Promise.resolve({ data: [] as { id: string; client_id: string | null; name: string }[] }),
    creativeAssetIds.length
      ? supabase.from("creative_assets").select("id, client_id, name").in("id", creativeAssetIds)
      : Promise.resolve({ data: [] as { id: string; client_id: string | null; name: string }[] }),
    knowledgeIds.length
      ? supabase.from("knowledge_entries").select("id, client_id, title").in("id", knowledgeIds)
      : Promise.resolve({ data: [] as { id: string; client_id: string | null; title: string }[] }),
  ]);

  const isolation = validateLandingPageClientIsolation(clientId, [
    ...(documents ?? []).map((doc) => ({
      kind: "document" as const,
      id: doc.id,
      clientId: doc.client_id,
      label: doc.name,
    })),
    ...(assets ?? []).map((asset) => ({
      kind: "creative_asset" as const,
      id: asset.id,
      clientId: asset.client_id,
      label: asset.name,
    })),
    ...(knowledgeEntries ?? []).map((entry) => ({
      kind: "knowledge_entry" as const,
      id: entry.id,
      clientId: entry.client_id,
      label: entry.title,
    })),
  ]);

  return {
    isolation,
    validationResults: buildDraftValidation(draft, isolation.messages),
  };
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

export async function setReusableComponentApprovalStatus(
  componentId: string,
  status: "approved" | "rejected",
): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "landing_page_factory", "approve");

  const { error } = await supabase
    .from("reusable_components")
    .update({ approval_status: status })
    .eq("id", componentId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "reusable_components",
    resourceId: componentId,
    metadata: { approvalStatus: status },
  });

  revalidatePath("/landing-page-factory");
}

export async function createReusableComponentFromVersion(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const versionId = str(formData, "versionId");
  const sectionId = str(formData, "sectionId");
  const name = str(formData, "name");
  if (!versionId || !sectionId || !name) {
    throw new Error("Version, section, and component name are required.");
  }

  const { data: version, error: versionError } = await supabase
    .from("landing_page_versions")
    .select("id, organisation_id, client_id, landing_page_project_id, sections")
    .eq("id", versionId)
    .single();
  if (versionError) throw new Error(versionError.message);

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update", version.client_id);

  const sections = landingPageSectionSchema.array().parse(version.sections);
  const section = sections.find((candidate) => candidate.id === sectionId);
  if (!section) {
    throw new Error("That section could not be found in the selected version.");
  }

  const { data: component, error } = await supabase
    .from("reusable_components")
    .insert({
      organisation_id: version.organisation_id,
      source_landing_page_version_id: version.id,
      source_section_id: section.id,
      name,
      category: mapLandingPageSectionKindToReusableCategory(section.kind),
      code_reference: `landing_page_versions:${version.id}#${section.id}`,
      props_notes: section.notes,
      editable_fields: describeEditableFields(),
      accessibility_notes: str(formData, "accessibilityNotes"),
      analytics_events: str(formData, "analyticsEvents"),
      conversion_purpose: str(formData, "conversionPurpose") ?? section.label,
      approval_status: "pending_review",
      section_payload: toJson(section),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: version.organisation_id,
    actorUserId: session.userId,
    action: "create",
    resource: "reusable_components",
    resourceId: component.id,
    clientId: version.client_id,
    metadata: { versionId, sectionId, name },
  });

  revalidatePath("/landing-page-factory");
  revalidatePath(`/landing-page-factory/${version.landing_page_project_id}`);
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
  const projectId = str(formData, "projectId");
  const templateId = str(formData, "templateId");
  const templatePresetKey = str(formData, "templatePresetKey") ?? "lip_blush_conversion";
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
    .select(
      "id, client_id, status, title, offer, audience, goal, conversion_action, main_cta, secondary_cta, traffic_source, price, promotion, deadline, booking_link, testimonials, objections, proof_points, differentiators, required_claims, forbidden_claims, required_disclaimer, brand_direction, required_tracking, launch_date, campaign_id",
    )
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
      project_id: projectId,
      name,
      generation_mode: mode,
      reference_build_project_id: referenceId,
      repository_url: str(formData, "repositoryUrl"),
      branch: str(formData, "branch"),
      created_by: session.userId,
    })
    .select("id, client_id, preview_share_token")
    .single();
  if (error) throw new Error(error.message);

  const [{ data: client }, { data: campaign }, { data: template }] = await Promise.all([
    supabase.from("clients").select("id, name, website, brand_kit").eq("id", brief.client_id).single(),
    brief.campaign_id
      ? supabase
          .from("campaigns")
          .select("id, name, objective, offer, audience, channels, kpis, results, learnings")
          .eq("id", brief.campaign_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    templateId
      ? supabase
          .from("landing_page_templates")
          .select("id, name, template_key, structure, defaults")
          .eq("id", templateId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!client) throw new Error("Client not found");

  const initialDraft = template
    ? buildTemplateBackedDraft({
        template,
        brief: {
          title: brief.title,
          offer: brief.offer,
          main_cta: brief.main_cta,
          brand_direction: brief.brand_direction,
          booking_link: brief.booking_link,
        },
        client: { name: client.name },
      })
    : buildDraftFromPreset({
        presetKey: templatePresetKey,
        client,
        brief,
        campaign,
      });

  const { isolation, validationResults } = await validateDraftIsolation(supabase, brief.client_id, initialDraft);

  const { data: version, error: versionError } = await supabase
    .from("landing_page_versions")
    .insert({
      organisation_id: session.organisationId,
      client_id: brief.client_id,
      landing_page_project_id: project.id,
      template_id: template?.id ?? null,
      template_key: initialDraft.templateKey,
      template_name: initialDraft.templateName,
      version_number: 1,
      version_name: initialDraft.versionName,
      title: initialDraft.title,
      slug: initialDraft.slug,
      subdomain: initialDraft.subdomain,
      domain: initialDraft.domain,
      theme_settings: toJson(initialDraft.theme),
      sections: toJson(initialDraft.sections),
      form_settings: toJson(initialDraft.form),
      tracking_settings: toJson(initialDraft.tracking),
      seo_settings: toJson(initialDraft.seo),
      social_settings: toJson(initialDraft.social),
      asset_slots: toJson(initialDraft.assetSlots),
      source_context: toJson(initialDraft.sourceContext),
      validation_results: toJson(validationResults),
      leakage_check_passed: isolation.passed,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (versionError) throw new Error(versionError.message);

  const previewUrl = nativePreviewUrlFor({
    projectId: project.id,
    projectStatus: "planning",
    draftVersionId: version.id,
    submittedVersionId: null,
    publishedVersionId: null,
    previewShareToken: project.preview_share_token,
  });

  const { error: projectUpdateError } = await supabase
    .from("landing_page_projects")
    .update(({ draft_version_id: version.id, ...(previewUrl ? { preview_url: previewUrl } : {}) }) as never)
    .eq("id", project.id);
  if (projectUpdateError) throw new Error(projectUpdateError.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "landing_page_projects",
    resourceId: project.id,
    clientId: brief.client_id,
    metadata: { name, mode, templateId, templatePresetKey, projectId },
  });

  revalidatePath("/landing-page-factory");
  revalidatePath(`/landing-page-factory/${project.id}`);
}

const PAGE_TRANSITIONS: Record<string, string[]> = {
  planning: ["generating"],
  generating: ["preview"],
  preview: ["qa"],
  qa: ["internal_approval", "preview"],
  internal_approval: ["qa"],
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
  provider?: DeploymentProvider,
): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: project, error: fetchError } = await supabase
    .from("landing_page_projects")
    .select("id, name, status, client_id, draft_version_id, submitted_version_id, published_version_id, preview_share_token, preview_url")
    .eq("id", projectId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update", project.client_id);

  if (!PAGE_TRANSITIONS[project.status]?.includes(nextStatus)) {
    throw new Error(`A page cannot move from ${project.status} to ${nextStatus}.`);
  }

  const effectivePreviewUrl =
    previewUrl?.trim() ||
    nativePreviewUrlFor({
      projectId: project.id,
      projectStatus: nextStatus,
      draftVersionId: project.draft_version_id,
      submittedVersionId: project.submitted_version_id,
      publishedVersionId: project.published_version_id,
      previewShareToken: project.preview_share_token,
    }) ||
    project.preview_url;

  if (nextStatus === "client_approval") {
    throw new Error("Submit an exact page version for approval from the page editor.");
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
      provider: provider ?? "manual",
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
    metadata: {
      status: nextStatus,
      previewUrl: previewUrl?.trim() ?? null,
      provider: previewUrl?.trim() ? provider ?? "manual" : null,
    },
  });

  revalidatePath("/landing-page-factory");
  revalidatePath(`/landing-page-factory/${projectId}`);
  revalidatePath("/client-portal");
}

export async function recordQaRun(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update");

  const projectId = str(formData, "projectId");
  const versionId = str(formData, "versionId");
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
    landing_page_version_id: versionId,
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
  revalidatePath(`/landing-page-factory/${projectId}`);
}

export async function createTemplateFromPreset(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update");

  const presetKey = str(formData, "presetKey") ?? "lip_blush_conversion";
  const name = str(formData, "name") ?? "Landing page template";
  const skeleton = buildPresetSkeleton(presetKey);

  const { data: template, error } = await supabase
    .from("landing_page_templates")
    .insert({
      organisation_id: session.organisationId,
      name,
      slug: slugify(name),
      description: str(formData, "description"),
      category: "offer_landing_page",
      source: "native",
      template_key: presetKey,
      structure: toJson(skeleton.sections),
      defaults: draftToTemplateDefaults(skeleton),
      preview_config: toJson({ versionName: skeleton.versionName }),
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "landing_page_templates",
    resourceId: template.id,
    metadata: { name, presetKey },
  });

  revalidatePath("/landing-page-factory");
}

export async function cloneTemplate(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update");

  const templateId = str(formData, "templateId");
  const name = str(formData, "name");
  if (!templateId || !name) throw new Error("Template and name are required");

  const { data: template, error: fetchError } = await supabase
    .from("landing_page_templates")
    .select("id, template_key, structure, defaults, description, category")
    .eq("id", templateId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { data: clone, error } = await supabase
    .from("landing_page_templates")
    .insert({
      organisation_id: session.organisationId,
      name,
      slug: slugify(name),
      description: template.description,
      category: template.category,
      source: "cloned",
      cloned_from_template_id: template.id,
      template_key: template.template_key,
      structure: template.structure,
      defaults: template.defaults,
      preview_config: toJson({ clonedFromTemplateId: template.id }),
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "landing_page_templates",
    resourceId: clone.id,
    metadata: { clonedFromTemplateId: template.id, name },
  });

  revalidatePath("/landing-page-factory");
}

export async function createTemplateFromComponents(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update");

  const name = str(formData, "name");
  if (!name) throw new Error("Template name is required");

  const componentIds = strs(formData, "componentIds");
  if (componentIds.length === 0) {
    throw new Error("Select at least one approved reusable component.");
  }

  const { data: components, error: componentsError } = await supabase
    .from("reusable_components")
    .select("id, name, category, approval_status, section_payload")
    .in("id", componentIds);
  if (componentsError) throw new Error(componentsError.message);

  if (!components || components.length !== componentIds.length) {
    throw new Error("One or more reusable components could not be found.");
  }
  if (components.some((component) => component.approval_status !== "approved")) {
    throw new Error("Only approved reusable components can be used in a shared template.");
  }

  const orderedComponents = componentIds
    .map((componentId) => components.find((component) => component.id === componentId) ?? null)
    .filter((component): component is NonNullable<typeof component> => Boolean(component));

  const draft = buildLandingPageTemplateDraftFromComponents({
    templateName: name,
    components: orderedComponents.map((component) => ({
      id: component.id,
      name: component.name,
      category: component.category,
      sectionPayload: component.section_payload,
    })),
  });

  const { data: template, error } = await supabase
    .from("landing_page_templates")
    .insert({
      organisation_id: session.organisationId,
      name,
      slug: slugify(name),
      description: str(formData, "description"),
      category: "offer_landing_page",
      source: "native",
      template_key: templateKeyFromName(name),
      structure: toJson(draft.sections),
      defaults: draftToTemplateDefaults(draft),
      preview_config: toJson({ versionName: draft.versionName, componentIds }),
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "landing_page_templates",
    resourceId: template.id,
    metadata: { name, componentIds },
  });

  revalidatePath("/landing-page-factory");
}

export async function saveDraftVersion(formData: FormData): Promise<{ versionId: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const projectId = str(formData, "projectId");
  let versionId = str(formData, "versionId");
  if (!projectId) throw new Error("Project is required");

  const draft = parseDraft(formData);

  const { data: project, error: projectError } = await supabase
    .from("landing_page_projects")
    .select("id, client_id, status, submitted_version_id, published_version_id, preview_share_token")
    .eq("id", projectId)
    .single();
  if (projectError) throw new Error(projectError.message);

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update", project.client_id);

  const { isolation, validationResults } = await validateDraftIsolation(supabase, project.client_id, draft);

  const { data: latestVersion } = await supabase
    .from("landing_page_versions")
    .select("id, version_number")
    .eq("landing_page_project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let shouldInsert = !versionId;
  if (versionId) {
    const { data: existingVersion, error: existingError } = await supabase
      .from("landing_page_versions")
      .select("id, status")
      .eq("id", versionId)
      .single();
    if (existingError) throw new Error(existingError.message);
    shouldInsert = !["draft", "changes_requested"].includes(existingVersion.status);
  }

  if (shouldInsert) {
    const nextVersionNumber = (latestVersion?.version_number ?? 0) + 1;
    const { data: insertedVersion, error } = await supabase
      .from("landing_page_versions")
      .insert({
        organisation_id: session.organisationId,
        client_id: project.client_id,
        landing_page_project_id: projectId,
        template_key: draft.templateKey,
        template_name: draft.templateName,
        version_number: nextVersionNumber,
        version_name: draft.versionName || `Version ${nextVersionNumber}`,
        title: draft.title,
        slug: draft.slug,
        subdomain: draft.subdomain,
        domain: draft.domain,
        theme_settings: toJson(draft.theme),
        sections: toJson(draft.sections),
        form_settings: toJson(draft.form),
        tracking_settings: toJson(draft.tracking),
        seo_settings: toJson(draft.seo),
        social_settings: toJson(draft.social),
        asset_slots: toJson(draft.assetSlots),
        source_context: toJson(draft.sourceContext),
        validation_results: toJson(validationResults),
        leakage_check_passed: isolation.passed,
        created_by: session.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    versionId = insertedVersion.id;
  } else {
    const { error } = await supabase
      .from("landing_page_versions")
      .update({
        template_key: draft.templateKey,
        template_name: draft.templateName,
        version_name: draft.versionName,
        title: draft.title,
        slug: draft.slug,
        subdomain: draft.subdomain,
        domain: draft.domain,
        theme_settings: toJson(draft.theme),
        sections: toJson(draft.sections),
        form_settings: toJson(draft.form),
        tracking_settings: toJson(draft.tracking),
        seo_settings: toJson(draft.seo),
        social_settings: toJson(draft.social),
        asset_slots: toJson(draft.assetSlots),
        source_context: toJson(draft.sourceContext),
        validation_results: toJson(validationResults),
        leakage_check_passed: isolation.passed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", versionId as string);
    if (error) throw new Error(error.message);
  }

  const nativePreviewUrl = nativePreviewUrlFor({
    projectId,
    projectStatus: project.status,
    draftVersionId: versionId,
    submittedVersionId: project.submitted_version_id,
    publishedVersionId: project.published_version_id,
    previewShareToken: project.preview_share_token,
  });

  const { error: projectUpdateError } = await supabase
    .from("landing_page_projects")
    .update(({ draft_version_id: versionId, ...(nativePreviewUrl ? { preview_url: nativePreviewUrl } : {}) }) as never)
    .eq("id", projectId);
  if (projectUpdateError) throw new Error(projectUpdateError.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: shouldInsert ? "create" : "update",
    resource: "landing_page_versions",
    resourceId: versionId,
    clientId: project.client_id,
    metadata: { projectId, versionName: draft.versionName, leakageCheckPassed: isolation.passed },
  });

  revalidatePath("/landing-page-factory");
  revalidatePath(`/landing-page-factory/${projectId}`);

  return { versionId: versionId as string };
}

export async function submitVersionForApproval(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const projectId = str(formData, "projectId");
  const versionId = str(formData, "versionId");
  const previewUrl = str(formData, "previewUrl");
  if (!projectId || !versionId) throw new Error("Project and version are required");

  const [{ data: project, error: projectError }, { data: version, error: versionError }, { data: pendingApproval }] = await Promise.all([
    supabase
      .from("landing_page_projects")
      .select("id, client_id, status, preview_url, preview_share_token")
      .eq("id", projectId)
      .single(),
    supabase
      .from("landing_page_versions")
      .select("id, status, client_id, landing_page_project_id, leakage_check_passed, validation_results")
      .eq("id", versionId)
      .single(),
    supabase
      .from("approvals")
      .select("id")
      .eq("subject_type", "landing_page")
      .eq("subject_id", projectId)
      .eq("status", "pending")
      .maybeSingle(),
  ]);
  if (projectError) throw new Error(projectError.message);
  if (versionError) throw new Error(versionError.message);

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update", project.client_id);

  if (project.status !== "internal_approval") {
    throw new Error("Move the page project to internal approval before requesting client approval.");
  }
  if (version.landing_page_project_id !== projectId) {
    throw new Error("That version does not belong to this page project.");
  }
  if (!version.leakage_check_passed) {
    throw new Error("Cross-client validation failed. Resolve the conflicting references before approval.");
  }
  if ((version.validation_results as LandingPageValidationResult[]).some((item) => item.severity === "error")) {
    throw new Error("This version still has blocking validation errors.");
  }
  if (pendingApproval) {
    throw new Error("There is already a pending approval for this page project.");
  }

  const effectivePreviewUrl =
    previewUrl ??
    (project.preview_share_token
      ? buildLandingPagePreviewUrl({
          appUrl: serverEnv.APP_URL,
          projectId,
          versionId,
          previewShareToken: project.preview_share_token,
        })
      : null) ??
    project.preview_url;
  if (!effectivePreviewUrl) {
    throw new Error("A preview URL is required before requesting client approval.");
  }

  const { data: latestQa } = await supabase
    .from("qa_runs")
    .select("overall")
    .eq("landing_page_project_id", projectId)
    .eq("landing_page_version_id", versionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestQa) {
    throw new Error("Record QA for this exact version before requesting client approval.");
  }
  if (latestQa.overall === "fail") {
    throw new Error("The latest QA run for this version failed.");
  }

  const { error: versionUpdateError } = await supabase
    .from("landing_page_versions")
    .update({ status: "submitted" })
    .eq("id", versionId);
  if (versionUpdateError) throw new Error(versionUpdateError.message);

  const { error: approvalError } = await supabase.from("approvals").insert({
    organisation_id: session.organisationId,
    client_id: project.client_id,
    subject_type: "landing_page",
    subject_id: projectId,
    landing_page_version_id: versionId,
    requested_by: session.userId,
    status: "pending",
  });
  if (approvalError) throw new Error(approvalError.message);

  const { error: projectUpdateError } = await supabase
    .from("landing_page_projects")
    .update({
      status: "client_approval",
      preview_url: effectivePreviewUrl,
      submitted_version_id: versionId,
      draft_version_id: null,
    } as never)
    .eq("id", projectId);
  if (projectUpdateError) throw new Error(projectUpdateError.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "landing_page_projects",
    resourceId: projectId,
    clientId: project.client_id,
    metadata: { status: "client_approval", versionId },
  });

  revalidatePath("/landing-page-factory");
  revalidatePath(`/landing-page-factory/${projectId}`);
  revalidatePath("/client-portal");
}

export async function recordPerformanceRecord(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const projectId = str(formData, "projectId");
  const metricDate = str(formData, "metricDate");
  if (!projectId) throw new Error("Project is required");
  if (!metricDate) throw new Error("Metric date is required");

  const { data: project, error: projectError } = await supabase
    .from("landing_page_projects")
    .select("id, client_id")
    .eq("id", projectId)
    .single();
  if (projectError) throw new Error(projectError.message);

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "update", project.client_id);

  const { data: record, error } = await supabase
    .from("landing_page_performance_records")
    .insert({
      organisation_id: session.organisationId,
      client_id: project.client_id,
      landing_page_project_id: projectId,
      landing_page_version_id: str(formData, "versionId"),
      campaign_id: str(formData, "campaignId"),
      experiment_id: str(formData, "experimentId"),
      metric_date: metricDate,
      visits: Number(str(formData, "visits") ?? "0"),
      leads: Number(str(formData, "leads") ?? "0"),
      qualified_leads: Number(str(formData, "qualifiedLeads") ?? "0"),
      bookings: Number(str(formData, "bookings") ?? "0"),
      conversion_rate: str(formData, "conversionRate") ? Number(str(formData, "conversionRate")) : null,
      revenue: Number(str(formData, "revenue") ?? "0"),
      verified_learning: str(formData, "verifiedLearning"),
      source: (str(formData, "source") as "manual" | "campaign_metrics" | "experiment" | "import" | null) ?? "manual",
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "landing_page_performance_records",
    resourceId: record.id,
    clientId: project.client_id,
    metadata: { projectId },
  });

  revalidatePath("/landing-page-factory");
  revalidatePath(`/landing-page-factory/${projectId}`);
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
  const provider = deploymentProviderFrom(str(formData, "provider"));
  if (!projectId) throw new Error("Project is required");

  const { data: project, error: fetchError } = await supabase
    .from("landing_page_projects")
    .select("id, name, status, client_id, created_by, submitted_version_id, published_version_id")
    .eq("id", projectId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "approve", project.client_id);

  if (!project.submitted_version_id) {
    throw new Error("No submitted version is attached to this page project.");
  }

  const [{ data: latestQa }, { data: approval }, { data: submittedVersion, error: submittedVersionError }] = await Promise.all([
    supabase
      .from("qa_runs")
      .select("overall, landing_page_version_id")
      .eq("landing_page_project_id", projectId)
      .eq("landing_page_version_id", project.submitted_version_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("approvals")
      .select("status, landing_page_version_id")
      .eq("subject_type", "landing_page")
      .eq("subject_id", projectId)
      .eq("landing_page_version_id", project.submitted_version_id)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("landing_page_versions")
      .select("id, slug")
      .eq("id", project.submitted_version_id)
      .eq("landing_page_project_id", projectId)
      .single(),
  ]);
  if (submittedVersionError) throw new Error(submittedVersionError.message);

  const gate = canPublishLandingPage({
    projectStatus: project.status,
    latestQaOverall: latestQa?.overall ?? null,
    clientApproved: Boolean(approval),
    submittedVersionId: project.submitted_version_id,
    latestQaVersionId: latestQa?.landing_page_version_id ?? null,
    approvedVersionId: approval?.landing_page_version_id ?? null,
  });
  if (!gate.allowed) {
    throw new Error(`Publish blocked: ${gate.reasons.join(" ")}`);
  }

  const effectiveProductionUrl =
    productionUrl ??
    buildLandingPageProductionUrl({
      appUrl: serverEnv.APP_URL,
      projectId,
      slug: submittedVersion.slug,
    });

  if (project.published_version_id && project.published_version_id !== project.submitted_version_id) {
    await supabase
      .from("landing_page_versions")
      .update({ status: "archived" })
      .eq("id", project.published_version_id);
  }

  const { error } = await supabase
    .from("landing_page_projects")
    .update({
      status: "published",
      production_url: effectiveProductionUrl,
      published_version_id: project.submitted_version_id,
    } as never)
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  if (project.submitted_version_id) {
    await supabase
      .from("landing_page_versions")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", project.submitted_version_id);
  }

  await supabase.from("deployments").insert({
    organisation_id: session.organisationId,
    landing_page_project_id: projectId,
    landing_page_version_id: project.submitted_version_id,
    environment: "production",
    provider,
    url: effectiveProductionUrl,
    status: "succeeded",
    deployment_kind: "publish",
    triggered_by: session.userId,
  });

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "external_action",
    resource: "landing_page_projects",
    resourceId: projectId,
    clientId: project.client_id,
    metadata: { published: true, productionUrl: effectiveProductionUrl, provider },
  });

  // Automation: deployment succeeded → notify the project owner.
  if (project.created_by && (await isRuleEnabled(supabase, session.organisationId, "page_published_notify"))) {
    if (await recordRun(supabase, session.organisationId, "page_published_notify", projectId, `Publish notification for ${project.name}`)) {
      await notifyUsers(supabase, session.organisationId, [project.created_by], {
        title: `Published: ${project.name}`,
        body: `Live at ${effectiveProductionUrl}`,
        href: "/landing-page-factory",
        clientId: project.client_id,
      });
    }
  }

  revalidatePath("/landing-page-factory");
  revalidatePath(`/landing-page-factory/${projectId}`);
  revalidatePath("/client-portal");
}

export async function rollbackPublishedVersion(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const projectId = str(formData, "projectId");
  const versionId = str(formData, "versionId");
  const productionUrl = str(formData, "productionUrl");
  const provider = deploymentProviderFrom(str(formData, "provider"));
  if (!projectId || !versionId) throw new Error("Project and version are required");

  const [{ data: project, error: projectError }, { data: version, error: versionError }] = await Promise.all([
    supabase
      .from("landing_page_projects")
      .select("id, client_id, published_version_id, production_url")
      .eq("id", projectId)
      .single(),
    supabase
      .from("landing_page_versions")
      .select("id, landing_page_project_id")
      .eq("id", versionId)
      .single(),
  ]);
  if (projectError) throw new Error(projectError.message);
  if (versionError) throw new Error(versionError.message);

  await requirePermission(supabase, session.organisationId, "landing_page_factory", "approve", project.client_id);

  if (version.landing_page_project_id !== projectId) {
    throw new Error("That version does not belong to this page project.");
  }

  const effectiveProductionUrl = productionUrl ?? project.production_url;
  if (!effectiveProductionUrl) {
    throw new Error("A production URL is required to record the rollback.");
  }

  if (project.published_version_id && project.published_version_id !== versionId) {
    await supabase
      .from("landing_page_versions")
      .update({ status: "archived" })
      .eq("id", project.published_version_id);
  }

  await supabase
    .from("landing_page_versions")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", versionId);

  const { error } = await supabase
    .from("landing_page_projects")
    .update({
      status: "published",
      production_url: effectiveProductionUrl,
      published_version_id: versionId,
      submitted_version_id: versionId,
    } as never)
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  await supabase.from("deployments").insert({
    organisation_id: session.organisationId,
    landing_page_project_id: projectId,
    landing_page_version_id: versionId,
    environment: "production",
    provider,
    url: effectiveProductionUrl,
    status: "succeeded",
    deployment_kind: "rollback",
    triggered_by: session.userId,
  });

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "external_action",
    resource: "landing_page_projects",
    resourceId: projectId,
    clientId: project.client_id,
    metadata: { rollbackVersionId: versionId, productionUrl: effectiveProductionUrl, provider },
  });

  revalidatePath("/landing-page-factory");
  revalidatePath(`/landing-page-factory/${projectId}`);
}
