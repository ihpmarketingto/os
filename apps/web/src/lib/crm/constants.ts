export const DEAL_STAGES = [
  { value: "new_lead", label: "New Lead" },
  { value: "qualified", label: "Qualified" },
  { value: "discovery_call_booked", label: "Discovery Call Booked" },
  { value: "discovery_completed", label: "Discovery Completed" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "verbal_yes", label: "Verbal Yes" },
  { value: "contract_sent", label: "Contract Sent" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
  { value: "nurture", label: "Nurture" },
] as const;

export type DealStage = (typeof DEAL_STAGES)[number]["value"];

export const OPEN_PIPELINE_STAGES: DealStage[] = DEAL_STAGES.filter(
  (s) => !["closed_won", "closed_lost", "nurture"].includes(s.value),
).map((s) => s.value);
