/**
 * The automation rule catalogue. Installed per organisation as
 * automation_rules rows; the engine only acts on rules that exist and are
 * enabled for the org (fail closed).
 */
export const AUTOMATION_RULE_CATALOGUE: {
  key: string;
  name: string;
  description: string;
  trigger: "event" | "sweep";
}[] = [
  {
    key: "new_lead_follow_up",
    name: "New lead: create follow-up task",
    description: "When a lead is created, open a follow-up task due in 2 days and notify the lead owner.",
    trigger: "event",
  },
  {
    key: "approval_decided_notify",
    name: "Approval decided: notify requester",
    description: "When a client approves or requests changes, notify whoever requested the approval.",
    trigger: "event",
  },
  {
    key: "page_published_notify",
    name: "Page published: notify project owner",
    description: "When a landing page goes live, notify the person who created the page project.",
    trigger: "event",
  },
  {
    key: "qa_failed_notify",
    name: "QA failed: notify page owner",
    description: "When a QA run fails, notify the page project owner. Publishing stays blocked either way.",
    trigger: "event",
  },
  {
    key: "service_delivery",
    name: "Service delivery: generate the cycle's work",
    description:
      "Each active client service generates its delivery project and tasks from its SOPs: setup work once, then every month or quarter. This is what makes retainer fulfilment repeatable.",
    trigger: "sweep",
  },
  {
    key: "invoice_overdue",
    name: "Invoice overdue: flag and notify",
    description: "Sent invoices past their due date flip to overdue, and finance owners are notified.",
    trigger: "sweep",
  },
  {
    key: "renewal_due",
    name: "Renewal due: notify owners",
    description: "Contracts and retainers inside their notice window raise a renewal notification.",
    trigger: "sweep",
  },
  {
    key: "task_overdue",
    name: "Task overdue: notify assignee",
    description: "Open tasks past their due date notify their assignee (or the org owners if unassigned), at most weekly.",
    trigger: "sweep",
  },
  {
    key: "stale_touchpoint",
    name: "No touchpoint in 30 days: relationship task",
    description: "Active clients with no notes or meetings in 30 days get a relationship task for their account manager, at most monthly.",
    trigger: "sweep",
  },
  {
    key: "ad_anomaly",
    name: "Ad spend anomaly: notify",
    description: "Clients with meaningful 7-day ad spend but no leads, or ROAS under 1, raise an anomaly notification.",
    trigger: "sweep",
  },
];
