export const PROJECT_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"];
