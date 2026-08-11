import "server-only";
import type { Metadata } from "next";
import type { Database } from "@ihp/database";
import {
  buildLandingPagePreviewUrl,
  buildLandingPageProductionUrl,
  canViewPublishedLandingPage,
  canViewSharedLandingPagePreview,
  normaliseLandingPageDraft,
  type LandingPageDraft,
} from "@ihp/types";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type LandingPageProjectRow = Database["public"]["Tables"]["landing_page_projects"]["Row"];
type LandingPageVersionRow = Database["public"]["Tables"]["landing_page_versions"]["Row"];

export interface LandingPageRuntimeAssetSource {
  id: string;
  kind: "document" | "creative";
  name: string;
  previewUrl: string | null;
  mimeType: string | null;
}

export interface LandingPageRuntimeData {
  project: LandingPageProjectRow;
  version: LandingPageVersionRow;
  draft: LandingPageDraft;
  assetSources: LandingPageRuntimeAssetSource[];
}

function looksLikeImage(mimeType: string | null | undefined, path: string): boolean {
  if (mimeType?.startsWith("image/")) return true;
  if (mimeType) return false;
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(path);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function normaliseStoredVersion(version: LandingPageVersionRow): LandingPageDraft {
  return normaliseLandingPageDraft({
    templateKey: version.template_key,
    templateName: version.template_name,
    versionName: version.version_name,
    title: version.title,
    slug: version.slug,
    subdomain: version.subdomain,
    domain: version.domain,
    theme: version.theme_settings,
    sections: version.sections,
    form: version.form_settings,
    tracking: version.tracking_settings,
    seo: version.seo_settings,
    social: version.social_settings,
    assetSlots: version.asset_slots,
    sourceContext: version.source_context,
    notes: null,
  });
}

async function signStoragePaths(
  paths: string[],
  bucket: "documents" | "creative",
): Promise<Map<string, string>> {
  const admin = getSupabaseAdminClient();
  const signedEntries = await Promise.all(
    paths.map(async (path) => {
      const { data } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
      return [path, data?.signedUrl ?? null] as const;
    }),
  );

  return new Map(signedEntries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
}

async function loadAssetSources(
  clientId: string,
  draft: LandingPageDraft,
): Promise<LandingPageRuntimeAssetSource[]> {
  const admin = getSupabaseAdminClient();
  const documentIds = uniqueStrings(draft.assetSlots.map((slot) => slot.documentId));
  const creativeAssetIds = uniqueStrings(draft.assetSlots.map((slot) => slot.creativeAssetId));

  const [{ data: documents }, { data: creativeAssets }] = await Promise.all([
    documentIds.length > 0
      ? admin
          .from("documents")
          .select("id, name, file_type, storage_path")
          .eq("client_id", clientId)
          .in("id", documentIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; file_type: string | null; storage_path: string }> }),
    creativeAssetIds.length > 0
      ? admin
          .from("creative_assets")
          .select("id, name, mime_type, storage_path")
          .eq("client_id", clientId)
          .in("id", creativeAssetIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; mime_type: string | null; storage_path: string }> }),
  ]);

  const documentPreviewPaths = (documents ?? [])
    .filter((doc) => looksLikeImage(doc.file_type, doc.storage_path))
    .map((doc) => doc.storage_path);
  const creativePreviewPaths = (creativeAssets ?? [])
    .filter((asset) => looksLikeImage(asset.mime_type, asset.storage_path))
    .map((asset) => asset.storage_path);

  const [signedDocuments, signedCreative] = await Promise.all([
    documentPreviewPaths.length > 0 ? signStoragePaths(documentPreviewPaths, "documents") : Promise.resolve(new Map<string, string>()),
    creativePreviewPaths.length > 0 ? signStoragePaths(creativePreviewPaths, "creative") : Promise.resolve(new Map<string, string>()),
  ]);

  return [
    ...(documents ?? []).map((doc) => ({
      id: doc.id,
      kind: "document" as const,
      name: doc.name,
      previewUrl: signedDocuments.get(doc.storage_path) ?? null,
      mimeType: doc.file_type,
    })),
    ...(creativeAssets ?? []).map((asset) => ({
      id: asset.id,
      kind: "creative" as const,
      name: asset.name,
      previewUrl: signedCreative.get(asset.storage_path) ?? null,
      mimeType: asset.mime_type,
    })),
  ];
}

export function createNativeLandingPagePreviewUrl(
  projectId: string,
  versionId: string,
  previewShareToken: string,
): string {
  return buildLandingPagePreviewUrl({
    appUrl: serverEnv.APP_URL,
    projectId,
    versionId,
    previewShareToken,
  });
}

