import { describe, expect, it } from "vitest";
import { estimateImageCostUsd } from "./openai-images";

describe("estimateImageCostUsd", () => {
  it("prices a standard square medium-quality image", () => {
    expect(estimateImageCostUsd("1024x1024", "medium")).toBe(0.042);
  });

  it("charges more for portrait and high quality", () => {
    expect(estimateImageCostUsd("1024x1536", "high")).toBe(0.25);
    expect(estimateImageCostUsd("1024x1536", "high")).toBeGreaterThan(estimateImageCostUsd("1024x1024", "low"));
  });

  it("multiplies by the number of images requested", () => {
    expect(estimateImageCostUsd("1024x1024", "low", 4)).toBe(0.044);
  });
});
