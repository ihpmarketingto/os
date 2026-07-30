/**
 * Keyword ranking maths.
 *
 * Three things here are routinely got wrong and are handled deliberately:
 *
 *   1. Lower is better. Moving from 8 to 3 is an improvement of five places,
 *      not a decline. Every delta in this file is expressed as "places gained".
 *   2. A keyword that is not ranking has a null position, not 0 and not 100.
 *      Averaging nulls as 0 makes a client look like they own the SERP;
 *      averaging them as 100 makes a good month look like a collapse. They are
 *      excluded from the average and reported separately as coverage.
 *   3. An average position across keywords nobody searches for is a vanity
 *      number. Visibility weights each keyword by its search volume, so
 *      ranking third for a term with 3,000 searches counts for more than
 *      ranking first for one with twelve.
 */

export interface KeywordReading {
  /** Null means measured and not ranking. Undefined means not measured. */
  position: number | null;
  recordedOn: string;
}

export interface KeywordSnapshot {
  keywordId: string;
  keyword: string;
  searchVolume?: number | null;
  /** Most recent reading. */
  current: KeywordReading | null;
  /** The reading being compared against, typically the start of the period. */
  previous: KeywordReading | null;
}

export type RankMovement = "gained" | "lost" | "unchanged" | "entered" | "dropped_out" | "unknown";

/**
 * Estimated share of clicks by organic position. This is a modelling
 * assumption for prioritisation, not a measurement, and it is not a claim
 * about any particular client's results. Treat the output as "which keywords
 * are worth the effort", never as forecast traffic to put in front of a client.
 */
export const ESTIMATED_CTR_BY_POSITION: readonly number[] = [
  0.28, 0.15, 0.11, 0.08, 0.06, 0.05, 0.04, 0.03, 0.03, 0.02,
];

export function estimatedCtr(position: number | null): number {
  if (position === null || position < 1) return 0;
  const index = Math.floor(position) - 1;
  return ESTIMATED_CTR_BY_POSITION[index] ?? 0;
}

/**
 * Places gained between two readings. Positive means the keyword moved up
 * the page. Null when there is nothing meaningful to compare.
 */
export function placesGained(previous: number | null, current: number | null): number | null {
  if (previous === null || current === null) return null;
  return previous - current;
}

export function classifyMovement(previous: number | null | undefined, current: number | null | undefined): RankMovement {
  if (previous === undefined || current === undefined) return "unknown";
  if (previous === null && current === null) return "unknown";
  if (previous === null) return "entered";
  if (current === null) return "dropped_out";
  if (current < previous) return "gained";
  if (current > previous) return "lost";
  return "unchanged";
}

export interface RankingSummary {
  tracked: number;
  /** Keywords with a current position. The denominator for the average. */
  ranking: number;
  notRanking: number;
  /** Never measured at all, which is a data gap rather than a bad result. */
  unmeasured: number;
  topThree: number;
  topTen: number;
  /** Mean position over ranking keywords only. Null when none rank. */
  averagePosition: number | null;
  gained: number;
  lost: number;
  unchanged: number;
  entered: number;
  droppedOut: number;
  /** Net places gained across keywords comparable in both readings. */
  netPlacesGained: number;
  /**
   * Volume-weighted estimated click share, 0 to 1. Null when no tracked
   * keyword carries a search volume, since an unweighted figure would be a
   * different metric wearing the same name.
   */
  visibility: number | null;
}

