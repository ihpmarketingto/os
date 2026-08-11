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
  {
    key: "consultation_authority",
    name: "Consultation Authority",
    description:
      "A premium consultation page: sharp hero, authority proof, clear process, objection handling, and a direct booking path for higher-consideration offers.",
  },
  {
    key: "event_booking_sprint",
    name: "Event Booking Sprint",
    description:
      "A registration-first event page: urgent hero, clear agenda and outcomes, speaker credibility, FAQs, and repeated seat-reservation CTAs.",
  },
];

export function buildPresetSkeleton(presetKey: string): LandingPageDraft {
  const preset = resolvePresetOption(presetKey);
  const brief = buildPresetBrief(preset.key);
  return buildDraftFromPreset({
    presetKey: preset.key,
    client: {
      id: "template-client",
      name: "Template brand",
      website: "https://example.com",
      brand_kit: {},
    },
    brief,
    campaign: null,
  });
}

function resolvePresetOption(presetKey: string): TemplatePresetOption {
  return LANDING_PAGE_TEMPLATE_PRESETS.find((preset) => preset.key === presetKey) ?? LANDING_PAGE_TEMPLATE_PRESETS[0]!;
}

function buildPresetBrief(presetKey: string): LandingPageBriefSnapshot {
  switch (presetKey) {
    case "consultation_authority":
      return {
        id: "template-brief",
        title: "Marketing consultation landing page",
        offer: "A paid strategy consultation for businesses that want a clear growth plan before investing further in campaigns, content, or CRO.",
        audience: "Founders and operators who want expert guidance before they commit budget",
        goal: "Turn high-intent traffic into booked consultations",
        conversion_action: "Booked strategy consultation",
        main_cta: "Book my consultation",
        secondary_cta: "See what we cover",
        traffic_source: "Search and warm traffic",
        price: "$250",
        promotion: "Includes a post-call action plan and next-step recommendations.",
        deadline: "A limited number of consult slots open each month.",
        booking_link: "https://example.com/book",
        testimonials:
          "We left the call with a clear roadmap and finally understood what was actually worth fixing first. The strategy alone paid for itself.",
        objections: "Whether the call will be specific enough, whether it is worth paying before a retainer, whether the advice will be actionable",
        proof_points:
          "Clear strategic recommendations, Specific prioritization instead of vague advice, Faster decision-making after the call",
        differentiators: "Senior-level guidance, highly specific recommendations, action plan instead of generic inspiration",
        required_claims: "The consultation is advisory in nature and does not guarantee a specific revenue result.",
        forbidden_claims: "Add claims that must never appear.",
        required_disclaimer: "Results depend on execution capacity, offer-market fit, and traffic quality after the consultation.",
        brand_direction: "Confident, precise, strategic, and premium without sounding corporate.",
        required_tracking: "GA4, Meta Pixel, consultation booking conversion",
        launch_date: null,
      };
    case "event_booking_sprint":
      return {
        id: "template-brief",
        title: "Workshop registration landing page",
        offer: "A live workshop built to help attendees leave with a clear plan, practical takeaways, and the confidence to act immediately.",
        audience: "People who are actively evaluating the topic and want a short path to clarity",
        goal: "Convert attention into event registrations",
        conversion_action: "Reserved workshop seat",
        main_cta: "Reserve my seat",
        secondary_cta: "See the agenda",
        traffic_source: "Email and paid social",
        price: "$97",
        promotion: "Early registration access includes bonus materials and replay details if offered.",
        deadline: "Seats are limited and registration closes before the event begins.",
        booking_link: "https://example.com/book",
        testimonials:
          "I signed up hoping for ideas and left with a plan I could actually use the same week. It was practical, clear, and surprisingly actionable.",
        objections: "Whether it will be worth the time, whether it will be too basic, whether the event will turn into a pitch",
        proof_points:
          "Clear agenda, Actionable takeaways, Tangible next step before the attendee leaves",
        differentiators: "Focused format, practical outcomes, stronger follow-through after the event",
        required_claims: "Agenda details, timing, and replay promises should only reflect what is actually included.",
        forbidden_claims: "Add claims that must never appear.",
        required_disclaimer: "Availability, replay access, and bonus materials depend on the final event configuration.",
        brand_direction: "Energetic, urgent, useful, and confidence-building.",
        required_tracking: "GA4, Meta Pixel, registration conversion",
        launch_date: null,
      };
    default:
      return {
        id: "template-brief",
        title: "Lip Blush landing page",
        offer: "A soft, natural lip blush service for clients who want more shape, colour, and confidence without a heavy lipstick look.",
        audience: "Clients who want natural-looking lip colour that still feels like them",
        goal: "Turn curious visitors into booked consultations or appointments",
        conversion_action: "Booked lip blush appointment",
        main_cta: "Book my lip blush",
        secondary_cta: "See healed results",
        traffic_source: "Paid social",
        price: "$650",
        promotion: "Touch-up guidance and booking details are clearly explained before checkout.",
        deadline: "This month's books are filling quickly.",
        booking_link: "https://example.com/book",
        testimonials:
          "My lips finally look even and defined without feeling overdone. Nikki walked me through every step and the healed result looks so natural. I finally feel put together without needing lip colour every day.",
        objections: "Healing time, colour fading too dark, discomfort, whether the result will still look natural",
        proof_points:
          "Waterproof beauty that does not smudge, Healed results still look soft and natural, Every colour mix is customized to the client",
        differentiators: "Consultation-first shaping, custom colour mixing, soft healed results that age beautifully",
        required_claims: "Results last differently for every client and heal softer than they look immediately after treatment.",
        forbidden_claims: "Add claims that must never appear.",
        required_disclaimer: "Healing is different for every client and final colour settles over the following weeks.",
        brand_direction: "Warm, polished, confidence-building copy with beauty-led detail.",
        required_tracking: "GA4, Meta Pixel, booking conversion",
        launch_date: null,
      };
  }
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

type LandingPagePresetVariant = "lip_blush" | "consultation" | "event";

function resolvePresetVariant(presetKey: string, brief: LandingPageBriefSnapshot): LandingPagePresetVariant {
  if (presetKey === "consultation_authority") return "consultation";
  if (presetKey === "event_booking_sprint") return "event";
  if (/consult|strategy|audit|roadmap/i.test(`${brief.title} ${brief.offer}`)) return "consultation";
  if (/workshop|event|masterclass|webinar/i.test(`${brief.title} ${brief.offer}`)) return "event";
  if (isLipBlushContext(brief)) return "lip_blush";
  return "lip_blush";
}

function isLipBlushContext(brief: LandingPageBriefSnapshot) {
  return /lip|blush|neutral/i.test(`${brief.title} ${brief.offer}`);
}

function buildHeroHeadline(
  variant: LandingPagePresetVariant,
  brief: LandingPageBriefSnapshot,
  client: LandingPageClientSnapshot,
) {
  if (variant === "lip_blush") return "Soft lip colour that still looks like you";
  if (variant === "consultation") return "Get a clear plan before you spend another dollar guessing";
  if (variant === "event") return "Reserve your seat before this offer fills up";
  return brief.title || `${client.name} landing page`;
}

function buildHeroBody(
  variant: LandingPagePresetVariant,
  brief: LandingPageBriefSnapshot,
  campaign: LandingPageCampaignSnapshot | null,
) {
  if (brief.goal) return brief.goal;
  if (campaign?.objective) return campaign.objective;
  if (variant === "lip_blush") {
    return "Show visitors that the service is customized, carefully mapped, and designed to heal into a subtle result they feel good wearing every day.";
  }
  if (variant === "consultation") {
    return "Make the page feel like a high-value expert intervention: specific, actionable, and clearly worth booking before a larger commitment.";
  }
  if (variant === "event") {
    return "Make the event feel timely, outcome-driven, and easy to justify so visitors move from curiosity to registration without stalling.";
  }
  return "Use this hero to explain the offer, the desired outcome, and why the visitor should act now.";
}

function buildHeroBullets(
  variant: LandingPagePresetVariant,
  brief: LandingPageBriefSnapshot,
  campaign: LandingPageCampaignSnapshot | null,
) {
  if (variant === "lip_blush") {
    return [
      brief.price ? `Investment starts at ${brief.price}` : "Clarify the investment and what it includes",
      "Customized colour and shape planning before treatment",
      brief.booking_link ? "Book directly online in just a few clicks" : "Connect this page to the right booking flow",
    ];
  }

  if (variant === "consultation") {
    return [
      brief.price ? `Consultation investment ${brief.price}` : "Clarify the consultation price",
      "A senior strategist reviews the situation before recommending next steps",
      "Leave with a plan, priorities, and a stronger decision path",
    ];
  }

  if (variant === "event") {
    return [
      brief.price ? `Seat price ${brief.price}` : "Clarify the event price",
      "Clear outcomes and agenda before the registration click",
      "Make timing, seat urgency, and next steps obvious",
    ];
  }

  return [
    brief.price ? `Investment: ${brief.price}` : "Clarify the investment",
    brief.promotion ?? "Use one clear, honest urgency or offer angle",
    campaign?.channels?.length ? `Best for traffic from ${humaniseChannels(campaign.channels)}` : "Make the next step obvious",
  ];
}

function buildFaqItems(variant: LandingPagePresetVariant, brief: LandingPageBriefSnapshot) {
  if (variant === "lip_blush") {
    return [
      {
        id: "faq-healing",
        title: "What does healing look like after lip blush?",
        body: "Fresh results usually look stronger right away, then soften as the lips heal. Final colour settles over the following weeks, which is why healed photos matter more than day-one photos.",
        meta: null,
      },
      {
        id: "faq-longevity",
        title: "How long does lip blush last?",
        body:
          brief.required_claims ??
          "Retention varies by skin, lifestyle, and aftercare, but the page should set a realistic expectation instead of promising the same result for everyone.",
        meta: null,
      },
      {
        id: "faq-touchup",
        title: "Is a touch-up included?",
        body:
          brief.promotion ??
          "Spell out exactly what is included in the booking, how touch-ups work, and when additional sessions may be needed.",
        meta: null,
      },
      {
        id: "faq-fit",
        title: "How do I know if I am a good candidate?",
        body: "Use this answer for suitability notes, previous pigment questions, and anything the client should confirm during consultation before booking.",
        meta: null,
      },
    ];
  }

  if (variant === "consultation") {
    return [
      {
        id: "faq-scope",
        title: "What happens during the consultation?",
        body: "Use this answer to set expectations around scope, preparation, and the level of specificity the client will receive on the call.",
        meta: null,
      },
      {
        id: "faq-fit",
        title: "Who is this best for?",
        body: "Clarify whether this is designed for founders, teams, or businesses at a specific stage of growth or complexity.",
        meta: null,
      },
      {
        id: "faq-deliverable",
        title: "Do I get anything after the call?",
        body:
          brief.promotion ??
          "Explain whether the client receives notes, a prioritized roadmap, a recording, or a follow-up recommendation set.",
        meta: null,
      },
      {
        id: "faq-credit",
        title: "Is the consultation fee credited later?",
        body: "Use this answer only if that policy actually exists. Otherwise, keep the pricing explanation simple and direct.",
        meta: null,
      },
    ];
  }

  if (variant === "event") {
    return [
      {
        id: "faq-format",
        title: "What will be covered during the event?",
        body: "Use this answer to outline the agenda, learning outcomes, and the value attendees can expect from showing up live.",
        meta: null,
      },
      {
        id: "faq-replay",
        title: "Will there be a replay?",
        body:
          brief.promotion ??
          "Explain replay or bonus access only if it is truly included, and avoid implying extras that are not part of the event configuration.",
        meta: null,
      },
      {
        id: "faq-fit",
        title: "Who should attend?",
        body: "Use this answer to call out the best-fit attendee and prevent low-intent registrations from people who are not ready for the topic.",
        meta: null,
      },
      {
        id: "faq-logistics",
        title: "What happens after I register?",
        body: "Spell out confirmation, joining instructions, timing, and any pre-event materials that are actually part of the attendee flow.",
        meta: null,
      },
    ];
  }

  return [
    {
      id: "faq-scope",
      title: "What is included?",
      body: "Spell out the deliverable, timeline, and what happens after the visitor books or submits the form.",
      meta: null,
    },
    {
      id: "faq-fit",
      title: "Who is this for?",
      body: "Use this answer to make the audience feel seen and to screen out poor-fit leads clearly.",
      meta: null,
    },
    {
      id: "faq-next-step",
      title: "What happens next?",
      body: "Explain what happens after the click, including booking, confirmation, fulfilment, or follow-up.",
      meta: null,
    },
  ];
}

function buildProcessItems(variant: LandingPagePresetVariant, brief: LandingPageBriefSnapshot) {
  if (variant === "lip_blush") {
    return [
      {
        id: "process-1",
        title: "Consult and map",
        body: "Start with a conversation about shape, tone, goals, and any questions the client needs answered before treatment begins.",
        meta: "Step 1",
      },
      {
        id: "process-2",
        title: "Customize the colour",
        body: "Show that the shade is mixed intentionally for the client instead of using a one-size-fits-all lip colour.",
        meta: "Step 2",
      },
      {
        id: "process-3",
        title: "Heal and refine",
        body: "Set expectations for healing, softening, and any follow-up touch-up or refinement process that is included.",
        meta: "Step 3",
      },
      {
        id: "process-4",
        title: "Enjoy the low-maintenance result",
        body: "Close the loop with the payoff: lips that look more even, more defined, and ready before makeup.",
        meta: "Step 4",
      },
    ];
  }

  if (variant === "consultation") {
    return [
      {
        id: "process-1",
        title: "Book the call",
        body: "Use the page to make the booking step feel specific, high-value, and easy to commit to.",
        meta: "Step 1",
      },
      {
        id: "process-2",
        title: "Share the context",
        body: "Collect the right business, offer, or channel context before the consultation so the call does not waste time on basics.",
        meta: "Step 2",
      },
      {
        id: "process-3",
        title: "Get the strategy",
        body: "Show that the consultation leads to real prioritization, not vague advice or generic encouragement.",
        meta: "Step 3",
      },
      {
        id: "process-4",
        title: "Leave with next steps",
        body: "Close the loop with a clear action path the client can execute themselves or continue with the team.",
        meta: "Step 4",
      },
    ];
  }

  if (variant === "event") {
    return [
      {
        id: "process-1",
        title: "Reserve your seat",
        body: "Registration should feel quick, low-friction, and tied to a clear outcome.",
        meta: "Step 1",
      },
      {
        id: "process-2",
        title: "Get the details",
        body: "Attendees should know exactly when, where, and how to join without hunting for follow-up information.",
        meta: "Step 2",
      },
      {
        id: "process-3",
        title: "Show up and learn",
        body: "Use this step for the live value: teaching, walkthroughs, exercises, or guided implementation.",
        meta: "Step 3",
      },
      {
        id: "process-4",
        title: "Leave with a next step",
        body: "Great event pages promise an outcome, not just attendance. Make the post-event payoff obvious.",
        meta: "Step 4",
      },
    ];
  }

  return [
    {
      id: "process-1",
      title: "Review the offer",
      body: brief.offer,
      meta: "Step 1",
    },
    {
      id: "process-2",
      title: "See the proof",
      body: "Use examples, proof, or reassurance that help the visitor believe the outcome is realistic for them.",
      meta: "Step 2",
    },
    {
      id: "process-3",
      title: "Reserve your spot",
      body: brief.booking_link
        ? "Use the linked booking destination or lead form to reserve your appointment."
        : "Use the configured lead form or booking destination to reserve your appointment.",
      meta: "Step 3",
    },
    {
      id: "process-4",
      title: "Know what happens next",
      body: "Make the handoff after conversion feel simple, clear, and low-friction.",
      meta: "Step 4",
    },
  ];
}

function buildProofItems(
  variant: LandingPagePresetVariant,
  brief: LandingPageBriefSnapshot,
  campaign: LandingPageCampaignSnapshot | null,
) {
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

  if (variant === "lip_blush") {
    return [
      {
        id: "proof-default-1",
        title: "Waterproof, smudge-proof confidence",
        body: "The value is not just colour. It is waking up with lips that already look polished.",
        meta: "Benefit",
      },
      {
        id: "proof-default-2",
        title: "Customized shape and colour planning",
        body: "Make the service feel tailored, not templated. Visitors need to know the artist is not guessing.",
        meta: "Approach",
      },
      {
        id: "proof-default-3",
        title: "Healed results stay soft and natural",
        body: "Use healed examples and carefully worded proof to show the outcome is refined rather than overly saturated.",
        meta: "Outcome",
      },
    ];
  }

  if (variant === "consultation") {
    return [
      {
        id: "proof-default-1",
        title: "Specific recommendations, not generic encouragement",
        body: "Visitors should feel that the consultation will surface real priorities instead of broad motivation.",
        meta: "Outcome",
      },
      {
        id: "proof-default-2",
        title: "Faster decisions after the call",
        body: "Use this proof point to show that a strong consultation removes confusion and sharpens what to do next.",
        meta: "Impact",
      },
      {
        id: "proof-default-3",
        title: "Confidence before bigger spend",
        body: "The call should feel like a lower-risk entry point before larger retainers, campaigns, or rebuilds.",
        meta: "Value",
      },
    ];
  }

  if (variant === "event") {
    return [
      {
        id: "proof-default-1",
        title: "Attendees leave with something usable",
        body: "Make it clear the event leads to a real takeaway, not just inspiration or general education.",
        meta: "Outcome",
      },
      {
        id: "proof-default-2",
        title: "Clear agenda, clear payoff",
        body: "Use this proof point to show the visitor what the session covers and why it is worth protecting time for.",
        meta: "Format",
      },
      {
        id: "proof-default-3",
        title: "Built for action after the event",
        body: "The best registration pages make the next step after attendance feel just as tangible as the event itself.",
        meta: "Next step",
      },
    ];
  }

  return [
    {
      id: "proof-default-1",
      title: "Lead with the outcome visitors care about most",
      body: "Use this section for reviewed outcomes, testimonials, or before-and-after summaries that belong to the selected client.",
      meta: "Proof",
    },
  ];
}

function buildTestimonialItems(variant: LandingPagePresetVariant, brief: LandingPageBriefSnapshot) {
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
      title:
        variant === "consultation"
          ? "The call gave us clarity we should have paid for months earlier."
          : variant === "event"
            ? "It was practical, sharp, and actually useful the same day."
            : "I wanted something natural, not overdone.",
      body:
        variant === "consultation"
          ? "Use an approved review here that speaks to strategic clarity, specificity, and better decisions after the consultation."
          : variant === "event"
            ? "Use an approved review here that speaks to useful takeaways, strong facilitation, and why the event felt worth attending."
            : "Use an approved review here that speaks to trust, comfort, and the outcome the visitor wants most.",
      meta: "Approved review",
    },
  ];
}

