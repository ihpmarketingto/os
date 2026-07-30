/**
 * IHP's sellable service catalogue, mapped to the task templates that
 * constitute each service's delivery SOP. Installed per organisation by
 * the seed script; editable afterwards in Settings > Services.
 *
 * `templates` reference task_templates by name. `on_start` fires once when
 * a client buys the service (setup work); `each_period` fires every
 * delivery cycle, which is what makes retainer fulfilment repeatable.
 */
export interface ServicePackageDefinition {
  slug: string;
  name: string;
  category:
    | "strategy"
    | "website"
    | "landing_pages"
    | "paid_media"
    | "seo"
    | "local_seo"
    | "social"
    | "email"
    | "lifecycle"
    | "booking"
    | "pr"
    | "events"
    | "reporting"
    | "other";
  description: string;
  cadence: "one_time" | "monthly" | "quarterly";
  defaultIncludedHours: number | null;
  templates: { name: string; trigger: "on_start" | "each_period" }[];
}

export const SERVICE_CATALOGUE: ServicePackageDefinition[] = [
  {
    slug: "strategy-sprint",
    name: "Strategy Sprint",
    category: "strategy",
    description: "Research, positioning, offer and funnel strategy delivered as a 90-day plan with KPIs.",
    cadence: "one_time",
    defaultIncludedHours: 20,
    templates: [{ name: "Client Onboarding", trigger: "on_start" }],
  },
  {
    slug: "paid-media-management",
    name: "Paid Media Management",
    category: "paid_media",
    description: "Meta and Google Ads management: campaign architecture, creative testing, pacing and optimisation.",
    cadence: "monthly",
    defaultIncludedHours: 16,
    templates: [
      { name: "Ad Account Audit", trigger: "on_start" },
      { name: "Paid Ads Launch", trigger: "on_start" },
      { name: "Ad Creative Production", trigger: "each_period" },
      { name: "Monthly Reporting", trigger: "each_period" },
    ],
  },
  {
    slug: "ad-creative-production",
    name: "Ad Creative Production",
    category: "paid_media",
    description: "Creative only: concepts, ad copy, images and variants through client approval, for clients running their own media buying.",
    cadence: "monthly",
    defaultIncludedHours: 12,
    templates: [{ name: "Ad Creative Production", trigger: "each_period" }],
  },
  {
    slug: "social-content-production",
    name: "Social Content Production",
    category: "social",
    description: "Monthly social content: planning, production, client approval and scheduling.",
    cadence: "monthly",
    defaultIncludedHours: 20,
    templates: [{ name: "Social Content Calendar", trigger: "each_period" }],
  },
  {
    slug: "landing-page-build",
    name: "Landing Page Build",
    category: "landing_pages",
    description: "One conversion-focused landing page from brief through QA and publish approval.",
    cadence: "one_time",
    defaultIncludedHours: 14,
    templates: [{ name: "Landing Page Launch", trigger: "on_start" }],
  },
  {
    slug: "website-build",
    name: "Website Build",
    category: "website",
    description: "Full website build: sitemap, wireframes, copy, tracking and go-live.",
    cadence: "one_time",
    defaultIncludedHours: 60,
    templates: [{ name: "Website Launch", trigger: "on_start" }],
  },
  {
    slug: "cro-programme",
    name: "CRO Programme",
    category: "website",
    description: "Ongoing conversion optimisation: one hypothesis-driven experiment per cycle.",
    cadence: "monthly",
    defaultIncludedHours: 10,
    templates: [
      { name: "Website Audit", trigger: "on_start" },
      { name: "CRO Experiment", trigger: "each_period" },
    ],
  },
  {
    slug: "seo-retainer",
    name: "SEO Retainer",
    category: "seo",
    description: "Technical SEO, keyword strategy, content briefs and on-page work.",
    cadence: "monthly",
    defaultIncludedHours: 14,
    templates: [
      { name: "SEO Onboarding", trigger: "on_start" },
      { name: "Monthly Reporting", trigger: "each_period" },
    ],
  },
  {
    slug: "local-seo",
    name: "Local SEO and Google Business Profile",
    category: "local_seo",
    description: "Local visibility: GBP management, citations, location pages and review generation.",
    cadence: "monthly",
    defaultIncludedHours: 8,
    templates: [
      { name: "Google Business Profile Setup", trigger: "on_start" },
      { name: "Monthly Reporting", trigger: "each_period" },
    ],
  },
  {
    slug: "email-lifecycle-management",
    name: "Email and Lifecycle Management",
    category: "email",
    description: "Campaign sends plus lifecycle flow builds, segmentation and revenue attribution.",
    cadence: "monthly",
    defaultIncludedHours: 12,
    templates: [
      { name: "Lifecycle Email Flow Build", trigger: "on_start" },
      { name: "Email Campaign", trigger: "each_period" },
    ],
  },
  {
    slug: "booking-and-nurture",
    name: "Booking and Lead Nurture",
    category: "booking",
    description: "Appointment-led funnel: booking flow, reminders, nurture sequence and no-show recovery.",
    cadence: "monthly",
    defaultIncludedHours: 10,
    templates: [
      { name: "Booking and Reminder Flow", trigger: "on_start" },
      { name: "Lead Nurture Sequence", trigger: "on_start" },
      { name: "No-show Recovery", trigger: "each_period" },
    ],
  },
  {
    slug: "pr-and-influencer",
    name: "PR and Influencer Outreach",
    category: "pr",
    description: "Media pitching, creator outreach, partnership development and coverage tracking.",
    cadence: "monthly",
    defaultIncludedHours: 12,
    templates: [{ name: "Influencer Campaign", trigger: "each_period" }],
  },
  {
    slug: "event-promotion",
    name: "Event Promotion",
    category: "events",
    description: "Ticketed event campaign: promotion, partner assets, reminder pushes and post-event wrap.",
    cadence: "one_time",
    defaultIncludedHours: 30,
    templates: [
      { name: "Event Promotion", trigger: "on_start" },
      { name: "Event Reporting and Wrap", trigger: "on_start" },
    ],
  },
  {
    slug: "monthly-reporting",
    name: "Monthly Reporting",
    category: "reporting",
    description: "Consolidated performance reporting with commentary, risks and next-month priorities.",
    cadence: "monthly",
    defaultIncludedHours: 6,
    templates: [{ name: "Monthly Reporting", trigger: "each_period" }],
  },
];

/** Period label for a cadence: YYYY-MM, YYYY-Qn, or 'once'. */
export function periodLabel(cadence: "one_time" | "monthly" | "quarterly", when: Date): string {
  if (cadence === "one_time") return "once";
  const year = when.getUTCFullYear();
  if (cadence === "quarterly") {
    return `${year}-Q${Math.floor(when.getUTCMonth() / 3) + 1}`;
  }
  return `${year}-${String(when.getUTCMonth() + 1).padStart(2, "0")}`;
}
