import {
  type LandingPageDraft,
  normaliseLandingPageDraft,
} from "@ihp/types";
import { slugify } from "@/lib/utils";

export interface TemplatePresetOption {
  key: string;
  name: string;
  description: string;
}

export interface LandingPageClientSnapshot {
  id: string;
  name: string;
  website: string | null;
  brand_kit: unknown;
}

export interface LandingPageBriefSnapshot {
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
}

export interface LandingPageCampaignSnapshot {
  id: string;
  name: string;
  objective: string | null;
  offer: string | null;
  audience: string | null;
  channels: string[];
  kpis: string | null;
  results: string | null;
  learnings: string | null;
}

export const LANDING_PAGE_TEMPLATE_PRESETS: TemplatePresetOption[] = [
  {
    key: "lip_blush_conversion",
    name: "Lip Blush Conversion",
    description:
      "Inspired by the first Lip Blush reference page: urgency-led hero, proof, promise, booking steps, FAQs, trust, and repeated conversion CTAs.",
  },
];

export function buildPresetSkeleton(presetKey: string): LandingPageDraft {
  return buildDraftFromPreset({
    presetKey,
    client: {
      id: "template-client",
      name: "Template brand",
      website: "https://example.com",
      brand_kit: {},
    },
    brief: {
      id: "template-brief",
      title: "Template landing page",
      offer: "Explain the offer clearly and make the next step obvious.",
      audience: "The audience this page is built for",
      goal: "What conversion should happen on the page",
      conversion_action: "Booked appointment",
      main_cta: "Book now",
      secondary_cta: "See the details",
      traffic_source: "Paid social",
      price: "$000",
      promotion: "Use this area for urgency or a limited-time offer.",
      deadline: null,
      booking_link: "https://example.com/book",
      testimonials: "Add approved testimonial one. Add approved testimonial two.",
      objections: "Time, trust, and price are common objections to handle.",
      proof_points: "Add approved proof point one. Add approved proof point two.",
      differentiators: "Add what makes this offer different.",
      required_claims: "Add any reviewed claims that must appear.",
      forbidden_claims: "Add claims that must never appear.",
      required_disclaimer: "Add a required disclaimer if one applies.",
      brand_direction: "Warm, polished, confidence-building copy.",
      required_tracking: "GA4, Meta Pixel, booking conversion",
      launch_date: null,
    },
    campaign: null,
  });
}

