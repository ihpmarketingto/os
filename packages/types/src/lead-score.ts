export interface LeadScoreInputs {
  hasEstimatedValue: boolean;
  serviceInterestCount: number;
  source: string | null;
  hasIndustry: boolean;
  hasContact: boolean;
}

export interface LeadScoreResult {
  score: number;
  explanation: string[];
}

/**
 * A simplified, explainable version of the spec's full configurable lead
 * scoring model (budget fit, service fit, decision-maker access, urgency,
 * industry fit, engagement, etc.). Phase 1 only has the fields below to
 * work with — extend this as CRM fields grow, don't hand-tune scores in the UI.
 */
export function computeLeadScore(input: LeadScoreInputs): LeadScoreResult {
  let score = 0;
  const explanation: string[] = [];

  if (input.hasEstimatedValue) {
    score += 30;
    explanation.push("Budget estimate on file (+30)");
  }
  if (input.serviceInterestCount > 0) {
    score += 20;
    explanation.push(`${input.serviceInterestCount} service(s) of interest noted (+20)`);
  }
  if (input.source === "referral") {
    score += 15;
    explanation.push("Referral source (+15)");
  }
  if (input.hasIndustry) {
    score += 15;
    explanation.push("Industry identified (+15)");
  }
  if (input.hasContact) {
    score += 20;
    explanation.push("Named decision-maker contact on file (+20)");
  }

  if (explanation.length === 0) {
    explanation.push("No qualification signals yet — add budget, services, industry or a contact.");
  }

  return { score: Math.min(100, score), explanation };
}
