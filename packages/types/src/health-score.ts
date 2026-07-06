export interface ClientHealthInputs {
  clientStatus: "prospect" | "active" | "paused" | "offboarding" | "archived";
  totalTasksLast30Days: number;
  completedTasksLast30Days: number;
  overdueTaskCount: number;
  pendingApprovalsOlderThan3Days: number;
  daysSinceLastContact: number | null;
  daysUntilContractEnd: number | null;
}

export type HealthBand = "healthy" | "needs_attention" | "at_risk";

export interface ClientHealthResult {
  score: number;
  band: HealthBand;
  explanation: string[];
}

/**
 * Deliberately simple and explainable — every deduction has a one-line
 * reason attached, because a health score nobody can explain to a client
 * manager is worse than no score at all. Recalculated on read, not stored
 * as a rolling average, so it always reflects current state.
 */
export function computeClientHealthScore(input: ClientHealthInputs): ClientHealthResult {
  let score = 100;
  const explanation: string[] = [];

  if (input.totalTasksLast30Days > 0) {
    const completionRate = input.completedTasksLast30Days / input.totalTasksLast30Days;
    if (completionRate < 1) {
      const deduction = Math.round((1 - completionRate) * 20);
      score -= deduction;
      explanation.push(
        `Task completion rate is ${Math.round(completionRate * 100)}% over the last 30 days (-${deduction}).`,
      );
    }
  }

  if (input.overdueTaskCount > 0) {
    const deduction = Math.min(30, input.overdueTaskCount * 5);
    score -= deduction;
    explanation.push(`${input.overdueTaskCount} overdue task(s) (-${deduction}).`);
  }

  if (input.pendingApprovalsOlderThan3Days > 0) {
    const deduction = Math.min(15, input.pendingApprovalsOlderThan3Days * 5);
    score -= deduction;
    explanation.push(
      `${input.pendingApprovalsOlderThan3Days} approval(s) pending more than 3 days (-${deduction}).`,
    );
  }

  if (input.daysSinceLastContact !== null && input.daysSinceLastContact > 30) {
    const deduction = Math.min(20, Math.round((input.daysSinceLastContact - 30) * 0.5));
    score -= deduction;
    explanation.push(`No logged contact in ${input.daysSinceLastContact} days (-${deduction}).`);
  }

  if (input.daysUntilContractEnd !== null && input.daysUntilContractEnd <= 30) {
    score -= 10;
    explanation.push(
      input.daysUntilContractEnd >= 0
        ? `Contract renews in ${input.daysUntilContractEnd} day(s) — confirm renewal status (-10).`
        : `Contract end date has passed by ${Math.abs(input.daysUntilContractEnd)} day(s) — confirm renewal status (-10).`,
    );
  }

  if (input.clientStatus === "paused" || input.clientStatus === "offboarding") {
    score = Math.min(score, 40);
    explanation.push(`Client status is "${input.clientStatus}" — score capped at 40.`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (explanation.length === 0) {
    explanation.push("No risk signals found in the last 30 days.");
  }

  const band: HealthBand = score >= 75 ? "healthy" : score >= 50 ? "needs_attention" : "at_risk";

  return { score, band, explanation };
}
