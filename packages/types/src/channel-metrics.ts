/**
 * Channel-agnostic performance aggregation (spec sections 15-18). Feed it
 * campaign_metrics rows, get the derived rates every channel report needs.
 * All derived values are null (not 0) when the denominator is zero, so the
 * UI can honestly show "no data" instead of a fake 0%.
 */

export interface MetricRowLike {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
}

export interface ChannelSummary {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  conversionRate: number | null;
}

export function computeChannelSummary(rows: MetricRowLike[]): ChannelSummary {
  const totals = rows.reduce(
    (acc, row) => ({
      spend: acc.spend + Number(row.spend),
      impressions: acc.impressions + Number(row.impressions),
      clicks: acc.clicks + Number(row.clicks),
      leads: acc.leads + Number(row.leads),
      conversions: acc.conversions + Number(row.conversions),
      revenue: acc.revenue + Number(row.revenue),
    }),
    { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, revenue: 0 },
  );

  return {
    ...totals,
    ctr: ratio(totals.clicks, totals.impressions),
    cpc: ratio(totals.spend, totals.clicks),
    cpm: totals.impressions > 0 ? round4((totals.spend / totals.impressions) * 1000) : null,
    cpl: ratio(totals.spend, totals.leads),
    cpa: ratio(totals.spend, totals.conversions),
    roas: ratio(totals.revenue, totals.spend),
    conversionRate: ratio(totals.conversions, totals.clicks),
  };
}

/**
 * Parses the documented import format for channel metrics:
 *   date,spend,impressions,clicks,leads,conversions,revenue
 * Header row required. Blank lines skipped. Returns row errors by line
 * number instead of throwing, so a partial paste gets a precise message.
 */
export interface ParsedMetricRow extends MetricRowLike {
  metric_date: string;
}

export interface CsvParseResult {
  rows: ParsedMetricRow[];
  errors: string[];
}

const EXPECTED_HEADER = ["date", "spend", "impressions", "clicks", "leads", "conversions", "revenue"];

export function parseMetricsCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return { rows: [], errors: ["The file is empty."] };

  const header = lines[0]!.toLowerCase().split(",").map((h) => h.trim());
  if (EXPECTED_HEADER.some((column, i) => header[i] !== column)) {
    return {
      rows: [],
      errors: [`Header must be exactly: ${EXPECTED_HEADER.join(",")} (got: ${lines[0]})`],
    };
  }

  const rows: ParsedMetricRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(",").map((p) => p.trim());
    if (parts.length !== EXPECTED_HEADER.length) {
      errors.push(`Line ${i + 1}: expected ${EXPECTED_HEADER.length} columns, got ${parts.length}.`);
      continue;
    }
    const [date, spend, impressions, clicks, leads, conversions, revenue] = parts;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date!)) {
      errors.push(`Line ${i + 1}: date "${date}" must be YYYY-MM-DD.`);
      continue;
    }
    const numbers = [spend, impressions, clicks, leads, conversions, revenue].map(Number);
    if (numbers.some((n) => !Number.isFinite(n) || n < 0)) {
      errors.push(`Line ${i + 1}: all metric values must be non-negative numbers.`);
      continue;
    }
    rows.push({
      metric_date: date!,
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

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round4(numerator / denominator) : null;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
