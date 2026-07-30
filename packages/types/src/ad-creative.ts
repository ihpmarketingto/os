import { computeChannelSummary, type ChannelSummary, type MetricRowLike } from "./channel-metrics";

/**
 * Creative analysis: which variant is winning, and which is wearing out.
 * All of it deliberately refuses to answer when the data cannot support an
 * answer — a confident ranking off 40 impressions is worse than no ranking.
 */

/** Below this spend, a creative's numbers are treated as not yet readable. */
export const MIN_SPEND_FOR_READ = 50;
/** Below this many impressions, rate metrics are noise. */
export const MIN_IMPRESSIONS_FOR_READ = 1000;

export type RankMetric = "roas" | "cpl" | "cpa" | "ctr" | "conversionRate";

export interface CreativeRow {
  id: string;
  name: string;
  concept: string;
  variantLabel: string;
  audience: string | null;
  metrics: MetricRowLike[];
}

export interface RankedCreative {
  id: string;
  name: string;
  concept: string;
  variantLabel: string;
  audience: string | null;
  summary: ChannelSummary;
  /** Null when the creative has not accumulated enough data to judge. */
  rank: number | null;
  readable: boolean;
}

/** Lower is better for cost metrics; higher is better for the rest. */
const LOWER_IS_BETTER: Record<RankMetric, boolean> = {
  roas: false,
  cpl: true,
  cpa: true,
  ctr: false,
  conversionRate: false,
};

export function rankCreatives(creatives: CreativeRow[], metric: RankMetric = "roas"): RankedCreative[] {
  const scored = creatives.map((creative) => {
    const summary = computeChannelSummary(creative.metrics);
    const readable = summary.spend >= MIN_SPEND_FOR_READ && summary.impressions >= MIN_IMPRESSIONS_FOR_READ;
    return { creative, summary, readable, value: summary[metric] };
  });

  const readableSorted = scored
    .filter((s) => s.readable && s.value !== null)
    .sort((a, b) => (LOWER_IS_BETTER[metric] ? (a.value as number) - (b.value as number) : (b.value as number) - (a.value as number)));

  const rankById = new Map(readableSorted.map((s, i) => [s.creative.id, i + 1]));

  return scored.map(({ creative, summary, readable }) => ({
    id: creative.id,
    name: creative.name,
    concept: creative.concept,
    variantLabel: creative.variantLabel,
    audience: creative.audience,
    summary,
    rank: rankById.get(creative.id) ?? null,
    readable,
  }));
}

export interface FatigueInputs {
  /** Day-level rows, any order; the assessment splits them by date itself. */
  metrics: (MetricRowLike & { metric_date: string })[];
  daysLive: number | null;
}

export interface FatigueResult {
  fatigued: boolean;
  /** Always populated: the reason it is or is not flagged. */
  reason: string;
  recentCtr: number | null;
  earlierCtr: number | null;
  ctrDeclinePct: number | null;
}

/**
 * Flags creative fatigue from a CTR decline between the earlier and most
 * recent halves of its run. Frequency would be the better signal, but that
 * needs reach, which platform CSV exports do not reliably include — so this
 * says what it measures rather than implying more.
 */
export function assessCreativeFatigue(input: FatigueInputs): FatigueResult {
  const sorted = [...input.metrics].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  const none: Omit<FatigueResult, "fatigued" | "reason"> = { recentCtr: null, earlierCtr: null, ctrDeclinePct: null };

  if (sorted.length < 6) {
    return { fatigued: false, reason: "Not enough days of data to judge fatigue (needs 6).", ...none };
  }

  const midpoint = Math.floor(sorted.length / 2);
  const earlier = computeChannelSummary(sorted.slice(0, midpoint));
  const recent = computeChannelSummary(sorted.slice(midpoint));

  if (recent.impressions < MIN_IMPRESSIONS_FOR_READ || earlier.impressions < MIN_IMPRESSIONS_FOR_READ) {
    return { fatigued: false, reason: "Impression volume too low to read a CTR trend.", ...none };
  }
  if (earlier.ctr === null || recent.ctr === null || earlier.ctr === 0) {
    return { fatigued: false, reason: "No click-through rate available to compare.", ...none };
  }

  const declinePct = Math.round(((earlier.ctr - recent.ctr) / earlier.ctr) * 1000) / 10;
  const shared = { recentCtr: recent.ctr, earlierCtr: earlier.ctr, ctrDeclinePct: declinePct };

  if (declinePct >= 25) {
    return {
      fatigued: true,
      reason: `Click-through rate fell ${declinePct}% between the first and second half of this creative's run${
        input.daysLive ? ` (${input.daysLive} days live)` : ""
      }. Refresh the creative before scaling spend.`,
      ...shared,
    };
  }

  return {
    fatigued: false,
    reason:
      declinePct > 0
        ? `Click-through rate is down ${declinePct}%, below the 25% fatigue threshold.`
        : `Click-through rate is holding or improving (${Math.abs(declinePct)}% change).`,
    ...shared,
  };
}

/**
 * Parses creative-level metrics as exported from an ad platform:
 *   date,creative,spend,impressions,clicks,leads,conversions,revenue
 * The creative column matches an existing creative by name; unmatched names
 * are reported rather than silently dropped.
 */
export interface ParsedCreativeMetricRow extends MetricRowLike {
  metric_date: string;
  creativeName: string;
}

export interface CreativeCsvParseResult {
  rows: ParsedCreativeMetricRow[];
  errors: string[];
}

const CREATIVE_HEADER = ["date", "creative", "spend", "impressions", "clicks", "leads", "conversions", "revenue"];

export function parseCreativeMetricsCsv(text: string): CreativeCsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { rows: [], errors: ["The file is empty."] };

  const header = lines[0]!.toLowerCase().split(",").map((h) => h.trim());
  if (CREATIVE_HEADER.some((column, i) => header[i] !== column)) {
    return { rows: [], errors: [`Header must be exactly: ${CREATIVE_HEADER.join(",")} (got: ${lines[0]})`] };
  }

  const rows: ParsedCreativeMetricRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(",").map((p) => p.trim());
    if (parts.length !== CREATIVE_HEADER.length) {
      errors.push(`Line ${i + 1}: expected ${CREATIVE_HEADER.length} columns, got ${parts.length}.`);
      continue;
    }
    const [date, creativeName, ...rest] = parts;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date!)) {
      errors.push(`Line ${i + 1}: date "${date}" must be YYYY-MM-DD.`);
      continue;
    }
    if (!creativeName) {
      errors.push(`Line ${i + 1}: creative name is required.`);
      continue;
    }
    const numbers = rest.map(Number);
    if (numbers.some((n) => !Number.isFinite(n) || n < 0)) {
      errors.push(`Line ${i + 1}: all metric values must be non-negative numbers.`);
      continue;
    }
    rows.push({
      metric_date: date!,
      creativeName: creativeName!,
      spend: numbers[0]!,
      impressions: numbers[1]!,
      clicks: numbers[2]!,
      leads: numbers[3]!,
      conversions: numbers[4]!,
      revenue: numbers[5]!,
    });
  }

  return { rows, errors };
}
