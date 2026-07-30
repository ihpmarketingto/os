import { describe, expect, it } from "vitest";
import {
  classifyMovement,
  estimatedCtr,
  gbpActionRate,
  gbpActions,
  parseRankingCsv,
  placesGained,
  strikingDistance,
  summariseRankings,
  type KeywordSnapshot,
} from "./seo-metrics";

function snapshot(
  keyword: string,
  current: number | null | undefined,
  previous: number | null | undefined,
  searchVolume?: number,
): KeywordSnapshot {
  return {
    keywordId: keyword,
    keyword,
    searchVolume,
    current: current === undefined ? null : { position: current, recordedOn: "2026-07-30" },
    previous: previous === undefined ? null : { position: previous, recordedOn: "2026-07-01" },
  };
}

describe("placesGained", () => {
  it("treats moving up the page as a gain", () => {
    expect(placesGained(8, 3)).toBe(5);
  });

  it("treats slipping down the page as a loss", () => {
    expect(placesGained(3, 8)).toBe(-5);
  });

  it("declines to compare when either reading is absent", () => {
    expect(placesGained(null, 3)).toBeNull();
    expect(placesGained(3, null)).toBeNull();
  });
});

describe("classifyMovement", () => {
  it("distinguishes entering from gaining", () => {
    expect(classifyMovement(null, 14)).toBe("entered");
    expect(classifyMovement(14, 9)).toBe("gained");
  });

  it("distinguishes dropping out from losing", () => {
    expect(classifyMovement(9, null)).toBe("dropped_out");
    expect(classifyMovement(9, 14)).toBe("lost");
  });

  it("reports unknown when a reading was never taken", () => {
    expect(classifyMovement(undefined, 4)).toBe("unknown");
    expect(classifyMovement(4, undefined)).toBe("unknown");
    expect(classifyMovement(null, null)).toBe("unknown");
  });
});

describe("summariseRankings", () => {
  it("excludes not-ranking keywords from the average instead of scoring them zero", () => {
    const summary = summariseRankings([
      snapshot("a", 2, 4),
      snapshot("b", 4, 4),
      snapshot("c", null, 30),
    ]);
    // Only a and b rank, so the average is 3, not 2 and not something inflated
    // by treating "not ranking" as position 0.
    expect(summary.averagePosition).toBe(3);
    expect(summary.ranking).toBe(2);
    expect(summary.notRanking).toBe(1);
  });

  it("separates never measured from measured and not ranking", () => {
    const summary = summariseRankings([snapshot("a", undefined, undefined), snapshot("b", null, null)]);
    expect(summary.unmeasured).toBe(1);
    expect(summary.notRanking).toBe(1);
    expect(summary.averagePosition).toBeNull();
  });

  it("counts top three and top ten placements", () => {
    const summary = summariseRankings([
      snapshot("a", 1, 1),
      snapshot("b", 3, 3),
      snapshot("c", 9, 9),
      snapshot("d", 24, 24),
    ]);
    expect(summary.topThree).toBe(2);
    expect(summary.topTen).toBe(3);
  });

  it("nets places gained across comparable keywords only", () => {
    const summary = summariseRankings([
      snapshot("a", 3, 8), // +5
      snapshot("b", 12, 9), // -3
      snapshot("c", 5, null), // entered, not comparable
    ]);
    expect(summary.netPlacesGained).toBe(2);
    expect(summary.gained).toBe(1);
    expect(summary.lost).toBe(1);
    expect(summary.entered).toBe(1);
  });

  it("weights visibility by search volume", () => {
    // Third for a high-volume term should beat first for a term nobody searches.
    const high = summariseRankings([snapshot("a", 3, 3, 3000), snapshot("b", 50, 50, 10)]);
    const low = summariseRankings([snapshot("a", 50, 50, 3000), snapshot("b", 1, 1, 10)]);
    expect(high.visibility).toBeGreaterThan(low.visibility!);
  });

  it("withholds visibility when no keyword carries a volume", () => {
    expect(summariseRankings([snapshot("a", 3, 3)]).visibility).toBeNull();
  });

  it("handles an empty set without dividing by zero", () => {
    const summary = summariseRankings([]);
    expect(summary.tracked).toBe(0);
    expect(summary.averagePosition).toBeNull();
    expect(summary.visibility).toBeNull();
  });
});

describe("estimatedCtr", () => {
  it("falls away with position and bottoms out past the first page", () => {
    expect(estimatedCtr(1)).toBeGreaterThan(estimatedCtr(5));
    expect(estimatedCtr(50)).toBe(0);
    expect(estimatedCtr(null)).toBe(0);
  });
});

describe("strikingDistance", () => {
  it("picks keywords close enough to move, ordered by the traffic at stake", () => {
    const results = strikingDistance([
      snapshot("tiny", 6, 6, 20),
      snapshot("big", 7, 7, 5000),
      snapshot("already first", 1, 1, 9000),
      snapshot("hopeless", 80, 80, 9000),
    ]);
    expect(results.map((r) => r.keyword)).toEqual(["big", "tiny"]);
  });
});

describe("GBP", () => {
  const period = {
    profileViews: 1000,
    searchImpressions: 4000,
    calls: 40,
    directionRequests: 30,
    websiteClicks: 25,
    bookings: 5,
  };

  it("counts every attempt to reach the business as an action", () => {
    expect(gbpActions(period)).toBe(100);
    expect(gbpActionRate(period)).toBeCloseTo(0.1, 5);
  });

  it("withholds the rate when nobody saw the profile", () => {
    expect(gbpActionRate({ ...period, profileViews: 0 })).toBeNull();
  });
});

describe("parseRankingCsv", () => {
  it("parses keyword, position and URL", () => {
    const { rows, errors } = parseRankingCsv(
      ["keyword,position,url", "botox brampton,3,https://example.ca/botox", "lip filler,12,"].join("\n"),
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { keyword: "botox brampton", position: 3, rankingUrl: "https://example.ca/botox" },
      { keyword: "lip filler", position: 12, rankingUrl: null },
    ]);
  });

  it("stores a measured absence as null rather than coercing it to a number", () => {
    const { rows } = parseRankingCsv(
      ["query,rank", "hydrafacial,-", "microneedling,", "dermaplaning,not ranking"].join("\n"),
    );
    expect(rows.map((r) => r.position)).toEqual([null, null, null]);
  });

  it("rejects a position that is not a position", () => {
    const { rows, errors } = parseRankingCsv(["keyword,position", "good,4", "bad,abc", "worse,0"].join("\n"));
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });

  it("explains a missing column instead of silently importing nothing", () => {
    expect(parseRankingCsv("foo,bar\n1,2").errors[0]).toMatch(/keyword/);
    expect(parseRankingCsv("keyword,volume\nbotox,100").errors[0]).toMatch(/position/);
  });

  it("reports an empty file", () => {
    expect(parseRankingCsv("   ").errors[0]).toMatch(/empty/);
  });
});
