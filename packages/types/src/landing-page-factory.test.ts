import { describe, expect, it } from "vitest";
import {
  buildLandingPageSectionsFromReusableComponents,
  buildLandingPageTemplateDraftFromComponents,
  mapLandingPageSectionKindToReusableCategory,
  normaliseLandingPageDraft,
  validateLandingPageClientIsolation,
} from "./landing-page-factory";

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

describe("reusable component helpers", () => {
  it("maps landing page section kinds to reusable component categories without lossy fallbacks", () => {
    expect(mapLandingPageSectionKindToReusableCategory("hero")).toBe("hero");
    expect(mapLandingPageSectionKindToReusableCategory("process")).toBe("process");
    expect(mapLandingPageSectionKindToReusableCategory("final_cta")).toBe("final_cta");
  });

  it("orders reusable components into a sensible landing page flow", () => {
    const sections = buildLandingPageSectionsFromReusableComponents([
      {
        id: "final",
        name: "Final CTA",
        category: "final_cta",
        sectionPayload: { id: "final", kind: "final_cta", label: "Final CTA" },
      },
      {
        id: "hero",
        name: "Hero",
        category: "hero",
        sectionPayload: { id: "hero", kind: "hero", label: "Hero" },
      },
      {
        id: "offer",
        name: "Offer",
        category: "offer",
        sectionPayload: { id: "offer", kind: "offer", label: "Offer" },
      },
    ]);

    expect(sections.map((section) => section.kind)).toEqual(["hero", "offer", "final_cta"]);
  });

  it("deduplicates section ids when reusable components would collide", () => {
    const sections = buildLandingPageSectionsFromReusableComponents([
      {
        id: "hero-a",
        name: "Hero A",
        category: "hero",
        sectionPayload: { id: "hero", kind: "hero", label: "Hero A" },
      },
      {
        id: "hero-b",
        name: "Hero B",
        category: "hero",
        sectionPayload: { id: "hero", kind: "hero", label: "Hero B" },
      },
    ]);

    expect(sections[0]?.id).toBe("hero");
    expect(sections[1]?.id).toBe("hero-2");
  });

  it("builds a reusable template draft from approved components", () => {
    const draft = buildLandingPageTemplateDraftFromComponents({
      templateName: "Component Stack",
      components: [
        {
          id: "hero",
          name: "Hero",
          category: "hero",
          sectionPayload: {
            id: "hero",
            kind: "hero",
            label: "Hero",
            headline: "Strong headline",
            ctaLabel: "Book now",
          },
        },
        {
          id: "faq",
          name: "FAQ",
          category: "faq",
          sectionPayload: {
            id: "faq",
            kind: "faq",
            label: "FAQ",
            body: "Frequently asked questions",
          },
        },
      ],
    });

    expect(draft.templateKey).toBe("component_stack");
    expect(draft.sections.map((section) => section.kind)).toEqual(["hero", "faq"]);
    expect(draft.form.submitLabel).toBe("Book now");
    expect(draft.notes).toContain("approved reusable components");
  });
});