function splitNotes(input: string | null | undefined): string[] {
  return (input ?? "")
    .split(/\n|•|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickBrandColour(brandKit: unknown, keys: string[], fallback: string): string {
  if (!brandKit || typeof brandKit !== "object") return fallback;
  for (const key of keys) {
    const value = (brandKit as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function humaniseChannels(channels: string[] | null | undefined): string {
  if (!channels || channels.length === 0) return "your traffic mix";
  return channels.map((channel) => channel.replace(/_/g, " ")).join(", ");
}

function buildFaqItems(brief: LandingPageBriefSnapshot) {
  const depositCopy = brief.promotion
    ? `${brief.promotion}.`
    : "Your deposit is applied to the total service cost.";

  return [
    {
      id: "faq-deposit",
      title: "How does the deposit work?",
      body: depositCopy,
      meta: null,
    },
    {
      id: "faq-balance",
      title: "When is the remaining balance due?",
      body: "The remaining balance is paid at the appointment or booking destination shown on the page.",
      meta: null,
    },
    {
      id: "faq-reschedule",
      title: "Can I reschedule?",
      body: "Yes. Final scheduling and reschedule policies are set by the client and should be confirmed before publishing.",
      meta: null,
    },
  ];
}

function buildProcessItems(brief: LandingPageBriefSnapshot) {
  return [
    {
      id: "process-1",
      title: "Review the offer",
      body: brief.offer,
      meta: null,
    },
    {
      id: "process-2",
      title: "See the proof",
      body: "Review approved claims, before-and-after examples, and the expected outcome before you book.",
      meta: null,
    },
    {
      id: "process-3",
      title: "Reserve your spot",
      body: brief.booking_link
        ? "Use the linked booking destination or lead form to reserve your appointment."
        : "Use the configured lead form or booking destination to reserve your appointment.",
      meta: null,
    },
    {
      id: "process-4",
      title: "Confirm the plan before delivery",
      body: "Approval-based delivery stays explicit, so the visitor understands what happens before anything becomes final.",
      meta: null,
    },
  ];
}

function buildProofItems(brief: LandingPageBriefSnapshot, campaign: LandingPageCampaignSnapshot | null) {
  const points = [
    ...splitNotes(brief.proof_points),
    ...splitNotes(campaign?.results),
    ...splitNotes(campaign?.learnings),
  ].slice(0, 4);

  if (points.length > 0) {
    return points.map((point, index) => ({
      id: `proof-${index + 1}`,
      title: point,
      body: null,
      meta: null,
    }));
  }

  return [
    {
      id: "proof-default-1",
      title: "Approved client proof goes here",
      body: "Use this section for reviewed outcomes, testimonials, or before-and-after summaries that belong to the selected client.",
      meta: null,
    },
  ];
}

function buildTestimonialItems(brief: LandingPageBriefSnapshot) {
  const quotes = splitNotes(brief.testimonials).slice(0, 3);
  if (quotes.length > 0) {
    return quotes.map((quote, index) => ({
      id: `testimonial-${index + 1}`,
      title: quote,
      body: "Approved testimonial",
      meta: null,
    }));
  }

  return [
    {
      id: "testimonial-default-1",
      title: "Add an approved testimonial here.",
      body: "Use only proof that belongs to the selected client or agency-wide approved material.",
      meta: null,
    },
  ];
}

export function buildDraftFromPreset(input: {
  presetKey: string;
  client: LandingPageClientSnapshot;
  brief: LandingPageBriefSnapshot;
  campaign: LandingPageCampaignSnapshot | null;
}): LandingPageDraft {
  const { client, brief, campaign } = input;
  const title = brief.title || `${client.name} landing page`;
  const slug = slugify(title);
  const proofItems = buildProofItems(brief, campaign);
  const testimonialItems = buildTestimonialItems(brief);
  const primaryColour = pickBrandColour(client.brand_kit, ["primaryColour", "primary_color", "primary"], "#7d3a46");
  const accentColour = pickBrandColour(client.brand_kit, ["accentColour", "accent_color", "accent"], "#d9a68b");
  const surfaceColour = pickBrandColour(client.brand_kit, ["surfaceColour", "surface_color", "background"], "#fff8f5");
  const textColour = pickBrandColour(client.brand_kit, ["textColour", "text_color", "foreground"], "#22181c");
  const urgencyLabel = brief.deadline
    ? `Offer active until ${brief.deadline}`
    : brief.launch_date
      ? `Launch target ${brief.launch_date}`
      : "Limited availability";

  return normaliseLandingPageDraft({
    templateKey: input.presetKey,
    templateName: "Lip Blush Conversion",
    versionName: "Version 1",
    title,
    slug,
    domain: null,
    subdomain: null,
    theme: {
      brandName: client.name,
      tagLine: brief.brand_direction,
      primaryColour,
      accentColour,
      surfaceColour,
      textColour,
      logoLabel: client.name,
      urgencyLabel,
    },
    sections: [
      {
        id: "hero",
        kind: "hero",
        label: "Hero",
        enabled: true,
        badge: brief.traffic_source ?? campaign?.name ?? "Conversion page",
        eyebrow: urgencyLabel,
        headline: title,
        subheadline: brief.offer,
        body:
          brief.goal ??
          campaign?.objective ??
          "Use this hero to explain the offer, the desired outcome, and why the visitor should act now.",
        ctaLabel: brief.main_cta,
        ctaHref: brief.booking_link,
        bullets: [
          brief.price ? `Price: ${brief.price}` : "Add pricing or investment language",
          campaign?.kpis ? `Goal: ${campaign.kpis}` : "Add the primary conversion goal",
          `Traffic source: ${humaniseChannels(campaign?.channels ?? null)}`,
        ],
        items: proofItems.slice(0, 3),
      },
      {
        id: "results",
        kind: "results",
        label: "Results and proof",
        enabled: true,
        eyebrow: "Proof before promise",
        headline: "Show the outcome visitors actually care about",
        subheadline: null,
        body:
          brief.required_claims ??
          "Use approved proof, reviewed claims, and any regulated language the client requires.",
        badge: null,
        ctaLabel: brief.secondary_cta,
        ctaHref: "#offer",
        bullets: splitNotes(brief.required_claims),
        items: proofItems,
      },
      {
        id: "offer",
        kind: "offer",
        label: "Offer",
        enabled: true,
        eyebrow: "The offer",
        headline: brief.offer,
        subheadline: brief.price ? `Price: ${brief.price}` : null,
        body:
          brief.differentiators ??
          "Spell out what is included, what the visitor gets, and what makes this offer different.",
        badge: brief.promotion,
        ctaLabel: brief.main_cta,
        ctaHref: brief.booking_link,
        bullets: splitNotes(brief.differentiators),
        items: [
          {
            id: "offer-inclusion-1",
            title: "What is included",
            body: brief.proof_points ?? "List inclusions, booking terms, or what happens after conversion.",
            meta: null,
          },
        ],
      },
      {
        id: "promise",
        kind: "promise",
        label: "Promise",
        enabled: true,
        eyebrow: "Approval before publish",
        headline: "Make the visitor feel safe saying yes",
        subheadline: null,
        body:
          brief.required_disclaimer ??
          "Add the confidence-building promise here. The Lip Blush reference used an approval-first guarantee before anything permanent happened.",
        badge: "Confidence block",
        ctaLabel: brief.main_cta,
        ctaHref: brief.booking_link,
        bullets: splitNotes(brief.objections),
        items: [],
      },
      {
        id: "process",
        kind: "process",
        label: "Process",
        enabled: true,
        eyebrow: "How it works",
        headline: "Reduce friction with a clear path to conversion",
        subheadline: null,
        body: null,
        badge: null,
        ctaLabel: null,
        ctaHref: null,
        bullets: [],
        items: buildProcessItems(brief),
      },
      {
        id: "testimonials",
        kind: "testimonials",
        label: "Testimonials",
        enabled: true,
        eyebrow: "What clients say",
        headline: "Social proof, only from approved sources",
        subheadline: null,
        body: null,
        badge: null,
        ctaLabel: null,
        ctaHref: null,
        bullets: [],
        items: testimonialItems,
      },
      {
        id: "faq",
        kind: "faq",
        label: "FAQ",
        enabled: true,
        eyebrow: "Quick answers",
        headline: "Remove the last objections before the click",
        subheadline: null,
        body: brief.forbidden_claims ? `Do not say: ${brief.forbidden_claims}` : null,
        badge: null,
        ctaLabel: null,
        ctaHref: null,
        bullets: splitNotes(brief.objections),
        items: buildFaqItems(brief),
      },
      {
        id: "location",
        kind: "location",
        label: "Location and trust",
        enabled: true,
        eyebrow: "Where this happens",
        headline: client.name,
        subheadline: client.website,
        body:
          brief.required_tracking ??
          "Use this area for trust builders, service area, business details, and any booking instructions.",
        badge: campaign?.name,
        ctaLabel: brief.main_cta,
        ctaHref: brief.booking_link,
        bullets: [
          client.website ? `Website: ${client.website}` : "Add the business website",
          campaign?.name ? `Campaign: ${campaign.name}` : "Add the supporting campaign name",
        ],
        items: [],
      },
      {
        id: "final_cta",
        kind: "final_cta",
        label: "Final CTA",
        enabled: true,
        eyebrow: urgencyLabel,
        headline: "Repeat the strongest reason to act now",
        subheadline: brief.offer,
        body:
          brief.required_disclaimer ??
          "Close with the main offer, the next step, and any final disclosure the client requires.",
        badge: brief.promotion,
        ctaLabel: brief.main_cta,
        ctaHref: brief.booking_link,
        bullets: [],
        items: [],
      },
    ],
    form: {
      ctaType: brief.booking_link ? "booking_link" : "lead_form",
      bookingUrl: brief.booking_link,
      externalCheckoutUrl: null,
      submitLabel: brief.main_cta,
      successMessage: `Thanks for your interest in ${client.name}.`,
      collectPhone: true,
      collectNotes: true,
    },
    tracking: {
      metaPixelId: null,
      ga4MeasurementId: null,
      customEvents: splitNotes(brief.required_tracking),
      bookingDestinationLabel: brief.booking_link ? "Primary booking destination" : null,
      cookieConsentRequired: true,
    },
    seo: {
      metaTitle: title,
      metaDescription:
        brief.offer ??
        "Conversion-focused landing page draft generated from approved client context.",
      canonicalUrl: null,
      ogTitle: title,
      ogDescription:
        brief.offer ??
        "Conversion-focused landing page draft generated from approved client context.",
    },
    social: {
      ogImageDocumentId: null,
      socialProofLabel: campaign?.results ?? null,
      shareHeadline: brief.main_cta,
    },
    assetSlots: [
      { slot: "hero", label: "Hero image", documentId: null, creativeAssetId: null, altText: null },
      { slot: "results_primary", label: "Results image 1", documentId: null, creativeAssetId: null, altText: null },
      { slot: "results_secondary", label: "Results image 2", documentId: null, creativeAssetId: null, altText: null },
    ],
    sourceContext: {
      brandVoiceIds: [],
      offerIds: [],
      audienceIds: [],
      restrictionIds: [],
      proofIds: [],
    },
    notes: campaign?.learnings ?? null,
  });
}
