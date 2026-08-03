import { describe, expect, it } from "vitest";
import {
  cumulativeDelayHours,
  flagSteps,
  formatDelay,
  stepPerformance,
  stepReach,
  summariseFlow,
  type FlowStep,
} from "./email-flow";

function step(overrides: Partial<FlowStep> = {}): FlowStep {
  return {
    stepIndex: 0,
    name: "Step",
    channel: "email",
    delayHours: 0,
    sent: 1000,
    delivered: 980,
    opens: 400,
    clicks: 60,
    unsubscribes: 2,
    conversions: 12,
    revenue: 2400,
    ...overrides,
  };
}

describe("stepPerformance", () => {
  it("takes rates against delivered, not sent", () => {
    const performance = stepPerformance(step({ sent: 1000, delivered: 500, clicks: 50 }));
    // 50/500, not 50/1000. Quoting against sent would halve a healthy result
    // and hide the deliverability problem behind it.
    expect(performance.clickRate).toBeCloseTo(0.1, 5);
    expect(performance.deliveryRate).toBeCloseTo(0.5, 5);
  });

  it("keeps click-to-open separate from click rate", () => {
    const performance = stepPerformance(step({ delivered: 1000, opens: 400, clicks: 80 }));
    expect(performance.clickRate).toBeCloseTo(0.08, 5);
    expect(performance.clickToOpenRate).toBeCloseTo(0.2, 5);
    // The inflated one must never be the smaller of the two.
    expect(performance.clickToOpenRate).toBeGreaterThan(performance.clickRate!);
  });

  it("withholds every rate when there is no denominator", () => {
    const performance = stepPerformance(
      step({ sent: 0, delivered: 0, opens: 0, clicks: 0, unsubscribes: 0, conversions: 0, revenue: 0 }),
    );
    expect(performance.deliveryRate).toBeNull();
    expect(performance.openRate).toBeNull();
    expect(performance.clickRate).toBeNull();
    expect(performance.clickToOpenRate).toBeNull();
    expect(performance.conversionRate).toBeNull();
  });
});

describe("cumulativeDelayHours and formatDelay", () => {
  const steps = [
    step({ stepIndex: 0, delayHours: 0 }),
    step({ stepIndex: 1, delayHours: 24 }),
    step({ stepIndex: 2, delayHours: 48 }),
  ];

  it("adds delays from entry rather than treating them as absolute", () => {
    expect(cumulativeDelayHours(steps, 0)).toBe(0);
    expect(cumulativeDelayHours(steps, 1)).toBe(24);
    expect(cumulativeDelayHours(steps, 2)).toBe(72);
  });

  it("reads as time, not as a number of hours", () => {
    expect(formatDelay(0)).toBe("Immediately");
    expect(formatDelay(1)).toBe("1 hour");
    expect(formatDelay(6)).toBe("6 hours");
    expect(formatDelay(24)).toBe("1 day");
    expect(formatDelay(72)).toBe("3 days");
  });
});

describe("summariseFlow", () => {
  it("totals the flow and rates it against delivered", () => {
    const summary = summariseFlow(
      [
        step({ stepIndex: 0, delayHours: 0, delivered: 1000, clicks: 100, conversions: 20, revenue: 4000, unsubscribes: 3 }),
        step({ stepIndex: 1, delayHours: 48, delivered: 900, clicks: 50, conversions: 10, revenue: 2000, unsubscribes: 2 }),
      ],
      1200,
    );
    expect(summary.steps).toBe(2);
    expect(summary.totalDurationHours).toBe(48);
    expect(summary.delivered).toBe(1900);
    expect(summary.clickRate).toBeCloseTo(150 / 1900, 5);
    expect(summary.revenue).toBe(6000);
    expect(summary.revenuePerEntry).toBeCloseTo(5, 5);
  });

  it("withholds revenue per entry when nobody has entered", () => {
    expect(summariseFlow([step()], 0).revenuePerEntry).toBeNull();
  });

  it("handles a flow with no steps", () => {
    const summary = summariseFlow([], 100);
    expect(summary.steps).toBe(0);
    expect(summary.totalDurationHours).toBe(0);
    expect(summary.clickRate).toBeNull();
  });
});

describe("stepReach", () => {
  it("measures each step against the first and against its predecessor", () => {
    const reach = stepReach([
      step({ stepIndex: 0, delivered: 1000 }),
      step({ stepIndex: 1, delivered: 900 }),
      step({ stepIndex: 2, delivered: 450 }),
    ]);
    expect(reach[0]!.shareOfFirst).toBe(1);
    expect(reach[0]!.dropFromPrevious).toBeNull();
    expect(reach[1]!.shareOfFirst).toBeCloseTo(0.9, 5);
    expect(reach[1]!.dropFromPrevious).toBeCloseTo(0.1, 5);
    expect(reach[2]!.shareOfFirst).toBeCloseTo(0.45, 5);
    expect(reach[2]!.dropFromPrevious).toBeCloseTo(0.5, 5);
  });

  it("orders by step index rather than trusting the input order", () => {
    const reach = stepReach([step({ stepIndex: 2, delivered: 500 }), step({ stepIndex: 0, delivered: 1000 })]);
    expect(reach.map((r) => r.stepIndex)).toEqual([0, 2]);
    expect(reach[0]!.shareOfFirst).toBe(1);
  });
});

describe("flagSteps", () => {
  it("says nothing about a healthy step", () => {
    expect(flagSteps([step({ stepIndex: 0, delivered: 980, unsubscribes: 2, clicks: 60 })])).toEqual([]);
  });

  it("flags an unsubscribe rate above the threshold", () => {
    const flags = flagSteps([step({ stepIndex: 0, delivered: 1000, unsubscribes: 12 })]);
    expect(flags.some((f) => f.reason.includes("Unsubscribes"))).toBe(true);
  });

  it("flags poor delivery as list health", () => {
    const flags = flagSteps([step({ stepIndex: 0, sent: 1000, delivered: 800 })]);
    expect(flags.some((f) => f.reason.includes("list health"))).toBe(true);
  });

  it("flags a step that loses a third of the audience", () => {
    const flags = flagSteps([
      step({ stepIndex: 0, sent: 1000, delivered: 1000 }),
      step({ stepIndex: 1, sent: 500, delivered: 500 }),
    ]);
    expect(flags.some((f) => f.stepIndex === 1 && f.reason.includes("fewer people"))).toBe(true);
  });

  it("stays quiet below the volume floor, where one unsubscribe swings any rate", () => {
    // 2 unsubscribes in 100 is 2%, far past the threshold, but 100 is too few
    // to draw a conclusion from.
    const flags = flagSteps([step({ stepIndex: 0, sent: 100, delivered: 100, unsubscribes: 2, clicks: 0 })]);
    expect(flags).toEqual([]);
  });

  it("flags a meaningful send with no clicks at all", () => {
    const flags = flagSteps([step({ stepIndex: 0, sent: 1000, delivered: 1000, clicks: 0, unsubscribes: 0 })]);
    expect(flags.some((f) => f.reason.includes("No clicks"))).toBe(true);
  });
});
