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
        offer: "A soft lip blush service for clients who want more shape, balance, and colour without a heavy lipstick look.",
        audience: "Clients who want natural-looking lip colour that still feels like them",
        goal: "Custom-blended for undertone, mapped before treatment, and designed to heal into a soft everyday tint.",
        conversion_action: "Booked lip blush appointment",
        main_cta: "Reserve my lip blush",
        secondary_cta: "See healed results",
        traffic_source: "Paid social",
        price: "$349",
        promotion: "Only 50% down to reserve the appointment.",
        deadline: "October 1, 2026",
        booking_link: "https://example.com/book",
        testimonials:
          "My lips finally look even and defined without feeling overdone. The entire appointment felt calm, thoughtful, and so customized. The healed result looks soft enough to wear every day. | I wanted something natural, not dramatic, and the final colour still feels like me. The healed shape made such a difference. | I was nervous before booking, but the mapping step made me feel completely comfortable. Nothing felt rushed and the result looks polished without looking fake.",
        objections: "Healing time, colour fading too dark, discomfort, whether the result will still look natural",
        proof_points:
          "Fresh colour heals softer than day one, Healed lips still look natural, Every colour mix is customized to the client",
        differentiators: "Consultation-first shaping, custom colour mixing, natural healed results that still feel like you",
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

function splitTestimonials(input: string | null | undefined): string[] {
  return (input ?? "")
    .split(/\n|•|\|/)
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
  if (variant === "lip_blush") return "Ditch the lipstick. Wake up ready.";
  if (variant === "consultation") return "Get a clear plan before you spend another dollar guessing";
  if (variant === "event") return "Reserve your seat before this offer fills up";
  return brief.title || `${client.name} landing page`;
}

function buildHeroBody(
  variant: LandingPagePresetVariant,
  brief: LandingPageBriefSnapshot,
  campaign: LandingPageCampaignSnapshot | null,
) {
  if (variant === "lip_blush") {
    return "Custom-blended for undertone, mapped before treatment, and designed to heal into a soft tint that still feels like your lips.";
  }
  if (variant === "consultation") {
    return "Make the page feel like a high-value expert intervention: specific, actionable, and clearly worth booking before a larger commitment.";
  }
  if (variant === "event") {
    return "Make the event feel timely, outcome-driven, and easy to justify so visitors move from curiosity to registration without stalling.";
  }
  if (brief.goal) return brief.goal;
  if (campaign?.objective) return campaign.objective;
  return "Lead with the outcome, the reason to trust it, and the next step the visitor should take right now.";
}

