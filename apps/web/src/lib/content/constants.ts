export const CONTENT_STATUSES = [
  { value: "idea", label: "Idea" },
  { value: "brief_needed", label: "Brief Needed" },
  { value: "in_production", label: "In Production" },
  { value: "internal_review", label: "Internal Review" },
  { value: "client_review", label: "Client Review" },
  { value: "revisions", label: "Revisions" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number]["value"];
