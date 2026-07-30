import { describe, expect, it } from "vitest";
import { assessCreativeFatigue, parseCreativeMetricsCsv, rankCreatives, type CreativeRow } from "./ad-creative";

const day = (metric_date: string, impressions: number, clicks: number, extra?: Partial<{ spend: number; leads: number; conversions: number; revenue: number }>) => ({
  metric_date,
  spend: extra?.spend ?? 50,
  impressions,
  clicks,
  leads: extra?.leads ?? 5,
  conversions: extra?.conversions ?? 2,
  revenue: extra?.revenue ?? 200,
});

describe("rankCreatives", () => {
  const strong: CreativeRow = {
    id: "strong",
    name: "UGC video A",
    concept: "Summer Glow",
    variantLabel: "A",
    audience: "Warm retargeting",
    metrics: [{ spend: 300, impressions: 60000, clicks: 1500, leads: 40, conversions: 20, revenue: 1800 }],
  };
  const weak: CreativeRow = {
    id: "weak",
    name: "Static B",
    concept: "Summer Glow",
    variantLabel: "B",
    audience: "Warm retargeting",
    metrics: [{ spend: 300, impressions: 60000, clicks: 600, leads: 12, conversions: 4, revenue: 400 }],
  };
  const tiny: CreativeRow = {
    id: "tiny",
    name: "Just launched",
    concept: "Autumn",
    variantLabel: "A",
    audience: null,
    metrics: [{ spend: 8, impressions: 200, clicks: 9, leads: 1, conversions: 0, revenue: 0 }],
  };

  it("ranks the higher-ROAS creative first", () => {
    const ranked = rankCreatives([weak, strong], "roas");
    expect(ranked.find((r) => r.id === "strong")!.rank).toBe(1);
    expect(ranked.find((r) => r.id === "weak")!.rank).toBe(2);
  });

  it("treats cost metrics as lower-is-better", () => {
    const ranked = rankCreatives([weak, strong], "cpl");
    // strong: 300/40 = $7.50 CPL; weak: 300/12 = $25 CPL
    expect(ranked.find((r) => r.id === "strong")!.rank).toBe(1);
  });

  it("refuses to rank creatives without enough data", () => {
    const ranked = rankCreatives([strong, tiny], "roas");
    const tinyRow = ranked.find((r) => r.id === "tiny")!;
    expect(tinyRow.readable).toBe(false);
    expect(tinyRow.rank).toBeNull();
    expect(ranked.find((r) => r.id === "strong")!.rank).toBe(1);
  });

  it("still returns summaries for unreadable creatives", () => {
    const ranked = rankCreatives([tiny], "roas");
    expect(ranked[0]!.summary.spend).toBe(8);
  });
});

describe("assessCreativeFatigue", () => {
  it("will not judge fatigue on fewer than six days", () => {
    const result = assessCreativeFatigue({
      metrics: [day("2026-07-01", 20000, 400), day("2026-07-02", 20000, 380)],
      daysLive: 2,
    });
    expect(result.fatigued).toBe(false);
    expect(result.reason).toContain("Not enough days");
  });

  it("flags a CTR collapse across the run", () => {
    // First half ~2% CTR, second half ~1% CTR: a 50% decline.
    const result = assessCreativeFatigue({
      metrics: [
        day("2026-07-01", 20000, 400),
        day("2026-07-02", 20000, 400),
        day("2026-07-03", 20000, 400),
        day("2026-07-04", 20000, 200),
        day("2026-07-05", 20000, 200),
        day("2026-07-06", 20000, 200),
      ],
      daysLive: 6,
    });
    expect(result.fatigued).toBe(true);
    expect(result.ctrDeclinePct).toBe(50);
    expect(result.reason).toContain("Refresh the creative");
  });

  it("does not flag a mild decline below the threshold", () => {
    const result = assessCreativeFatigue({
      metrics: [
        day("2026-07-01", 20000, 400),
        day("2026-07-02", 20000, 400),
        day("2026-07-03", 20000, 400),
        day("2026-07-04", 20000, 360),
        day("2026-07-05", 20000, 360),
        day("2026-07-06", 20000, 360),
      ],
      daysLive: 6,
    });
    expect(result.fatigued).toBe(false);
    expect(result.ctrDeclinePct).toBe(10);
  });

  it("does not flag improving creative", () => {
    const result = assessCreativeFatigue({
      metrics: [
        day("2026-07-01", 20000, 300),
        day("2026-07-02", 20000, 300),
        day("2026-07-03", 20000, 300),
        day("2026-07-04", 20000, 450),
        day("2026-07-05", 20000, 450),
        day("2026-07-06", 20000, 450),
      ],
      daysLive: 6,
    });
    expect(result.fatigued).toBe(false);
    expect(result.reason).toContain("holding or improving");
  });

  it("refuses to read a trend on thin impression volume", () => {
    const result = assessCreativeFatigue({
      metrics: [
        day("2026-07-01", 100, 4),
        day("2026-07-02", 100, 4),
        day("2026-07-03", 100, 4),
        day("2026-07-04", 100, 1),
        day("2026-07-05", 100, 1),
        day("2026-07-06", 100, 1),
      ],
      daysLive: 6,
    });
    expect(result.fatigued).toBe(false);
    expect(result.reason).toContain("too low");
  });
});

describe("parseCreativeMetricsCsv", () => {
  const header = "date,creative,spend,impressions,clicks,leads,conversions,revenue";

  it("parses creative-level rows", () => {
    const { rows, errors } = parseCreativeMetricsCsv(`${header}\n2026-07-01,UGC video A,120.50,24000,480,14,6,980`);
    expect(errors).toEqual([]);
    expect(rows[0]).toEqual({
      metric_date: "2026-07-01",
      creativeName: "UGC video A",
      spend: 120.5,
      impressions: 24000,
      clicks: 480,
      leads: 14,
      conversions: 6,
      revenue: 980,
    });
  });

  it("rejects a wrong header", () => {
    const { errors } = parseCreativeMetricsCsv("date,spend\n2026-07-01,10");
    expect(errors[0]).toContain("Header must be exactly");
  });

  it("requires a creative name per row", () => {
    const { rows, errors } = parseCreativeMetricsCsv(`${header}\n2026-07-01,,10,100,5,1,0,0`);
    expect(rows).toHaveLength(0);
    expect(errors[0]).toContain("creative name is required");
  });
});
