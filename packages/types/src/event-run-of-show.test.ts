import { describe, expect, it } from "vitest";
import {
  buildRunOfShow,
  formatClockTime,
  runOfShowDurationMinutes,
  segmentClockTime,
  sponsorsOwedDelivery,
  summariseSponsors,
  type RunOfShowSegment,
  type SponsorRecord,
} from "./event-run-of-show";

function segment(overrides: Partial<RunOfShowSegment> = {}): RunOfShowSegment {
  return { id: Math.random().toString(36).slice(2), title: "Segment", startsAfterMinutes: 0, durationMinutes: 15, ...overrides };
}

describe("buildRunOfShow", () => {
  it("orders by start offset regardless of input order", () => {
    const built = buildRunOfShow([
      segment({ id: "c", title: "Close", startsAfterMinutes: 120 }),
      segment({ id: "a", title: "Doors", startsAfterMinutes: 0 }),
      segment({ id: "b", title: "Talk", startsAfterMinutes: 60 }),
    ]);
    expect(built.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("computes when each segment ends", () => {
    const [first] = buildRunOfShow([segment({ startsAfterMinutes: 30, durationMinutes: 45 })]);
    expect(first!.endsAfterMinutes).toBe(75);
  });

  it("flags two things scheduled on top of each other", () => {
    const built = buildRunOfShow([
      segment({ id: "a", startsAfterMinutes: 0, durationMinutes: 30 }),
      segment({ id: "b", startsAfterMinutes: 20, durationMinutes: 30 }),
    ]);
    expect(built[0]!.overlapsPrevious).toBe(false);
    expect(built[1]!.overlapsPrevious).toBe(true);
  });

  it("does not flag segments that merely touch", () => {
    const built = buildRunOfShow([
      segment({ startsAfterMinutes: 0, durationMinutes: 30 }),
      segment({ startsAfterMinutes: 30, durationMinutes: 30 }),
    ]);
    expect(built[1]!.overlapsPrevious).toBe(false);
    expect(built[1]!.gapBeforeMinutes).toBe(0);
  });

  it("measures dead air between segments", () => {
    const built = buildRunOfShow([
      segment({ startsAfterMinutes: 0, durationMinutes: 30 }),
      segment({ startsAfterMinutes: 50, durationMinutes: 20 }),
    ]);
    expect(built[1]!.gapBeforeMinutes).toBe(20);
  });

  it("compares against the furthest point reached, not just the previous row", () => {
    // A long keynote with a short segment nested inside it: the third
    // segment starts before the keynote ends and must still be flagged.
    const built = buildRunOfShow([
      segment({ id: "keynote", startsAfterMinutes: 0, durationMinutes: 90 }),
      segment({ id: "short", startsAfterMinutes: 10, durationMinutes: 5 }),
      segment({ id: "next", startsAfterMinutes: 60, durationMinutes: 30 }),
    ]);
    expect(built[2]!.overlapsPrevious).toBe(true);
  });

  it("handles an empty run of show", () => {
    expect(buildRunOfShow([])).toEqual([]);
    expect(runOfShowDurationMinutes([])).toBe(0);
  });
});

describe("runOfShowDurationMinutes", () => {
  it("spans the first start to the last end", () => {
    expect(
      runOfShowDurationMinutes([
        segment({ startsAfterMinutes: 0, durationMinutes: 30 }),
        segment({ startsAfterMinutes: 120, durationMinutes: 60 }),
      ]),
    ).toBe(180);
  });
});

describe("segmentClockTime", () => {
  it("derives wall clock from the event start, so moving the event moves everything", () => {
    const start = new Date(2026, 7, 20, 18, 0);
    expect(formatClockTime(segmentClockTime(start, 0))).toBe(formatClockTime(start));
    expect(segmentClockTime(start, 90).getHours()).toBe(19);
    expect(segmentClockTime(start, 90).getMinutes()).toBe(30);
  });
});

function sponsor(overrides: Partial<SponsorRecord> = {}): SponsorRecord {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Sponsor",
    tier: "supporting",
    status: "committed",
    cashAmount: 1000,
    deliverables: [],
    ...overrides,
  };
}

describe("summariseSponsors", () => {
  it("does not count a prospect's number as money", () => {
    const summary = summariseSponsors([
      sponsor({ status: "prospect", cashAmount: 50000 }),
      sponsor({ status: "committed", cashAmount: 2000 }),
    ]);
    expect(summary.committedCash).toBe(2000);
  });

  it("separates committed from collected", () => {
    const summary = summariseSponsors([
      sponsor({ status: "committed", cashAmount: 3000 }),
      sponsor({ status: "paid", cashAmount: 5000 }),
    ]);
    expect(summary.committedCash).toBe(8000);
    expect(summary.collectedCash).toBe(5000);
    expect(summary.outstandingCash).toBe(3000);
  });

  it("ignores a declined sponsor's number entirely", () => {
    const summary = summariseSponsors([sponsor({ status: "declined", cashAmount: 9000 })]);
    expect(summary.committedCash).toBe(0);
    expect(summary.declined).toBe(1);
  });

  it("counts a sponsor who paid but is still owed something", () => {
    const summary = summariseSponsors([
      sponsor({
        status: "paid",
        deliverables: [
          { id: "1", deliveredAt: "2026-08-01T00:00:00Z", dueDate: null },
          { id: "2", deliveredAt: null, dueDate: "2026-08-20" },
        ],
      }),
      sponsor({ status: "paid", deliverables: [{ id: "3", deliveredAt: "2026-08-01T00:00:00Z", dueDate: null }] }),
    ]);
    expect(summary.paidWithUndeliveredCount).toBe(1);
    expect(summary.deliverablesTotal).toBe(3);
    expect(summary.deliverablesDelivered).toBe(2);
  });

  it("does not flag an unpaid sponsor as owed delivery", () => {
    const summary = summariseSponsors([
      sponsor({ status: "committed", deliverables: [{ id: "1", deliveredAt: null, dueDate: null }] }),
    ]);
    expect(summary.paidWithUndeliveredCount).toBe(0);
  });

  it("handles no sponsors", () => {
    const summary = summariseSponsors([]);
    expect(summary.committedCash).toBe(0);
    expect(summary.outstandingCash).toBe(0);
  });
});

describe("sponsorsOwedDelivery", () => {
  it("lists only paid sponsors with something outstanding", () => {
    const owed = sponsorsOwedDelivery([
      sponsor({ id: "a", status: "paid", deliverables: [{ id: "1", deliveredAt: null, dueDate: null }] }),
      sponsor({ id: "b", status: "paid", deliverables: [{ id: "2", deliveredAt: "2026-08-01", dueDate: null }] }),
      sponsor({ id: "c", status: "committed", deliverables: [{ id: "3", deliveredAt: null, dueDate: null }] }),
    ]);
    expect(owed.map((s) => s.id)).toEqual(["a"]);
  });
});
