import { describe, expect, it } from "vitest";
import {
  buildLandingPagePreviewUrl,
  buildLandingPageProductionUrl,
  canViewPublishedLandingPage,
  canViewSharedLandingPagePreview,
  resolveLandingPagePreviewVersionId,
} from "./landing-page-runtime";

describe("landing page runtime URLs", () => {
  it("builds native preview URLs without duplicating slashes", () => {
    expect(
      buildLandingPagePreviewUrl({
        appUrl: "https://os-ihp1.vercel.app/",
        projectId: "project-1",
        versionId: "version-2",
        previewShareToken: "token-3",
      }),
    ).toBe("https://os-ihp1.vercel.app/lp-preview/project-1/version-2?token=token-3");
  });

  it("builds native production URLs without duplicating slashes", () => {
    expect(
      buildLandingPageProductionUrl({
        appUrl: "https://os-ihp1.vercel.app/",
        projectId: "project-1",
        slug: "lip-blush-northern-virginia",
      }),
    ).toBe("https://os-ihp1.vercel.app/lp/project-1/lip-blush-northern-virginia");
  });
});

describe("resolveLandingPagePreviewVersionId", () => {
  it("prefers the draft version while a page is still being worked on", () => {
    expect(
      resolveLandingPagePreviewVersionId({
        projectStatus: "preview",
        draftVersionId: "version-draft",
        submittedVersionId: "version-submitted",
        publishedVersionId: "version-live",
      }),
    ).toBe("version-draft");
  });

  it("locks shared previews to the submitted version during approval", () => {
    expect(
      resolveLandingPagePreviewVersionId({
        projectStatus: "approved_to_publish",
        draftVersionId: "version-draft",
        submittedVersionId: "version-submitted",
        publishedVersionId: "version-live",
      }),
    ).toBe("version-submitted");
  });

  it("falls back to the published version for live projects", () => {
    expect(
      resolveLandingPagePreviewVersionId({
        projectStatus: "published",
        draftVersionId: null,
        submittedVersionId: null,
        publishedVersionId: "version-live",
      }),
    ).toBe("version-live");
  });
});

describe("canViewSharedLandingPagePreview", () => {
  it("allows the current exact preview version when the token matches", () => {
    expect(
      canViewSharedLandingPagePreview({
        projectStatus: "client_approval",
        draftVersionId: "version-draft",
        submittedVersionId: "version-submitted",
        publishedVersionId: null,
        requestedVersionId: "version-submitted",
        storedPreviewToken: "token-1",
        providedPreviewToken: "token-1",
      }),
    ).toEqual({ allowed: true, reasons: [] });
  });

  it("blocks mismatched preview tokens", () => {
    const result = canViewSharedLandingPagePreview({
      projectStatus: "preview",
      draftVersionId: "version-draft",
      submittedVersionId: null,
      publishedVersionId: null,
      requestedVersionId: "version-draft",
      storedPreviewToken: "token-1",
      providedPreviewToken: "token-2",
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("token");
  });

  it("blocks preview URLs that point at an older exact version", () => {
    const result = canViewSharedLandingPagePreview({
      projectStatus: "internal_approval",
      draftVersionId: "version-2",
      submittedVersionId: null,
      publishedVersionId: null,
      requestedVersionId: "version-1",
      storedPreviewToken: "token-1",
      providedPreviewToken: "token-1",
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("current exact version");
  });
});

describe("canViewPublishedLandingPage", () => {
  it("allows the current published version only", () => {
    expect(
      canViewPublishedLandingPage({
        projectStatus: "published",
        publishedVersionId: "version-live",
        requestedVersionId: "version-live",
      }),
    ).toEqual({ allowed: true, reasons: [] });
  });

  it("blocks non-published project states", () => {
    const result = canViewPublishedLandingPage({
      projectStatus: "approved_to_publish",
      publishedVersionId: "version-live",
      requestedVersionId: "version-live",
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("not published");
  });

  it("blocks older versions after a new one is published", () => {
    const result = canViewPublishedLandingPage({
      projectStatus: "published",
      publishedVersionId: "version-2",
      requestedVersionId: "version-1",
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("currently published version");
  });
});
