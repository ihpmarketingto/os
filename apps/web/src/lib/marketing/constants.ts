export const CAMPAIGN_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "ready_to_launch", label: "Ready to Launch" },
  { value: "live", label: "Live" },
  { value: "optimising", label: "Optimising" },
  { value: "paused", label: "Paused" },
  { value: "complete", label: "Complete" },
  { value: "archived", label: "Archived" },
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]["value"];

export const METRIC_CHANNELS = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "seo", label: "SEO" },
  { value: "email", label: "Email" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
] as const;

export type MetricChannel = (typeof METRIC_CHANNELS)[number]["value"];
