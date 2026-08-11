import { z } from "zod";

export const landingPageSectionKindSchema = z.enum([
  "hero",
  "results",
  "offer",
  "promise",
  "process",
  "testimonials",
  "faq",
  "location",
  "final_cta",
]);
export type LandingPageSectionKind = z.infer<typeof landingPageSectionKindSchema>;

export const reusableComponentCategorySchema = z.enum([
  "hero",
  "navigation",
  "results",
  "offer",
  "promise",
  "pricing",
  "reviews",
  "testimonials",
  "before_after",
  "product",
  "booking",
  "event",
  "speaker",
  "faq",
  "form",
  "trust_bar",
  "process",
  "cta",
  "final_cta",
  "countdown",
  "location",
  "video",
  "footer",
]);
export type ReusableComponentCategory = z.infer<typeof reusableComponentCategorySchema>;

export const landingPageSectionItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().nullable().default(null),
  meta: z.string().nullable().default(null),
});
export type LandingPageSectionItem = z.infer<typeof landingPageSectionItemSchema>;

export const landingPageSectionSchema = z.object({
  id: z.string().min(1),
  kind: landingPageSectionKindSchema,
  label: z.string().min(1),
  enabled: z.boolean().default(true),
  eyebrow: z.string().nullable().default(null),
  headline: z.string().nullable().default(null),
  subheadline: z.string().nullable().default(null),
  body: z.string().nullable().default(null),
  badge: z.string().nullable().default(null),
  ctaLabel: z.string().nullable().default(null),
  ctaHref: z.string().nullable().default(null),
  bullets: z.array(z.string()).default([]),
  items: z.array(landingPageSectionItemSchema).default([]),
  notes: z.string().nullable().default(null),
});
export type LandingPageSection = z.infer<typeof landingPageSectionSchema>;

export const landingPageThemeSchema = z.object({
  brandName: z.string().min(1),
  tagLine: z.string().nullable().default(null),
  primaryColour: z.string().min(1).default("#7d3a46"),
  accentColour: z.string().min(1).default("#d9a68b"),
  surfaceColour: z.string().min(1).default("#fff8f5"),
  textColour: z.string().min(1).default("#22181c"),
  logoLabel: z.string().nullable().default(null),
  urgencyLabel: z.string().nullable().default(null),
});
export type LandingPageTheme = z.infer<typeof landingPageThemeSchema>;

export const landingPageFormSettingsSchema = z.object({
  ctaType: z.enum(["booking_link", "lead_form", "external_checkout"]).default("booking_link"),
  bookingUrl: z.string().nullable().default(null),
  externalCheckoutUrl: z.string().nullable().default(null),
  submitLabel: z.string().min(1).default("Reserve my spot"),
  successMessage: z.string().nullable().default(null),
  collectPhone: z.boolean().default(true),
  collectNotes: z.boolean().default(true),
});
export type LandingPageFormSettings = z.infer<typeof landingPageFormSettingsSchema>;

export const landingPageTrackingSettingsSchema = z.object({
  metaPixelId: z.string().nullable().default(null),
  ga4MeasurementId: z.string().nullable().default(null),
  customEvents: z.array(z.string()).default([]),
  bookingDestinationLabel: z.string().nullable().default(null),
  cookieConsentRequired: z.boolean().default(true),
});
export type LandingPageTrackingSettings = z.infer<typeof landingPageTrackingSettingsSchema>;

export const landingPageSeoSettingsSchema = z.object({
  metaTitle: z.string().min(1),
  metaDescription: z.string().min(1),
  canonicalUrl: z.string().nullable().default(null),
  ogTitle: z.string().nullable().default(null),
  ogDescription: z.string().nullable().default(null),
});
export type LandingPageSeoSettings = z.infer<typeof landingPageSeoSettingsSchema>;

export const landingPageSocialSettingsSchema = z.object({
  ogImageDocumentId: z.string().uuid().nullable().default(null),
  socialProofLabel: z.string().nullable().default(null),
  shareHeadline: z.string().nullable().default(null),
});
export type LandingPageSocialSettings = z.infer<typeof landingPageSocialSettingsSchema>;

