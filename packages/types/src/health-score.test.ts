import { describe, expect, it } from "vitest";
import { computeClientHealthScore } from "./health-score";

const PERFECT: Parameters<typeof computeClientHealthScore>[0] = {
  clientStatus: "active",
  totalTasksLast30Days: 10,
  completedTasksLast30Days: 10,
  overdueTaskCount: 0,
  pendingApprovalsOlderThan3Days: 0,
  daysSinceLastContact: 5,
  daysUntilContractEnd: 200,
};

describe("computeClientHealthScore", () => {
  it("scores a clean client at 100 and healthy", () => {
    const result = computeClientHealthScore(PERFECT);
    expect(result.score).toBe(100);
    expect(result.band).toBe("healthy");
  });

  it("deducts for overdue tasks", () => {
    const result = computeClientHealthScore({ ...PERFECT, overdueTaskCount: 3 });
    expect(result.score).toBe(85);
    expect(result.explanation.some((line) => line.includes("overdue"))).toBe(true);
  });

  it("deducts for a low task completion rate", () => {
    const result = computeClientHealthScore({ ...PERFECT, completedTasksLast30Days: 5 });
    expect(result.score).toBe(90);
  });

  it("deducts for stale communication beyond 30 days", () => {
    const result = computeClientHealthScore({ ...PERFECT, daysSinceLastContact: 50 });
    expect(result.score).toBe(90);
  });

  it("flags a contract renewing within 30 days", () => {
    const result = computeClientHealthScore({ ...PERFECT, daysUntilContractEnd: 10 });
    expect(result.score).toBe(90);
    expect(result.explanation.some((line) => line.includes("renews"))).toBe(true);
  });

  it("caps the score at 40 for paused clients regardless of other signals", () => {
    const result = computeClientHealthScore({ ...PERFECT, clientStatus: "paused" });
    expect(result.score).toBe(40);
    expect(result.band).toBe("at_risk");
  });

  it("never goes below 0 even with every signal firing", () => {
    const result = computeClientHealthScore({
      clientStatus: "offboarding",
      totalTasksLast30Days: 10,
      completedTasksLast30Days: 0,
      overdueTaskCount: 20,
      pendingApprovalsOlderThan3Days: 10,
      daysSinceLastContact: 120,
      daysUntilContractEnd: -5,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.band).toBe("at_risk");
  });

  it("classifies bands correctly at the boundaries", () => {
    expect(computeClientHealthScore({ ...PERFECT, overdueTaskCount: 5 }).band).toBe("healthy"); // 75
    expect(computeClientHealthScore({ ...PERFECT, overdueTaskCount: 6 }).band).toBe("needs_attention"); // 70 (overdue deduction caps at 30)
    expect(
      computeClientHealthScore({ ...PERFECT, overdueTaskCount: 6, completedTasksLast30Days: 0 }).band,
    ).toBe("needs_attention"); // 100 - 30 - 20 = 50
    expect(
      computeClientHealthScore({
        ...PERFECT,
        overdueTaskCount: 6,
        completedTasksLast30Days: 0,
        daysSinceLastContact: 81,
      }).band,
    ).toBe("at_risk"); // 100 - 30 - 20 - 20 = 30
  });
});
