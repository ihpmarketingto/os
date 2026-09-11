import type { Database as GeneratedDatabase } from "./types.gen";

/**
 * Supabase's type generator does not infer string-literal unions from SQL
 * CHECK constraints. Keep those application-level refinements separate from
 * the generated file so type regeneration remains a mechanical operation.
 */
type CheckedColumnOverrides = {
  bookings: {
    source: "calendly" | "google_calendar" | "gohighlevel" | "internal";
    status: "booked" | "confirmed" | "attended" | "rescheduled" | "cancelled" | "no_show";
    deposit_status: "not_required" | "pending" | "paid" | "refunded";
    deposit_provider: "stripe" | "square" | null;
    outcome: "closed_won" | "closed_lost" | null;
  };
  campaigns: {
    status:
      | "planning"
      | "awaiting_approval"
      | "ready_to_launch"
      | "live"
      | "optimising"
      | "paused"
      | "complete"
      | "archived";
  };
  client_adapters: {
    current_operating_mode: "shadow" | "approval" | "guardrailed_execution";
    review_status: "draft" | "working" | "approved" | "archived";
  };
  content_items: {
    status:
      | "idea"
      | "brief_needed"
      | "in_production"
      | "internal_review"
      | "client_review"
      | "revisions"
      | "approved"
      | "scheduled"
      | "published"
      | "archived";
  };
  creative_assets: {
    origin: "uploaded" | "ai_generated";
  };
  deals: {
    stage:
      | "new_lead"
      | "qualified"
      | "discovery_call_booked"
      | "discovery_completed"
      | "proposal_sent"
      | "negotiation"
      | "verbal_yes"
      | "contract_sent"
      | "closed_won"
      | "closed_lost"
      | "nurture";
    status: "open" | "won" | "lost";
  };
  email_flow_steps: {
    channel: "email" | "sms";
  };
  invoices: {
    status: "draft" | "sent" | "paid" | "overdue" | "void";
  };
  knowledge_entries: {
    kind:
      | "sop"
      | "playbook"
      | "brand_voice"
      | "offer"
      | "icp"
      | "objection"
      | "winning_pattern"
      | "positioning"
      | "policy"
      | "faq";
    confidentiality: "agency_general" | "client_confidential";
    status: "draft" | "active" | "archived";
  };
  qa_runs: {
    overall: "pass" | "warning" | "fail";
  };
  retainers: {
    billing_cadence: "monthly" | "quarterly";
    status: "active" | "paused" | "ended";
  };
  tasks: {
    priority: "low" | "medium" | "high" | "urgent";
    status:
      | "not_started"
      | "in_progress"
      | "waiting_on_internal_review"
      | "waiting_on_client"
      | "blocked"
      | "complete"
      | "cancelled";
  };
};

type CheckedTables = {
  [TableName in keyof CheckedColumnOverrides]: {
    Row: CheckedColumnOverrides[TableName];
    Insert: Partial<CheckedColumnOverrides[TableName]>;
    Update: Partial<CheckedColumnOverrides[TableName]>;
  };
};

export type Database = GeneratedDatabase & {
  public: {
    Tables: CheckedTables;
  };
};