export const landingPageAssetSlotSchema = z.object({
  slot: z.string().min(1),
  label: z.string().min(1),
  documentId: z.string().uuid().nullable().default(null),
  creativeAssetId: z.string().uuid().nullable().default(null),
  altText: z.string().nullable().default(null),
});
export type LandingPageAssetSlot = z.infer<typeof landingPageAssetSlotSchema>;

export const landingPageSourceContextSchema = z.object({
  brandVoiceIds: z.array(z.string().uuid()).default([]),
  offerIds: z.array(z.string().uuid()).default([]),
  audienceIds: z.array(z.string().uuid()).default([]),
  restrictionIds: z.array(z.string().uuid()).default([]),
  proofIds: z.array(z.string().uuid()).default([]),
});
export type LandingPageSourceContext = z.infer<typeof landingPageSourceContextSchema>;

export const landingPageValidationResultSchema = z.object({
  scope: z.enum(["asset", "knowledge", "approval", "qa", "publish"]),
  severity: z.enum(["info", "warning", "error"]),
  message: z.string().min(1),
});
export type LandingPageValidationResult = z.infer<typeof landingPageValidationResultSchema>;

export const landingPageDraftSchema = z.object({
  templateKey: z.string().min(1),
  templateName: z.string().min(1),
  versionName: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  subdomain: z.string().nullable().default(null),
  domain: z.string().nullable().default(null),
  theme: landingPageThemeSchema,
  sections: z.array(landingPageSectionSchema).min(1),
  form: landingPageFormSettingsSchema,
  tracking: landingPageTrackingSettingsSchema,
  seo: landingPageSeoSettingsSchema,
  social: landingPageSocialSettingsSchema,
  assetSlots: z.array(landingPageAssetSlotSchema).default([]),
  sourceContext: landingPageSourceContextSchema,
  notes: z.string().nullable().default(null),
});
export type LandingPageDraft = z.infer<typeof landingPageDraftSchema>;

export function normaliseLandingPageDraft(input: unknown): LandingPageDraft {
  return landingPageDraftSchema.parse(input);
}

export interface ClientIsolationReference {
  kind: "document" | "creative_asset" | "knowledge_entry";
  id: string;
  clientId: string | null;
  label: string;
}

export interface ClientIsolationViolation {
  id: string;
  kind: ClientIsolationReference["kind"];
  label: string;
  actualClientId: string | null;
}

export interface ClientIsolationResult {
  passed: boolean;
  violations: ClientIsolationViolation[];
  messages: string[];
}

export interface ReusableLandingPageComponentInput {
  id: string;
  name: string;
  category: ReusableComponentCategory;
  sectionPayload: unknown;
}

const SECTION_KIND_TO_REUSABLE_CATEGORY: Record<LandingPageSectionKind, ReusableComponentCategory> = {
  hero: "hero",
  results: "results",
  offer: "offer",
  promise: "promise",
  process: "process",
  testimonials: "testimonials",
  faq: "faq",
  location: "location",
  final_cta: "final_cta",
};

const LANDING_PAGE_COMPONENT_ORDER: ReusableComponentCategory[] = [
  "navigation",
  "hero",
  "results",
  "before_after",
  "offer",
  "pricing",
  "promise",
  "product",
  "reviews",
  "testimonials",
  "trust_bar",
  "process",
  "faq",
  "video",
  "speaker",
  "event",
  "location",
  "form",
  "booking",
  "cta",
  "final_cta",
  "countdown",
  "footer",
];

const LANDING_PAGE_COMPONENT_ORDER_INDEX = new Map(
  LANDING_PAGE_COMPONENT_ORDER.map((category, index) => [category, index]),
);

