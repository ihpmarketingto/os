export interface LandingPagePreviewVersionInput {
  projectStatus: string;
  draftVersionId?: string | null;
  submittedVersionId?: string | null;
  publishedVersionId?: string | null;
}

export interface LandingPageSharedPreviewAccessInput extends LandingPagePreviewVersionInput {
  requestedVersionId: string;
  storedPreviewToken?: string | null;
  providedPreviewToken?: string | null;
}

export interface LandingPagePublishedAccessInput {
  projectStatus: string;
  publishedVersionId?: string | null;
  requestedVersionId: string;
}

export interface LandingPageRuntimeAccessResult {
  allowed: boolean;
  reasons: string[];
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function buildLandingPagePreviewUrl(input: {
  appUrl: string;
  projectId: string;
  versionId: string;
  previewShareToken: string;
}): string {
  const baseUrl = trimTrailingSlash(input.appUrl);
  return `${baseUrl}/lp-preview/${input.projectId}/${input.versionId}?token=${encodeURIComponent(input.previewShareToken)}`;
}

export function buildLandingPageProductionUrl(input: {
  appUrl: string;
  projectId: string;
  slug: string;
}): string {
  const baseUrl = trimTrailingSlash(input.appUrl);
  return `${baseUrl}/lp/${input.projectId}/${input.slug}`;
}

export function resolveLandingPagePreviewVersionId(input: LandingPagePreviewVersionInput): string | null {
  if (input.projectStatus === "published") {
    return input.publishedVersionId ?? input.submittedVersionId ?? input.draftVersionId ?? null;
  }

  if (input.projectStatus === "client_approval" || input.projectStatus === "approved_to_publish") {
    return input.submittedVersionId ?? input.draftVersionId ?? input.publishedVersionId ?? null;
  }

  return input.draftVersionId ?? input.submittedVersionId ?? input.publishedVersionId ?? null;
}

export function canViewSharedLandingPagePreview(
  input: LandingPageSharedPreviewAccessInput,
): LandingPageRuntimeAccessResult {
  const reasons: string[] = [];
  const expectedVersionId = resolveLandingPagePreviewVersionId(input);

  if (!input.storedPreviewToken) {
    reasons.push("This page project does not have a preview share token.");
  } else if (input.providedPreviewToken !== input.storedPreviewToken) {
    reasons.push("The preview share token does not match.");
  }

  if (!expectedVersionId) {
    reasons.push("There is no exact page version available for shared preview.");
  } else if (input.requestedVersionId !== expectedVersionId) {
    reasons.push("The requested preview does not match the page project's current exact version.");
  }

  return { allowed: reasons.length === 0, reasons };
}

export function canViewPublishedLandingPage(
  input: LandingPagePublishedAccessInput,
): LandingPageRuntimeAccessResult {
  const reasons: string[] = [];

  if (input.projectStatus !== "published") {
    reasons.push(`Project is in "${input.projectStatus}", not published.`);
  }

  if (!input.publishedVersionId) {
    reasons.push("No published page version is recorded.");
  } else if (input.requestedVersionId !== input.publishedVersionId) {
    reasons.push("The requested page version is not the currently published version.");
  }

  return { allowed: reasons.length === 0, reasons };
}