function buildHeroBullets(
  variant: LandingPagePresetVariant,
  brief: LandingPageBriefSnapshot,
  campaign: LandingPageCampaignSnapshot | null,
) {
  if (variant === "lip_blush") {
    return [
      brief.price ? `${brief.price} promotional booking window` : "Clarify the investment and what it includes",
      "You approve the shape and colour before treatment begins",
      brief.booking_link ? "Reserve online in a couple of clicks" : "Connect this page to the right booking flow",
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
        id: "faq-pain",
        title: "Does lip blush hurt?",
        body: "Set the expectation that numbing is used, comfort is checked throughout, and most clients describe the appointment as manageable rather than intense.",
        meta: null,
      },
      {
        id: "faq-healing",
        title: "Will it look too bold once it heals?",
        body:
          brief.required_claims ??
          "Fresh colour usually looks brighter right away, then softens as the lips heal. Healed results matter more than day-one photos.",
        meta: null,
      },
      {
        id: "faq-proof",
        title: "Can I see healed examples before I book?",
        body:
          "Use this answer to direct visitors toward healed photos, not just fresh work, so the final outcome feels believable and well understood.",
        meta: null,
      },
      {
        id: "faq-approval",
        title: "What if I do not love the mapped shape?",
        body: "Make it clear that the visitor approves the shape and colour first, and that nothing permanent begins until the plan feels right.",
        meta: null,
      },
    ];
  }

  if (variant === "consultation") {
    return [
      {
        id: "faq-scope",
        title: "What happens during the consultation?",
        body: "The call is built to get specific fast: context first, priorities second, and a clearer decision path before the session ends.",
        meta: null,
      },
      {
        id: "faq-fit",
        title: "Who is this best for?",
        body: "This works best for founders and lean teams who want sharper priorities before they commit to bigger retainers, campaigns, or rebuilds.",
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
        body: "Only mention a credit policy if it truly exists. Otherwise, keep the fee positioning clean, direct, and easy to justify.",
        meta: null,
      },
    ];
  }

  if (variant === "event") {
    return [
      {
        id: "faq-format",
        title: "What will be covered during the event?",
        body: "Attendees should know the format, the payoff, and exactly why showing up live is worth protecting time for.",
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
        body: "This is best for people actively trying to solve the problem now, not casual browsers collecting ideas for later.",
        meta: null,
      },
      {
        id: "faq-logistics",
        title: "What happens after I register?",
        body: "Registration should immediately lead to clear confirmation, joining details, timing, and any materials the attendee actually needs.",
        meta: null,
      },
    ];
  }

  return [
    {
      id: "faq-scope",
      title: "What is included?",
      body: "Make the deliverable, timing, and post-conversion handoff feel obvious before the visitor has to commit.",
      meta: null,
    },
    {
      id: "faq-fit",
      title: "Who is this for?",
      body: "The best-fit visitor should feel seen immediately, while poor-fit traffic should realize this is not for them.",
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
        title: "Reserve your appointment",
        body: "The first step should feel quick and low-friction: choose the time, place the deposit, and know your date is protected.",
        meta: "Step 1",
      },
      {
        id: "process-2",
        title: "Consult and approve",
        body: "Walk through goals, suitability, shape, and undertone so the client feels fully bought into the plan before treatment starts.",
        meta: "Step 2",
      },
      {
        id: "process-3",
        title: "Treat with intention",
        body: "Show that numbing, mapping, and colour choice are all deliberate parts of the appointment, not rushed add-ons.",
        meta: "Step 3",
      },
      {
        id: "process-4",
        title: "Heal into the final tint",
        body: "Close the loop with the real payoff: healed lips that look softly defined, balanced, and ready before makeup.",
        meta: "Step 4",
      },
    ];
  }

  if (variant === "consultation") {
    return [
      {
        id: "process-1",
        title: "Book the call",
        body: "The booking step should feel precise, high-value, and easy to say yes to without extra explanation.",
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
        body: "This is where the attendee gets the real value: the walkthrough, the teaching, or the guided implementation they came for.",
        meta: "Step 3",
      },
      {
        id: "process-4",
        title: "Leave with a next step",
        body: "Great event pages promise momentum after the session, not just attendance while it is happening.",
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
      body: "Show just enough proof and reassurance to make the outcome feel realistic, not exaggerated.",
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
      body: "Once they convert, the next step should feel simple, clear, and easy to follow through on.",
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
        title: "Fresh colour is not the final result",
        body: "The page should show that healed lips settle softer, which is why proof needs to include real healed examples.",
        meta: "Healed outcome",
      },
      {
        id: "proof-default-2",
        title: "Shape and undertone are approved first",
        body: "The service should feel tailored and deliberate so visitors trust the artist is shaping for them, not for a generic template.",
        meta: "Approval",
      },
      {
        id: "proof-default-3",
        title: "The finished look still feels like your lips",
        body: "The promise is not dramatic makeup. It is more even colour, better definition, and low-maintenance confidence.",
        meta: "Everyday payoff",
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
        body: "This proof point should show that the consultation reduces confusion and makes the next decision clearer.",
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
        body: "This proof point should make the agenda and payoff feel concrete enough to protect time for.",
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
      body: "Lead with reviewed outcomes, testimonials, or proof that belongs to the selected client and offer.",
      meta: "Proof",
    },
  ];
}