function buildOfferItems(variant: LandingPagePresetVariant, brief: LandingPageBriefSnapshot) {
  if (variant === "lip_blush") {
    return [
      {
        id: "offer-inclusion-1",
        title: "Custom consultation",
        body: "Shape, tone, goals, and suitability are discussed before the service begins.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-2",
        title: "Personalized colour selection",
        body: "The page should communicate that the final shade is chosen intentionally for the client.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-3",
        title: "Healing guidance and next steps",
        body:
          brief.promotion ??
          "Use this card for touch-up timing, aftercare expectations, and anything else the client needs before they book.",
        meta: "Included",
      },
    ];
  }

  if (variant === "consultation") {
    return [
      {
        id: "offer-inclusion-1",
        title: "Live strategy session",
        body: "Use this card to clarify the session length, format, and the depth of the consultation.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-2",
        title: "Prioritized recommendations",
        body: "Spell out how the client leaves with clearer next steps instead of a loose conversation.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-3",
        title: "Decision-ready follow-up",
        body: brief.promotion ?? "Use this card for notes, deliverables, or post-call guidance that is actually part of the offer.",
        meta: "Included",
      },
    ];
  }

  if (variant === "event") {
    return [
      {
        id: "offer-inclusion-1",
        title: "Live teaching or walkthrough",
        body: "Use this card to explain the main learning block or transformation the attendee is signing up for.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-2",
        title: "Agenda and supporting materials",
        body: "Clarify what is included with registration, including any workbook, checklist, or bonus only if it truly exists.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-3",
        title: "Clear post-event next step",
        body: brief.promotion ?? "Use this card for replay, implementation, or follow-up details that belong to the actual event offer.",
        meta: "Included",
      },
    ];
  }

  return [
    {
      id: "offer-inclusion-1",
      title: "What is included",
      body: brief.proof_points ?? "List inclusions, booking terms, or what happens after conversion.",
      meta: "Included",
    },
  ];
}