export function validateLandingPageClientIsolation(
  expectedClientId: string,
  refs: ClientIsolationReference[],
): ClientIsolationResult {
  const violations = refs
    .filter((ref) => ref.clientId !== null && ref.clientId !== expectedClientId)
    .map((ref) => ({
      id: ref.id,
      kind: ref.kind,
      label: ref.label,
      actualClientId: ref.clientId,
    }));

  const messages = violations.map(
    (violation) =>
      `${violation.kind.replace(/_/g, " ")} "${violation.label}" belongs to a different client and cannot be used in this page.`,
  );

  return {
    passed: violations.length === 0,
    violations,
    messages,
  };
}

export function mapLandingPageSectionKindToReusableCategory(
  kind: LandingPageSectionKind,
): ReusableComponentCategory {
  return SECTION_KIND_TO_REUSABLE_CATEGORY[kind];
}

export function sortReusableComponentInputsForTemplate<T extends { category: ReusableComponentCategory; name: string }>(
  components: T[],
): T[] {
  return [...components].sort((left, right) => {
    const leftIndex = LANDING_PAGE_COMPONENT_ORDER_INDEX.get(left.category) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = LANDING_PAGE_COMPONENT_ORDER_INDEX.get(right.category) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.name.localeCompare(right.name);
  });
}

function slugifyTemplateValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "landing-page-template";
}

export function buildLandingPageSectionsFromReusableComponents(
  components: ReusableLandingPageComponentInput[],
): LandingPageSection[] {
  const ordered = sortReusableComponentInputsForTemplate(components);
  const usedIds = new Set<string>();

  return ordered.map((component, index) => {
    const parsed = landingPageSectionSchema.parse(component.sectionPayload);
    const baseId = parsed.id.trim() || `${slugifyTemplateValue(component.name)}-${index + 1}`;
    let nextId = baseId;
    let suffix = 2;

    while (usedIds.has(nextId)) {
      nextId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(nextId);

    return {
      ...parsed,
      id: nextId,
      label: parsed.label || component.name,
    };
  });
}

export function buildLandingPageTemplateDraftFromComponents(input: {
  templateName: string;
  components: ReusableLandingPageComponentInput[];
}): LandingPageDraft {
  const sections = buildLandingPageSectionsFromReusableComponents(input.components);
  const slug = slugifyTemplateValue(input.templateName);
  const firstHeadline = sections.find((section) => section.headline)?.headline ?? input.templateName;
  const firstBody =
    sections.find((section) => section.body)?.body ??
    "Reusable landing page template assembled from approved components.";
  const primaryCta =
    sections.find((section) => section.ctaLabel)?.ctaLabel ??
    "Book now";

  return normaliseLandingPageDraft({
    templateKey: slug.replace(/-/g, "_"),
    templateName: input.templateName,
    versionName: "Version 1",
    title: `${input.templateName} page`,
    slug,
    subdomain: null,
    domain: null,
    theme: {
      brandName: "Template brand",
      tagLine: null,
      primaryColour: "#7d3a46",
      accentColour: "#d9a68b",
      surfaceColour: "#fff8f5",
      textColour: "#22181c",
      logoLabel: "Template brand",
      urgencyLabel: "Replace with client urgency",
    },
    sections,
    form: {
      ctaType: "booking_link",
      bookingUrl: null,
      externalCheckoutUrl: null,
      submitLabel: primaryCta,
      successMessage: "Thanks for your interest.",
      collectPhone: true,
      collectNotes: true,
    },
    tracking: {
      metaPixelId: null,
      ga4MeasurementId: null,
      customEvents: [],
      bookingDestinationLabel: null,
      cookieConsentRequired: true,
    },
    seo: {
      metaTitle: input.templateName,
      metaDescription: firstBody,
      canonicalUrl: null,
      ogTitle: firstHeadline,
      ogDescription: firstBody,
    },
    social: {
      ogImageDocumentId: null,
      socialProofLabel: null,
      shareHeadline: firstHeadline,
    },
    assetSlots: [],
    sourceContext: {
      brandVoiceIds: [],
      offerIds: [],
      audienceIds: [],
      restrictionIds: [],
      proofIds: [],
    },
    notes: "Built from approved reusable components.",
  });
}
