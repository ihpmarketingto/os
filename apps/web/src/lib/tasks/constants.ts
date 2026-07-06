export const TASK_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_internal_review", label: "Waiting on Internal Review" },
  { value: "waiting_on_client", label: "Waiting on Client" },
  { value: "blocked", label: "Blocked" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
