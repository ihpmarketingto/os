import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  groupByDate,
  isSameCalendarDay,
  parseCalendarDate,
  shiftMonth,
  summariseCadence,
  toCalendarDate,
} from "./content-calendar";

describe("parseCalendarDate", () => {
  it("reads a date-only string as a local calendar day", () => {
    const parsed = parseCalendarDate("2026-07-01")!;
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(1);
  });

  it("does not drift to the previous day west of Greenwich", () => {
    // new Date("2026-07-01") is midnight UTC, which is 30 June locally in
    // every North American timezone. This is the bug the helper exists for.
    const naive = new Date("2026-07-01");
    const parsed = parseCalendarDate("2026-07-01")!;
    if (naive.getTimezoneOffset() > 0) {
      expect(naive.getDate()).not.toBe(parsed.getDate());
    }
    expect(parsed.getDate()).toBe(1);
  });

  it("ignores a time portion and rejects nonsense", () => {
    expect(parseCalendarDate("2026-07-01T13:45:00Z")!.getDate()).toBe(1);
    expect(parseCalendarDate("not a date")).toBeNull();
    expect(parseCalendarDate("")).toBeNull();
  });
});

describe("toCalendarDate", () => {
  it("formats from local parts so it round-trips", () => {
    const original = "2026-01-31";
    expect(toCalendarDate(parseCalendarDate(original)!)).toBe(original);
  });

  it("pads single digit months and days", () => {
    expect(toCalendarDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("does not shift a late-evening date the way toISOString would", () => {
    const lateEvening = new Date(2026, 6, 1, 22, 30);
    expect(toCalendarDate(lateEvening)).toBe("2026-07-01");
  });
});

describe("buildMonthGrid", () => {
  it("returns whole weeks of seven days", () => {
    for (const week of buildMonthGrid(2026, 6)) expect(week).toHaveLength(7);
  });

  it("starts on the configured first day of the week", () => {
    const sundayFirst = buildMonthGrid(2026, 6, 0);
    expect(sundayFirst[0]![0]!.date.getDay()).toBe(0);
    const mondayFirst = buildMonthGrid(2026, 6, 1);
    expect(mondayFirst[0]![0]!.date.getDay()).toBe(1);
  });

  it("covers every day of the month exactly once", () => {
    const cells = buildMonthGrid(2026, 1).flat().filter((c) => c.inMonth);
    // February 2026 has 28 days.
    expect(cells).toHaveLength(28);
    expect(new Set(cells.map((c) => c.key)).size).toBe(28);
  });

  it("marks borrowed days from adjacent months", () => {
    const grid = buildMonthGrid(2026, 6, 0);
    const first = grid[0]!;
    // 1 July 2026 is a Wednesday, so the row starts with three June days.
    expect(first.filter((c) => !c.inMonth).length).toBeGreaterThan(0);
    expect(first.some((c) => c.inMonth)).toBe(true);
  });

  it("handles a month that starts on the week's first day", () => {
    // 1 March 2026 is a Sunday, so a Sunday-first grid borrows nothing ahead.
    const grid = buildMonthGrid(2026, 2, 0);
    expect(grid[0]![0]!.key).toBe("2026-03-01");
  });

  it("handles a leap year February", () => {
    const cells = buildMonthGrid(2028, 1).flat().filter((c) => c.inMonth);
    expect(cells).toHaveLength(29);
  });
});

describe("shiftMonth", () => {
  it("rolls over the year boundary in both directions", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("steps within a year", () => {
    expect(shiftMonth(2026, 6, 1)).toEqual({ year: 2026, month: 7 });
  });
});

describe("groupByDate", () => {
  it("groups by local day and skips unscheduled items", () => {
    const grouped = groupByDate([
      { id: "a", publishDate: "2026-07-01" },
      { id: "b", publishDate: "2026-07-01" },
      { id: "c", publishDate: "2026-07-02" },
      { id: "d", publishDate: null },
    ]);
    expect(grouped.get("2026-07-01")).toHaveLength(2);
    expect(grouped.get("2026-07-02")).toHaveLength(1);
    expect(grouped.size).toBe(2);
  });
});

describe("summariseCadence", () => {
  it("counts scheduled items and active days", () => {
    const summary = summariseCadence(
      [
        { id: "a", publishDate: "2026-07-01" },
        { id: "b", publishDate: "2026-07-01" },
        { id: "c", publishDate: "2026-07-15" },
        { id: "d", publishDate: null },
      ],
      2026,
      6,
    );
    expect(summary.scheduled).toBe(3);
    expect(summary.unscheduled).toBe(1);
    expect(summary.activeDays).toBe(2);
    expect(summary.busiestDayCount).toBe(2);
  });

  it("finds the longest silence, which a list view hides", () => {
    const summary = summariseCadence(
      [
        { id: "a", publishDate: "2026-07-01" },
        { id: "b", publishDate: "2026-07-20" },
      ],
      2026,
      6,
    );
    // 2 to 19 July is eighteen quiet days.
    expect(summary.longestGapDays).toBe(18);
  });

  it("ignores items scheduled in a different month", () => {
    const summary = summariseCadence(
      [
        { id: "a", publishDate: "2026-07-01" },
        { id: "b", publishDate: "2026-08-01" },
      ],
      2026,
      6,
    );
    expect(summary.scheduled).toBe(1);
  });

  it("reports a whole empty month as one long gap", () => {
    const summary = summariseCadence([], 2026, 6);
    expect(summary.scheduled).toBe(0);
    expect(summary.activeDays).toBe(0);
    expect(summary.longestGapDays).toBe(31);
  });
});

describe("isSameCalendarDay", () => {
  it("compares calendar days, not instants", () => {
    expect(isSameCalendarDay(new Date(2026, 6, 1, 0, 1), new Date(2026, 6, 1, 23, 59))).toBe(true);
    expect(isSameCalendarDay(new Date(2026, 6, 1), new Date(2026, 6, 2))).toBe(false);
  });
});
