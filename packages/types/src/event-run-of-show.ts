/**
 * Event run of show and sponsor commitments.
 *
 * Segments carry an offset from the event start rather than a wall-clock
 * time. Moving an event by an hour then costs nothing, and the schedule
 * cannot drift out of step with the event it belongs to. Clock times are
 * derived here, once.
 */

export interface RunOfShowSegment {
  id: string;
  title: string;
  startsAfterMinutes: number;
  durationMinutes: number;
  ownerName?: string | null;
  completedAt?: string | null;
}

export interface ScheduledSegment extends RunOfShowSegment {
  /** Minutes from event start to the end of this segment. */
  endsAfterMinutes: number;
  /** Overlaps the segment before it in the running order. */
  overlapsPrevious: boolean;
  /** Dead air between the previous segment ending and this one starting. */
  gapBeforeMinutes: number;
}

/**
 * Orders segments and flags the two things that break a run of show on the
 * day: two things scheduled on top of each other, and unplanned dead air.
 */
export function buildRunOfShow(segments: RunOfShowSegment[]): ScheduledSegment[] {
  const ordered = [...segments].sort((a, b) => a.startsAfterMinutes - b.startsAfterMinutes);

  let previousEnd: number | null = null;
  return ordered.map((segment) => {
    const endsAfterMinutes = segment.startsAfterMinutes + segment.durationMinutes;
    const overlapsPrevious = previousEnd !== null && segment.startsAfterMinutes < previousEnd;
    const gapBeforeMinutes =
      previousEnd === null ? 0 : Math.max(0, segment.startsAfterMinutes - previousEnd);

    // The running order is what matters, so the next comparison is against
    // the furthest point reached so far, not simply the last segment's end.
    previousEnd = previousEnd === null ? endsAfterMinutes : Math.max(previousEnd, endsAfterMinutes);

    return { ...segment, endsAfterMinutes, overlapsPrevious, gapBeforeMinutes };
  });
}

/** Clock time for a segment, given when the event starts. */
export function segmentClockTime(eventStart: Date, minutesAfter: number): Date {
  return new Date(eventStart.getTime() + minutesAfter * 60_000);
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
}

/** Total run time from the first segment starting to the last one ending. */
export function runOfShowDurationMinutes(segments: RunOfShowSegment[]): number {
  if (segments.length === 0) return 0;
  const scheduled = buildRunOfShow(segments);
  const start = Math.min(...scheduled.map((s) => s.startsAfterMinutes));
  const end = Math.max(...scheduled.map((s) => s.endsAfterMinutes));
  return end - start;
}

export const SPONSOR_TIERS = ["title", "presenting", "supporting", "in_kind", "media"] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const SPONSOR_STATUSES = ["prospect", "pitched", "committed", "paid", "declined"] as const;
export type SponsorStatus = (typeof SPONSOR_STATUSES)[number];

export interface SponsorRecord {
  id: string;
  name: string;
  tier: SponsorTier;
  status: SponsorStatus;
  cashAmount: number;
  inKindDescription?: string | null;
  deliverables: { id: string; deliveredAt: string | null; dueDate: string | null }[];
}

export interface SponsorSummary {
  total: number;
  committed: number;
  paid: number;
  declined: number;
  /** Cash from sponsors who have committed or paid. Excludes prospects. */
  committedCash: number;
  /** Cash actually received. */
  collectedCash: number;
  /** Committed but not yet paid. */
  outstandingCash: number;
  deliverablesTotal: number;
  deliverablesDelivered: number;
  /**
   * Sponsors who have paid while something they were promised is still
   * outstanding. This is the list that costs you the renewal.
   */
  paidWithUndeliveredCount: number;
}

export function summariseSponsors(sponsors: SponsorRecord[]): SponsorSummary {
  let committed = 0;
  let paid = 0;
  let declined = 0;
  let committedCash = 0;
  let collectedCash = 0;
  let deliverablesTotal = 0;
  let deliverablesDelivered = 0;
  let paidWithUndeliveredCount = 0;

  for (const sponsor of sponsors) {
    if (sponsor.status === "committed") committed += 1;
    if (sponsor.status === "paid") paid += 1;
    if (sponsor.status === "declined") declined += 1;

    // A prospect has not agreed to anything, so their number is not money.
    if (sponsor.status === "committed" || sponsor.status === "paid") {
      committedCash += sponsor.cashAmount;
    }
    if (sponsor.status === "paid") collectedCash += sponsor.cashAmount;

    const outstanding = sponsor.deliverables.filter((d) => !d.deliveredAt).length;
    deliverablesTotal += sponsor.deliverables.length;
    deliverablesDelivered += sponsor.deliverables.length - outstanding;

    if (sponsor.status === "paid" && outstanding > 0) paidWithUndeliveredCount += 1;
  }

  return {
    total: sponsors.length,
    committed,
    paid,
    declined,
    committedCash,
    collectedCash,
    outstandingCash: committedCash - collectedCash,
    deliverablesTotal,
    deliverablesDelivered,
    paidWithUndeliveredCount,
  };
}

/** Sponsors who paid and are still owed something. */
export function sponsorsOwedDelivery(sponsors: SponsorRecord[]): SponsorRecord[] {
  return sponsors.filter(
    (s) => s.status === "paid" && s.deliverables.some((d) => !d.deliveredAt),
  );
}
