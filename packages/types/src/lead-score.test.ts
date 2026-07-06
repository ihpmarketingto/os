import { describe, expect, it } from "vitest";
import { computeLeadScore } from "./lead-score";

describe("computeLeadScore", () => {
  it("scores zero with no signals", () => {
    expect(
      computeLeadScore({
        hasEstimatedValue: false,
        serviceInterestCount: 0,
        source: null,
        hasIndustry: false,
        hasContact: false,
      }).score,
    ).toBe(0);
  });

  it("scores 100 with every signal present", () => {
    expect(
      computeLeadScore({
        hasEstimatedValue: true,
        serviceInterestCount: 2,
        source: "referral",
        hasIndustry: true,
        hasContact: true,
      }).score,
    ).toBe(100);
  });

  it("adds partial credit for a subset of signals", () => {
    const result = computeLeadScore({
      hasEstimatedValue: true,
      serviceInterestCount: 0,
      source: "cold outreach",
      hasIndustry: false,
      hasContact: false,
    });
    expect(result.score).toBe(30);
  });
});