function buildLocationItems(
  variant: LandingPagePresetVariant,
  brief: LandingPageBriefSnapshot,
  client: LandingPageClientSnapshot,
) {
  if (variant === "event") {
    return [
      {
        id: "trust-1",
        title: "Registration flow is clear",
        body: brief.booking_link ? "The registration destination is connected and ready for the primary CTA." : "Connect the registration flow to the correct destination.",
        meta: "Trust",
      },
      {
        id: "trust-2",
        title: "Attendee logistics are simple",
        body: "Use this area for timing, access notes, platform details, or venue information so signups know what happens next.",
        meta: "Trust",
      },
      {
        id: "trust-3",
        title: "The host feels credible",
        body: client.website ? `Point visitors to ${client.website} for context, authority, and anything that supports the registration decision.` : "Add the website, organizer context, or credibility cues that make the event feel real.",
        meta: "Trust",
      },
    ];
  }

  return [
    {
      id: "trust-1",
      title: "Clear booking path",
      body: brief.booking_link ? "The booking destination is connected and ready for the primary CTA." : "Connect the final CTA to the correct booking or lead flow.",
      meta: "Trust",
    },
    {
      id: "trust-2",
      title: "Policies are easy to find",
      body: "Use this area for appointment guidance, service area details, and anything the visitor should know before they click.",
      meta: "Trust",
    },
    {
      id: "trust-3",
      title: client.website ? "Studio and website details" : "Business details",
      body: client.website ? `Point visitors to ${client.website} for additional context and brand trust.` : "Add the website, contact path, or location details that make the business feel real.",
      meta: "Trust",
    },
  ];
}

