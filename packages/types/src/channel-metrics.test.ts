import { describe, expect, it } from "vitest";
import { computeChannelSummary, parseMetricsCsv } from "./channel-metrics";

describe("computeChannelSummary", () => {
  it("aggregates totals and derives rates", () => {
    const summary = computeChannelSummary([
      { spend: 500, impressions: 100000, clicks: 2000, leads: 40, conversions: 20, revenue: 2000 },
      { spend: 500, impressions: 100000, clicks: 2000, leads: 60, conversions: 30, revenue: 1000 },
    ]);
    expect(summary.spend).toBe(1000);
    expect(summary.ctr).toBe(0.02);
    expect(summary.cpc).toBe(0.25);
    expect(summary.cpm).toBe(5);
    expect(summary.cpl).toBe(10);
    expect(summary.cpa).toBe(20);
    expect(summary.roas).toBe(3);
    expect(summary.conversionRate).toBe(0.0125);
  });

  it("returns null rates (not zero) when denominators are zero", () => {
    const summary = computeChannelSummary([
      { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, revenue: 0 },
    ]);
    expect(summary.ctr).toBeNull();
    expect(summary.cpl).toBeNull();
    expect(summary.roas).toBeNull();
  });

  it("handles an empty row set", () => {
    const summary = computeChannelSummary([]);
    expect(summary.spend).toBe(0);
    expect(summary.roas).toBeNull();
  });
});

describe("parseMetricsCsv", () => {
  const header = "date,spend,impressions,clicks,leads,conversions,revenue";

  it("parses valid rows", () => {
    const { rows, errors } = parseMetricsCsv(`${header}\n2026-06-01,100.50,20000,400,12,5,900\n2026-06-02,90,18000,350,9,4,700`);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      metric_date: "2026-06-01",
      spend: 100.5,
      impressions: 20000,
      clicks: 400,
      leads: 12,
      conversions: 5,
      revenue: 900,
    });
  });

  it("rejects a wrong header outright", () => {
    const { rows, errors } = parseMetricsCsv("day,cost\n2026-06-01,100");
    expect(rows).toEqual([]);
    expect(errors[0]).toContain("Header must be exactly");
  });

  it("reports bad rows by line number and keeps the good ones", () => {
    const { rows, errors } = parseMetricsCsv(
      `${header}\n2026-06-01,100,20000,400,12,5,900\nnot-a-date,1,2,3,4,5,6\n2026-06-03,-5,1,1,1,1,1`,
    );
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("Line 3");
    expect(errors[1]).toContain("Line 4");
  });

  it("skips blank lines", () => {
    const { rows, errors } = parseMetricsCsv(`${header}\n\n2026-06-01,1,1,1,1,1,1\n\n`);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });
});