export function summariseRankings(snapshots: KeywordSnapshot[]): RankingSummary {
  let ranking = 0;
  let notRanking = 0;
  let unmeasured = 0;
  let topThree = 0;
  let topTen = 0;
  let positionSum = 0;
  let gained = 0;
  let lost = 0;
  let unchanged = 0;
  let entered = 0;
  let droppedOut = 0;
  let netPlacesGained = 0;
  let volumeTotal = 0;
  let weightedCtr = 0;

  for (const snapshot of snapshots) {
    const current = snapshot.current?.position ?? null;
    if (!snapshot.current) unmeasured += 1;
    else if (current === null) notRanking += 1;
    else {
      ranking += 1;
      positionSum += current;
      if (current <= 3) topThree += 1;
      if (current <= 10) topTen += 1;
    }

    const movement = classifyMovement(
      snapshot.previous ? snapshot.previous.position : undefined,
      snapshot.current ? current : undefined,
    );
    if (movement === "gained") gained += 1;
    else if (movement === "lost") lost += 1;
    else if (movement === "unchanged") unchanged += 1;
    else if (movement === "entered") entered += 1;
    else if (movement === "dropped_out") droppedOut += 1;

    const delta = placesGained(snapshot.previous?.position ?? null, current);
    if (delta !== null) netPlacesGained += delta;

    const volume = Number(snapshot.searchVolume ?? 0);
    if (volume > 0) {
      volumeTotal += volume;
      weightedCtr += volume * estimatedCtr(current);
    }
  }

  return {
    tracked: snapshots.length,
    ranking,
    notRanking,
    unmeasured,
    topThree,
    topTen,
    averagePosition: ranking > 0 ? positionSum / ranking : null,
    gained,
    lost,
    unchanged,
    entered,
    droppedOut,
    netPlacesGained,
    visibility: volumeTotal > 0 ? weightedCtr / volumeTotal : null,
  };
}

/**
 * Keywords worth working on next: close enough to page one to move, and
 * carrying enough volume to be worth the effort. Ranked by the traffic that
 * would be unlocked by reaching position three.
 */
export function strikingDistance(
  snapshots: KeywordSnapshot[],
  options: { from?: number; to?: number } = {},
): KeywordSnapshot[] {
  const from = options.from ?? 4;
  const to = options.to ?? 20;
  return snapshots
    .filter((s) => {
      const position = s.current?.position ?? null;
      return position !== null && position >= from && position <= to;
    })
    .sort((a, b) => {
      const upside = (s: KeywordSnapshot) =>
        Number(s.searchVolume ?? 0) * (estimatedCtr(3) - estimatedCtr(s.current?.position ?? null));
      return upside(b) - upside(a);
    });
}

/** GBP actions that represent someone trying to reach the business. */
export interface GbpPeriod {
  profileViews: number;
  searchImpressions: number;
  calls: number;
  directionRequests: number;
  websiteClicks: number;
  bookings: number;
}

export function gbpActions(period: GbpPeriod): number {
  return period.calls + period.directionRequests + period.websiteClicks + period.bookings;
}

/**
 * Share of profile views that turned into an attempt to make contact. Null
 * rather than zero when nobody saw the profile, since a rate over no views
 * says nothing.
 */
export function gbpActionRate(period: GbpPeriod): number | null {
  if (period.profileViews <= 0) return null;
  return gbpActions(period) / period.profileViews;
}

/** Parses a rankings export: keyword, position, optional URL. */
export interface ParsedRankingRow {
  keyword: string;
  position: number | null;
  rankingUrl: string | null;
}

export function parseRankingCsv(csv: string): { rows: ParsedRankingRow[]; errors: string[] } {
  const rows: ParsedRankingRow[] = [];
  const errors: string[] = [];
  const lines = csv.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { rows, errors: ["The file is empty."] };

  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const keywordIndex = header.findIndex((h) => h === "keyword" || h === "query");
  const positionIndex = header.findIndex((h) => h === "position" || h === "rank");
  const urlIndex = header.findIndex((h) => h === "url" || h === "ranking_url" || h === "page");

  if (keywordIndex === -1) return { rows, errors: ["No keyword column. Expected a header named keyword or query."] };
  if (positionIndex === -1) return { rows, errors: ["No position column. Expected a header named position or rank."] };

  for (const [offset, line] of lines.slice(1).entries()) {
    const cells = line.split(",").map((c) => c.trim());
    const keyword = cells[keywordIndex];
    if (!keyword) {
      errors.push(`Row ${offset + 2}: no keyword.`);
      continue;
    }

    const raw = (cells[positionIndex] ?? "").toLowerCase();
    let position: number | null = null;
    // Blank, a dash or an explicit "not ranking" all mean measured and absent,
    // which is stored as null rather than coerced into a number.
    if (raw !== "" && raw !== "-" && raw !== "n/a" && raw !== "not ranking") {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        errors.push(`Row ${offset + 2}: "${cells[positionIndex]}" is not a position.`);
        continue;
      }
      position = Math.round(parsed);
    }

    rows.push({ keyword, position, rankingUrl: urlIndex === -1 ? null : cells[urlIndex] || null });
  }

  return { rows, errors };
}