function buildTestimonialItems(variant: LandingPagePresetVariant, brief: LandingPageBriefSnapshot) {
  const quotes = splitTestimonials(brief.testimonials).slice(0, 3);
  if (quotes.length > 0) {
    return quotes.map((quote, index) => ({
      id: `testimonial-${index + 1}`,
      title: quote,
      body: variant === "lip_blush" ? "Approved healed-result review" : "Approved testimonial",
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
        title: "Consultation and screening",
        body: "Shape, goals, and suitability are reviewed right at the appointment so the client is not guessing what happens first.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-2",
        title: "Custom shape and undertone mapping",
        body: "Make it obvious that the final shape and colour are chosen intentionally and approved before treatment starts.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-3",
        title: "Aftercare and perfecting plan",
        body:
          brief.promotion ??
          "Set expectations around healing, touch-up timing, and the next steps the client needs before they book.",
        meta: "Included",
      },
    ];
  }

  if (variant === "consultation") {
    return [
      {
        id: "offer-inclusion-1",
        title: "Live strategy session",
        body: "Clarify the session length, format, and how specific the consultation will feel once the call begins.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-2",
        title: "Prioritized recommendations",
        body: "Make it clear the client leaves with sharper priorities, not just a loose conversation.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-3",
        title: "Decision-ready follow-up",
        body: brief.promotion ?? "Use this area for notes, deliverables, or follow-up guidance that is genuinely part of the offer.",
        meta: "Included",
      },
    ];
  }

  if (variant === "event") {
    return [
      {
        id: "offer-inclusion-1",
        title: "Live teaching or walkthrough",
        body: "Explain the main learning block or transformation the attendee is signing up to experience live.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-2",
        title: "Agenda and supporting materials",
        body: "Clarify what comes with registration, including any workbook, checklist, or bonus only if it truly exists.",
        meta: "Included",
      },
      {
        id: "offer-inclusion-3",
        title: "Clear post-event next step",
        body: brief.promotion ?? "Use this area for replay, implementation, or follow-up details that are genuinely part of the event offer.",
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
        body: brief.booking_link ? "The registration flow is connected and ready for the main conversion click." : "Link the main CTA to the registration flow visitors are supposed to use.",
        meta: "Trust",
      },
      {
        id: "trust-2",
        title: "Attendee logistics are simple",
        body: "Use this area for timing, access notes, platform details, or venue information so signups know exactly what happens next.",
        meta: "Trust",
      },
      {
        id: "trust-3",
        title: "The host feels credible",
        body: client.website ? `Use ${client.website} to reinforce organizer credibility, context, and confidence before registration.` : "Add the website, organizer context, or credibility cues that make the event feel real.",
        meta: "Trust",
      },
    ];
  }

  return [
    {
      id: "trust-1",
      title: variant === "lip_blush" ? "The appointment feels private and unrushed" : "Clear booking path",
      body:
        variant === "lip_blush"
          ? "Use this area for studio atmosphere, service-area trust, and the feeling that the visitor gets real time and attention."
          : brief.booking_link
            ? "The booking destination is connected and ready for the main CTA."
            : "Point the final CTA to the booking or lead flow the visitor is actually meant to use.",
      meta: "Trust",
    },
    {
      id: "trust-2",
      title: variant === "lip_blush" ? "Policies are clear before the click" : "Policies are easy to find",
      body:
        variant === "lip_blush"
          ? "Cancellation terms, deposits, suitability notes, and aftercare expectations should feel easy to find before booking."
          : "Use this area for appointment guidance, service area details, and the final practical notes a visitor needs before clicking.",
      meta: "Trust",
    },
    {
      id: "trust-3",
      title: client.website ? (variant === "lip_blush" ? "Studio and website details" : "Studio and website details") : "Business details",
      body:
        client.website
          ? `Use ${client.website} for extra context, credibility, and trust before the visitor books.`
          : "Add the website, contact path, or location details that make the business feel real.",
      meta: "Trust",
    },
  ];
}

function buildFinalCtaHeadline(variant: LandingPagePresetVariant) {
  if (variant === "lip_blush") return "Reserve your lip blush before this booking window closes";
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
    { slot: "hero", label: "Primary healed or fresh lip result", documentId: null, creativeAssetId: null, altText: null },
    { slot: "hero_detail", label: "Close-up detail or brand moment", documentId: null, creativeAssetId: null, altText: null },
    { slot: "results_primary", label: "Before and after proof collage", documentId: null, creativeAssetId: null, altText: null },
    { slot: "results_secondary", label: "Healed result or detail crop", documentId: null, creativeAssetId: null, altText: null },
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
            ? "What healed lip blush actually looks like"
            : variant === "consultation"
              ? "Show the outcomes and confidence the consultation creates"
              : variant === "event"
                ? "Show why registering is worth protecting time for"
                : "Show the outcome visitors actually care about",
        subheadline: null,
        body:
          variant === "lip_blush"
            ? "Fresh colour looks brighter at first. Lead with healed proof so the real outcome feels believable before the visitor books."
            : brief.required_claims ??
              "Use real proof, healed examples, and carefully worded claims that make the result feel polished and believable.",
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
        headline: variant === "lip_blush" && brief.price ? `Everything included in your ${brief.price} lip blush` : brief.offer,
        subheadline: brief.price ? `Investment starts at ${brief.price}` : null,
        body:
          variant === "lip_blush"
            ? brief.differentiators ??
              "Make the offer feel calm, premium, and clear: what is included, how the appointment works, and why the result still looks natural."
            : brief.differentiators ??
              "Spell out what is included, who this is for, and why this offer feels more considered than the alternative.",
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
            ? "You approve everything before anything becomes permanent"
            : variant === "consultation"
              ? "Make the investment feel thoughtful, specific, and low-risk"
              : variant === "event"
                ? "Make registration feel timely without feeling pushy"
                : "Make the visitor feel safe saying yes",
        subheadline: null,
        body:
          brief.required_disclaimer ??
          "Lower fear, answer the unspoken concern, and make the next click feel low-risk.",
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
        headline: variant === "lip_blush" ? "Step by step, from booking to healed." : "Reduce friction with a clear path to conversion",
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
            ? "Clients who wanted natural, not overdone."
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
        headline: variant === "lip_blush" ? "Here is what everyone asks before they book." : "Remove the last objections before the click",
        subheadline: null,
        body:
          variant === "lip_blush"
            ? "Answer the pain, healing, approval, and healed-proof questions that usually stop visitors from clicking."
            : variant === "consultation"
              ? "Answer the questions that usually stop people from paying for strategic help."
              : variant === "event"
                ? "Remove the final friction before registration."
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
            ? "A calm appointment that does not feel rushed"
            : variant === "consultation"
              ? "Know exactly what happens after you book"
              : variant === "event"
                ? "Everything attendees need before they register"
                : client.name,
        subheadline: client.website,
        body:
          variant === "lip_blush"
            ? "Use this section for studio trust, deposit terms, service-area clarity, and the practical details that make booking feel easy."
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
