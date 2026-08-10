import { describe, expect, it } from "vitest";
import { normaliseLandingPageDraft, validateLandingPageClientIsolation } from "./landing-page-factory";

describe("normaliseLandingPageDraft", () => {
  it("fills optional landing page draft fields with safe defaults", () => {
    const draft = normaliseLandingPageDraft({
      templateKey: "lip-blush-conversion",
      templateName: "Lip Blush Conversion",
      versionName: "Version 1",
      title: "Lip Blush Northern Virginia",
      slug: "lip-blush-northern-virginia",
      theme: {
        brandName: "Sample Studio",
      },
      sections: [
        {
          id: "hero",
          kind: "hero",
          label: "Hero",
        },
      ],
      form: {},
      tracking: {},
      seo: {
        metaTitle: "Lip Blush",
        metaDescription: "Book a lip blush appointment.",
      },
      social: {},
      sourceContext: {},
    });

    expect(draft.sections[0]?.enabled).toBe(true);
    expect(draft.assetSlots).toEqual([]);
    expect(draft.form.submitLabel).toBe("Reserve my spot");
    expect(draft.tracking.cookieConsentRequired).toBe(true);
  });
});

describe("validateLandingPageClientIsolation", () => {
  it("passes when every referenced record belongs to the selected client", () => {
    const result = validateLandingPageClientIsolation("client-a", [
      { kind: "document", id: "doc-1", clientId: "client-a", label: "Hero image" },
      { kind: "knowledge_entry", id: "kb-1", clientId: "client-a", label: "Approved offer" },
    ]);

    expect(result.passed).toBe(true);
    expect(result.messages).toEqual([]);
  });

  it("allows agency-wide knowledge when the client_id is null", () => {
    const result = validateLandingPageClientIsolation("client-a", [
      { kind: "knowledge_entry", id: "kb-1", clientId: null, label: "Agency CRO playbook" },
    ]);

    expect(result.passed).toBe(true);
  });

  it("fails when a referenced asset belongs to another client", () => {
    const result = validateLandingPageClientIsolation("client-a", [
      { kind: "creative_asset", id: "asset-1", clientId: "client-b", label: "Before and after collage" },
    ]);

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.messages[0]).toContain("different client");
  });

  it("reports every conflicting reference instead of stopping at the first one", () => {
    const result = validateLandingPageClientIsolation("client-a", [
      { kind: "document", id: "doc-1", clientId: "client-b", label: "Pricing sheet" },
      { kind: "knowledge_entry", id: "kb-1", clientId: "client-c", label: "Results proof" },
    ]);

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(2);
  });
});
