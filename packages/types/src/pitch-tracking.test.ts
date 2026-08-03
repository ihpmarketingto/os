import { describe, expect, it } from "vitest";
import {
  allowedNextPitchStatuses,
  DEFAULT_FOLLOW_UP_DAYS,
  MAX_FOLLOW_UPS,
  pitchesDueFollowUp,
  summarisePitches,
  type PitchRecord,
  type PitchStatus,
} from "./pitch-tracking";

const NOW = new Date("2026-07-30T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function pitch(overrides: Partial<PitchRecord> = {}): PitchRecord {
  return {
    id: Math.random().toString(36).slice(2),
    status: "sent",
    sentAt: daysAgo(1),
    followUpAt: null,
    followUpCount: 0,
    placementUrl: null,
    placementReach: null,
    ...overrides,
  };
}

describe("summarisePitches", () => {
  it("keeps drafts out of the response rate denominator", () => {
    const summary = summarisePitches([
      pitch({ status: "drafted", sentAt: null }),
      pitch({ status: "drafted", sentAt: null }),
      pitch({ status: "sent" }),
      pitch({ status: "responded" }),
    ]);
    // Two sent, one replied. Including the drafts would report 25%.
    expect(summary.sent).toBe(2);
    expect(summary.responseRate).toBeCloseTo(0.5, 5);
    expect(summary.drafted).toBe(2);
  });

  it("counts a decline as a response", () => {
    const summary = summarisePitches([
      pitch({ status: "declined" }),
      pitch({ status: "confirmed" }),
      pitch({ status: "sent" }),
      pitch({ status: "sent" }),
    ]);
    // Someone read it and replied, even to say no.
    expect(summary.replied).toBe(2);
    expect(summary.responseRate).toBeCloseTo(0.5, 5);
    expect(summary.declined).toBe(1);
  });

  it("withholds rates when nothing has been sent", () => {
    const summary = summarisePitches([pitch({ status: "drafted", sentAt: null })]);
    expect(summary.responseRate).toBeNull();
    expect(summary.placementRate).toBeNull();
  });

  it("excludes unknown reach rather than counting it as zero", () => {
    const summary = summarisePitches([
      pitch({ status: "confirmed", placementUrl: "https://a.example", placementReach: 40000 }),
      pitch({ status: "confirmed", placementUrl: "https://b.example", placementReach: null }),
    ]);
    expect(summary.placements).toBe(2);
    expect(summary.knownReach).toBe(40000);
    expect(summary.placementsWithUnknownReach).toBe(1);
  });

  it("handles an empty list", () => {
    const summary = summarisePitches([]);
    expect(summary.total).toBe(0);
    expect(summary.responseRate).toBeNull();
    expect(summary.knownReach).toBe(0);
  });
});

describe("pitchesDueFollowUp", () => {
  it("surfaces a sent pitch that has gone quiet past the wait", () => {
    const due = pitchesDueFollowUp([pitch({ sentAt: daysAgo(DEFAULT_FOLLOW_UP_DAYS + 1) })], NOW);
    expect(due).toHaveLength(1);
    expect(due[0]!.reason).toBe("no_reply");
  });

  it("leaves a pitch alone inside the wait", () => {
    expect(pitchesDueFollowUp([pitch({ sentAt: daysAgo(1) })], NOW)).toEqual([]);
  });

  it("never chases something that already got a reply, including a decline", () => {
    const replied: PitchStatus[] = ["responded", "declined", "confirmed"];
    for (const status of replied) {
      expect(pitchesDueFollowUp([pitch({ status, sentAt: daysAgo(30) })], NOW)).toEqual([]);
    }
  });

  it("stops at the follow-up limit rather than pestering", () => {
    expect(
      pitchesDueFollowUp([pitch({ sentAt: daysAgo(30), followUpCount: MAX_FOLLOW_UPS })], NOW),
    ).toEqual([]);
    expect(
      pitchesDueFollowUp([pitch({ sentAt: daysAgo(30), followUpCount: MAX_FOLLOW_UPS - 1 })], NOW),
    ).toHaveLength(1);
  });

  it("honours an explicit date over the default wait", () => {
    // Sent yesterday, so the default wait has not passed, but a date was set.
    const due = pitchesDueFollowUp([pitch({ sentAt: daysAgo(1), followUpAt: daysAgo(0) })], NOW);
    expect(due).toHaveLength(1);
    expect(due[0]!.reason).toBe("due_date_passed");
  });

  it("does not chase before an explicit future date, even when long sent", () => {
    const future = new Date(NOW.getTime() + 3 * 86_400_000).toISOString();
    expect(pitchesDueFollowUp([pitch({ sentAt: daysAgo(30), followUpAt: future })], NOW)).toEqual([]);
  });

  it("puts the longest waiting first", () => {
    const due = pitchesDueFollowUp(
      [
        pitch({ id: "recent", sentAt: daysAgo(6) }),
        pitch({ id: "stale", sentAt: daysAgo(20) }),
        pitch({ id: "middle", sentAt: daysAgo(10) }),
      ],
      NOW,
    );
    expect(due.map((d) => d.pitch.id)).toEqual(["stale", "middle", "recent"]);
  });

  it("ignores a sent pitch with no send date rather than throwing", () => {
    expect(pitchesDueFollowUp([pitch({ sentAt: null })], NOW)).toEqual([]);
  });
});

describe("allowedNextPitchStatuses", () => {
  it("only lets a draft be sent", () => {
    expect(allowedNextPitchStatuses("drafted")).toEqual(["sent"]);
  });

  it("closes off placed and declined pitches", () => {
    expect(allowedNextPitchStatuses("confirmed")).toEqual([]);
    expect(allowedNextPitchStatuses("declined")).toEqual([]);
  });

  it("does not let a sent pitch go back to drafted", () => {
    expect(allowedNextPitchStatuses("sent")).not.toContain("drafted");
  });
});