function buildFinalCtaHeadline(variant: LandingPagePresetVariant) {
  if (variant === "lip_blush") return "Ready for lips that look finished before makeup?";
  if (variant === "consultation") return "Ready to replace guessing with a clear plan?";
  if (variant === "event") return "Ready to reserve your seat before registration closes?";
  return "Ready to take the next step?";
}

function buildAssetSlots(variant: LandingPagePresetVariant) {
  if (variant === "consultation") {
    return [
      { slot: "hero", label: "Primary consultation visual", documentId: null, creativeAssetId: null, altText: null },
      { slot: "hero_detail", label: "Supporting authority visual", documentId: null, creativeAssetId: null, altText: null },
      { slot: "results_primary", label: "Case study or outcomes visual", documentId: null, creativeAssetId: null, altText: null },
      { slot: "results_secondary", label: "Client proof or detail visual", documentId: null, creativeAssetId: null, altText: null },
      { slot: "trust_visual", label: "Trust or founder visual", documentId: null, creativeAssetId: null, altText: null },
    ];
  }

  if (variant === "event") {
    return [
      { slot: "hero", label: "Event hero visual", documentId: null, creativeAssetId: null, altText: null },
      { slot: "hero_detail", label: "Speaker or host visual", documentId: null, creativeAssetId: null, altText: null },
      { slot: "results_primary", label: "Agenda or attendee result visual", documentId: null, creativeAssetId: null, altText: null },
      { slot: "results_secondary", label: "Workbook or session visual", documentId: null, creativeAssetId: null, altText: null },
      { slot: "trust_visual", label: "Venue or trust visual", documentId: null, creativeAssetId: null, altText: null },
    ];
  }

  return [
    { slot: "hero", label: "Hero image", documentId: null, creativeAssetId: null, altText: null },
    { slot: "hero_detail", label: "Hero detail visual", documentId: null, creativeAssetId: null, altText: null },
    { slot: "results_primary", label: "Results image 1", documentId: null, creativeAssetId: null, altText: null },
    { slot: "results_secondary", label: "Results image 2", documentId: null, creativeAssetId: null, altText: null },
    { slot: "trust_visual", label: "Studio or trust visual", documentId: null, creativeAssetId: null, altText: null },
  ];
}

