import { describe, expect, it } from "vitest";
import { estimateOpenAiCostUsd } from "./openai";

describe("estimateOpenAiCostUsd", () => {
  it("prices input and output tokens at gpt-5-mini rates", () => {
    // 1M input = $0.25; 1M output = $2.00
    expect(estimateOpenAiCostUsd(1_000_000, 0)).toBe(0.25);
    expect(estimateOpenAiCostUsd(0, 1_000_000)).toBe(2);
  });

  it("rounds to five decimal places for small runs", () => {
    expect(estimateOpenAiCostUsd(2000, 500)).toBe(0.0015);
  });

  it("is zero for zero tokens", () => {
    expect(estimateOpenAiCostUsd(0, 0)).toBe(0);
  });
});
