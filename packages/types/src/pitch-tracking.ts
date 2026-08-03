/**
 * PR pitch tracking.
 *
 * Two things are easy to get wrong when scoring outreach:
 *
 *   1. A drafted pitch has not been sent, so it cannot appear in the
 *      denominator of a response rate. Including drafts makes a good week
 *      look like a bad one and rewards deleting drafts.
 *   2. A decline is a response. Someone read the pitch and replied. Counting
 *      only positive replies understates how well the pitch itself is
 *      landing, which is the thing being measured.
 */

export const PITCH_STATUSES = ["drafted", "sent", "responded", "declined", "confirmed"] as const;
export type PitchStatus = (typeof PITCH_STATUSES)[number];

/** Statuses that mean the pitch left the building. */
const SENT_STATUSES = new Set<PitchStatus>(["sent", "responded", "declined", "confirmed"]);

/** Statuses that mean somebody replied, including a no. */
const REPLIED_STATUSES = new Set<PitchStatus>(["responded", "declined", "confirmed"]);

export interface PitchRecord {
  id: string;
  status: PitchStatus;
  /** ISO timestamp, or null when never sent. */
  sentAt: string | null;
  followUpAt: string | null;
  followUpCount: number;
  placementUrl: string | null;
  /** Null means unknown, which is excluded from totals rather than counted as zero. */
  placementReach: number | null;
}

export function hasBeenSent(pitch: PitchRecord): boolean {
  return SENT_STATUSES.has(pitch.status);
}

export function hasReplied(pitch: PitchRecord): boolean {
  return REPLIED_STATUSES.has(pitch.status);
}

export function hasPlacement(pitch: PitchRecord): boolean {
  return Boolean(pitch.placementUrl);
}

export interface PitchSummary {
  total: number;
  drafted: number;
  sent: number;
  replied: number;
  confirmed: number;
  declined: number;
  placements: number;
  /** replied / sent, counting a decline as a reply. Null when nothing is sent. */
  responseRate: number | null;
  /** placements / sent. Null when nothing is sent. */
  placementRate: number | null;
  /** Total stated reach across placements that reported one. */
  knownReach: number;
  /** Placements whose reach the outlet never gave. Reported, not guessed. */
  placementsWithUnknownReach: number;
}

export function summarisePitches(pitches: PitchRecord[]): PitchSummary {
  let drafted = 0;
  let sent = 0;
  let replied = 0;
  let confirmed = 0;
  let declined = 0;
  let placements = 0;
  let knownReach = 0;
  let placementsWithUnknownReach = 0;

  for (const pitch of pitches) {
    if (pitch.status === "drafted") drafted += 1;
    if (hasBeenSent(pitch)) sent += 1;
    if (hasReplied(pitch)) replied += 1;
    if (pitch.status === "confirmed") confirmed += 1;
    if (pitch.status === "declined") declined += 1;

    if (hasPlacement(pitch)) {
      placements += 1;
      if (pitch.placementReach === null) placementsWithUnknownReach += 1;
      else knownReach += pitch.placementReach;
    }
  }

  return {
    total: pitches.length,
    drafted,
    sent,
    replied,
    confirmed,
    declined,
    placements,
    responseRate: sent > 0 ? replied / sent : null,
    placementRate: sent > 0 ? placements / sent : null,
    knownReach,
    placementsWithUnknownReach,
  };
}

/** How long to wait before a first chase, when no explicit date is set. */
export const DEFAULT_FOLLOW_UP_DAYS = 5;

/** Chasing more than this reads as pestering and costs the relationship. */
export const MAX_FOLLOW_UPS = 2;

export interface FollowUpDue {
  pitch: PitchRecord;
  /** Days since it was sent. */
  daysSinceSent: number;
  reason: "due_date_passed" | "no_reply";
}

/**
 * Pitches worth chasing: sent, no reply yet, past the wait, and not already
 * chased to the limit. Anything that got a reply of any kind is done, and so
 * is anything already chased twice.
 */
export function pitchesDueFollowUp(pitches: PitchRecord[], now = new Date()): FollowUpDue[] {
  const due: FollowUpDue[] = [];

  for (const pitch of pitches) {
    if (pitch.status !== "sent") continue;
    if (pitch.followUpCount >= MAX_FOLLOW_UPS) continue;
    if (!pitch.sentAt) continue;

    const sentAt = new Date(pitch.sentAt).getTime();
    if (Number.isNaN(sentAt)) continue;
    const daysSinceSent = Math.floor((now.getTime() - sentAt) / 86_400_000);

    if (pitch.followUpAt) {
      const followUpAt = new Date(pitch.followUpAt).getTime();
      if (!Number.isNaN(followUpAt) && followUpAt <= now.getTime()) {
        due.push({ pitch, daysSinceSent, reason: "due_date_passed" });
      }
      continue;
    }

    if (daysSinceSent >= DEFAULT_FOLLOW_UP_DAYS) {
      due.push({ pitch, daysSinceSent, reason: "no_reply" });
    }
  }

  // Longest waiting first: those are the ones going cold.
  return due.sort((a, b) => b.daysSinceSent - a.daysSinceSent);
}

/** What a pitch may become next, so a placed story cannot be reopened as a draft. */
export function allowedNextPitchStatuses(current: PitchStatus): PitchStatus[] {
  switch (current) {
    case "drafted":
      return ["sent"];
    case "sent":
      return ["responded", "declined", "confirmed"];
    case "responded":
      return ["confirmed", "declined"];
    case "confirmed":
    case "declined":
      return [];
  }
}