export function buildDraftFromPreset(input: {
  presetKey: string;
  client: LandingPageClientSnapshot;
  brief: LandingPageBriefSnapshot;
  campaign: LandingPageCampaignSnapshot | null;
}): LandingPageDraft {
  const { client, brief, campaign } = input;
  const preset = resolvePresetOption(input.presetKey);
  const variant = resolvePresetVariant(input.presetKey, brief);
  const title = brief.title || `${client.name} landing page`;
  const slug = slugify(title);
  const proofItems = buildProofItems(variant, brief, campaign);
  const testimonialItems = buildTestimonialItems(variant, brief);
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
    templateName: preset.name,
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
        headline: buildHeroHeadline(variant, brief, client),
        subheadline: brief.offer,
        body: buildHeroBody(variant, brief, campaign),
        ctaLabel: brief.main_cta,
        ctaHref: brief.booking_link,
        bullets: buildHeroBullets(variant, brief, campaign),
        items: proofItems.slice(0, 3),
      },
      {
        id: "results",
        kind: "results",
        label: "Results and proof",
        enabled: true,
        eyebrow: "Proof before promise",
        headline:
          variant === "lip_blush"
            ? "See the kind of result visitors are hoping for"
            : variant === "consultation"
              ? "Show the outcomes and confidence the consultation creates"
              : variant === "event"
                ? "Show why registering is worth protecting time for"
                : "Show the outcome visitors actually care about",
        subheadline: null,
        body:
          brief.required_claims ??
          "Use real proof, healed examples, and carefully worded claims that make the result feel believable.",
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
        subheadline: brief.price ? `Investment starts at ${brief.price}` : null,
        body:
          brief.differentiators ??
          "Spell out what is included, who this is for, and why this offer feels meaningfully better than the alternative.",
        badge: brief.promotion,
        ctaLabel: brief.main_cta,
        ctaHref: brief.booking_link,
        bullets: splitNotes(brief.differentiators),
        items: buildOfferItems(variant, brief),
      },
      {
        id: "promise",
        kind: "promise",
        label: "Promise",
        enabled: true,
        eyebrow: "Why this feels safe",
        headline:
          variant === "lip_blush"
            ? "Natural-looking results come before anything bold"
            : variant === "consultation"
              ? "Make the investment feel thoughtful, specific, and low-risk"
              : variant === "event"
                ? "Make registration feel timely without feeling pushy"
                : "Make the visitor feel safe saying yes",
        subheadline: null,
        body:
          brief.required_disclaimer ??
          "Use this section to lower fear, answer the unspoken concern, and make the next click feel low-risk.",
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
        items: buildProcessItems(variant, brief),
      },
      {
        id: "testimonials",
        kind: "testimonials",
        label: "Testimonials",
        enabled: true,
        eyebrow: "What clients say",
        headline:
          variant === "lip_blush"
            ? "Clients who wanted natural, not overdone"
            : variant === "consultation"
              ? "Clients who needed clarity before making the next move"
              : variant === "event"
                ? "What attendees say after the event actually delivers"
                : "What it feels like on the other side of the click",
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
        body:
          variant === "lip_blush"
            ? "Use this section to answer the questions that stop people from booking."
            : variant === "consultation"
              ? "Use this section to answer the questions that stop people from paying for strategic help."
              : variant === "event"
                ? "Use this section to remove the final friction before registration."
                : null,
        badge: null,
        ctaLabel: null,
        ctaHref: null,
        bullets: splitNotes(brief.objections),
        items: buildFaqItems(variant, brief),
      },
      {
        id: "location",
        kind: "location",
        label: "Location and trust",
        enabled: true,
        eyebrow: "Where this happens",
        headline:
          variant === "lip_blush"
            ? "Book with confidence"
            : variant === "consultation"
              ? "Know exactly what happens after you book"
              : variant === "event"
                ? "Everything attendees need before they register"
                : client.name,
        subheadline: client.website,
        body:
          variant === "lip_blush"
            ? "Use this section for studio trust, service area, policies, and the final booking guidance that makes the decision feel easy."
            : variant === "consultation"
              ? "Use this section for trust cues, logistics, availability, and any final guidance that makes booking the call feel straightforward."
              : variant === "event"
                ? "Use this section for timing, access details, organizer credibility, and any practical note that helps registration happen now."
                : "Use this area for trust builders, service area, business details, and any booking instructions.",
        badge: brief.promotion,
        ctaLabel: brief.main_cta,
        ctaHref: brief.booking_link,
        bullets: [
          client.website ? `Visit ${client.website}` : "Add the business website",
          brief.booking_link ? "Direct booking destination is connected" : "Connect the correct next step",
        ],
        items: buildLocationItems(variant, brief, client),
      },
      {
        id: "final_cta",
        kind: "final_cta",
        label: "Final CTA",
        enabled: true,
        eyebrow: urgencyLabel,
        headline: buildFinalCtaHeadline(variant),
        subheadline: brief.offer,
        body:
          brief.required_disclaimer ??
          "Close with the core benefit, the next step, and any final reassurance or disclosure the client requires.",
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
    assetSlots: buildAssetSlots(variant),
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