export function createNativeLandingPageProductionUrl(projectId: string, slug: string): string {
  return buildLandingPageProductionUrl({
    appUrl: serverEnv.APP_URL,
    projectId,
    slug,
  });
}

export async function loadSharedLandingPagePreview(input: {
  projectId: string;
  versionId: string;
  previewToken: string | null;
}): Promise<LandingPageRuntimeData | null> {
  const admin = getSupabaseAdminClient();
  const [{ data: project }, { data: version }] = await Promise.all([
    admin
      .from("landing_page_projects")
      .select(
        "id, organisation_id, client_id, brief_id, project_id, name, generation_mode, reference_build_project_id, draft_version_id, submitted_version_id, published_version_id, preview_share_token, repository_url, branch, preview_url, production_url, status, notes, created_by, created_at, updated_at, deleted_at",
      )
      .eq("id", input.projectId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("landing_page_versions")
      .select(
        "id, organisation_id, client_id, landing_page_project_id, template_id, template_key, template_name, version_number, version_name, status, title, slug, subdomain, domain, theme_settings, sections, form_settings, tracking_settings, seo_settings, social_settings, asset_slots, source_context, validation_results, leakage_check_passed, source_ai_run_id, created_by, approved_at, published_at, created_at, updated_at, deleted_at",
      )
      .eq("id", input.versionId)
      .eq("landing_page_project_id", input.projectId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (!project || !version) return null;

  const access = canViewSharedLandingPagePreview({
    projectStatus: project.status,
    draftVersionId: project.draft_version_id,
    submittedVersionId: project.submitted_version_id,
    publishedVersionId: project.published_version_id,
    requestedVersionId: version.id,
    storedPreviewToken: project.preview_share_token,
    providedPreviewToken: input.previewToken,
  });
  if (!access.allowed) return null;

  const draft = normaliseStoredVersion(version);
  const assetSources = await loadAssetSources(project.client_id, draft);

  return {
    project,
    version,
    draft,
    assetSources,
  };
}

async function loadPublishedLandingPageRecord(input: {
  projectId: string;
  slug: string;
}): Promise<{ project: LandingPageProjectRow; version: LandingPageVersionRow } | null> {
  const admin = getSupabaseAdminClient();
  const { data: project } = await admin
    .from("landing_page_projects")
    .select(
      "id, organisation_id, client_id, brief_id, project_id, name, generation_mode, reference_build_project_id, draft_version_id, submitted_version_id, published_version_id, preview_share_token, repository_url, branch, preview_url, production_url, status, notes, created_by, created_at, updated_at, deleted_at",
    )
    .eq("id", input.projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!project || !project.published_version_id) return null;

  const { data: version } = await admin
    .from("landing_page_versions")
    .select(
      "id, organisation_id, client_id, landing_page_project_id, template_id, template_key, template_name, version_number, version_name, status, title, slug, subdomain, domain, theme_settings, sections, form_settings, tracking_settings, seo_settings, social_settings, asset_slots, source_context, validation_results, leakage_check_passed, source_ai_run_id, created_by, approved_at, published_at, created_at, updated_at, deleted_at",
    )
    .eq("id", project.published_version_id)
    .eq("landing_page_project_id", input.projectId)
    .eq("slug", input.slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (!version) return null;

  const access = canViewPublishedLandingPage({
    projectStatus: project.status,
    publishedVersionId: project.published_version_id,
    requestedVersionId: version.id,
  });
  if (!access.allowed) return null;

  return { project, version };
}

export async function loadPublishedLandingPage(input: {
  projectId: string;
  slug: string;
}): Promise<LandingPageRuntimeData | null> {
  const record = await loadPublishedLandingPageRecord(input);
  if (!record) return null;

  const draft = normaliseStoredVersion(record.version);
  const assetSources = await loadAssetSources(record.project.client_id, draft);

  return {
    project: record.project,
    version: record.version,
    draft,
    assetSources,
  };
}

export async function loadPublishedLandingPageMetadata(input: {
  projectId: string;
  slug: string;
}): Promise<Metadata | null> {
  const record = await loadPublishedLandingPageRecord(input);
  if (!record) return null;

  const draft = normaliseStoredVersion(record.version);
  const canonicalUrl =
    draft.seo.canonicalUrl ??
    record.project.production_url ??
    createNativeLandingPageProductionUrl(record.project.id, record.version.slug);

  return {
    title: draft.seo.metaTitle,
    description: draft.seo.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: draft.seo.ogTitle ?? draft.seo.metaTitle,
      description: draft.seo.ogDescription ?? draft.seo.metaDescription,
      url: canonicalUrl,
    },
  };
}
