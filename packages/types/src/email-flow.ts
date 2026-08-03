/**
 * Email lifecycle flow maths.
 *
 * The rates here are deliberately named after their denominators, because
 * the common way to overstate email performance is to quote a rate against
 * whichever denominator flatters it:
 *
 *   - Rates are taken against delivered, not sent. Quoting opens against
 *     sent counts bounces as people who did not open, which understates a
 *     healthy list and hides a deliverability problem behind a soft number.
 *   - Click-to-open is not the click rate. It is clicks over opens, always
 *     the larger figure, and reporting it as "click rate" inflates the
 *     result several times over.
 *   - Open rate is flagged unreliable by design. Mail privacy features
 *     pre-fetch images and register opens nobody performed, so opens are
 *     kept for trend watching and clicks are what decisions rest on.
 */

export const FLOW_TYPES = [
  "welcome",
  "nurture",
  "win_back",
  "post_purchase",
  "abandoned_cart",
  "re_engagement",
  "booking_reminder",
  "other",
] as const;

export type FlowType = (typeof FLOW_TYPES)[number];

export interface FlowStep {
  stepIndex: number;
  name: string;
  channel: "email" | "sms";
  /** Wait since the previous step, in hours. */
  delayHours: number;
  sent: number;
  delivered: number;
  opens: number;
  clicks: number;
  unsubscribes: number;
  conversions: number;
  revenue: number;
}

export interface StepPerformance {
  /** delivered / sent. Anything much below one is a deliverability problem. */
  deliveryRate: number | null;
  /**
   * opens / delivered. Inflated by mail privacy pre-fetching, so it is
   * reported for trend only and never used to rank steps.
   */
  openRate: number | null;
  /** clicks / delivered. This is the click rate. */
  clickRate: number | null;
  /** clicks / opens. Always larger than the click rate. Never call it that. */
  clickToOpenRate: number | null;
  unsubscribeRate: number | null;
  /** conversions / delivered. */
  conversionRate: number | null;
  revenuePerDelivered: number | null;
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function stepPerformance(step: FlowStep): StepPerformance {
  return {
    deliveryRate: rate(step.delivered, step.sent),
    openRate: rate(step.opens, step.delivered),
    clickRate: rate(step.clicks, step.delivered),
    clickToOpenRate: rate(step.clicks, step.opens),
    unsubscribeRate: rate(step.unsubscribes, step.delivered),
    conversionRate: rate(step.conversions, step.delivered),
    revenuePerDelivered: rate(step.revenue, step.delivered),
  };
}

/** Hours from entering the flow to this step going out. */
export function cumulativeDelayHours(steps: FlowStep[], stepIndex: number): number {
  return steps
    .filter((s) => s.stepIndex <= stepIndex)
    .reduce((total, s) => total + Math.max(0, s.delayHours), 0);
}

export function formatDelay(hours: number): string {
  if (hours <= 0) return "Immediately";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days} day${days === 1 ? "" : "s"}`;
}

export interface FlowSummary {
  steps: number;
  /** Hours from entry to the last step. */
  totalDurationHours: number;
  delivered: number;
  clicks: number;
  conversions: number;
  revenue: number;
  unsubscribes: number;
  clickRate: number | null;
  conversionRate: number | null;
  unsubscribeRate: number | null;
  revenuePerEntry: number | null;
}

export function summariseFlow(steps: FlowStep[], entered: number): FlowSummary {
  let delivered = 0;
  let clicks = 0;
  let conversions = 0;
  let revenue = 0;
  let unsubscribes = 0;

  for (const step of steps) {
    delivered += step.delivered;
    clicks += step.clicks;
    conversions += step.conversions;
    revenue += step.revenue;
    unsubscribes += step.unsubscribes;
  }

  const lastIndex = steps.length > 0 ? Math.max(...steps.map((s) => s.stepIndex)) : 0;

  return {
    steps: steps.length,
    totalDurationHours: cumulativeDelayHours(steps, lastIndex),
    delivered,
    clicks,
    conversions,
    revenue,
    unsubscribes,
    clickRate: rate(clicks, delivered),
    conversionRate: rate(conversions, delivered),
    unsubscribeRate: rate(unsubscribes, delivered),
    revenuePerEntry: rate(revenue, entered),
  };
}

/**
 * How much of the audience each step still reaches, relative to the first.
 * A sharp fall between two steps is either a long gap losing people or a
 * step burning the list, and both are worth seeing on the map.
 */
export interface StepReach {
  stepIndex: number;
  delivered: number;
  /** Share of the first step's delivered volume. Null when the first sent nothing. */
  shareOfFirst: number | null;
  /** Drop from the previous step, as a share of the previous step. */
  dropFromPrevious: number | null;
}

export function stepReach(steps: FlowStep[]): StepReach[] {
  const ordered = [...steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const first = ordered[0]?.delivered ?? 0;

  return ordered.map((step, position) => {
    const previous = position > 0 ? ordered[position - 1]!.delivered : null;
    return {
      stepIndex: step.stepIndex,
      delivered: step.delivered,
      shareOfFirst: first > 0 ? step.delivered / first : null,
      dropFromPrevious: previous !== null && previous > 0 ? (previous - step.delivered) / previous : null,
    };
  });
}

/**
 * Steps worth looking at, with the reason. Thresholds are conservative on
 * purpose: this is a prompt to review, not a verdict on a step.
 */
export const UNSUBSCRIBE_CONCERN_RATE = 0.005;
export const DELIVERY_CONCERN_RATE = 0.95;
export const MIN_DELIVERED_FOR_JUDGEMENT = 200;

export interface FlowFlag {
  stepIndex: number;
  reason: string;
}

export function flagSteps(steps: FlowStep[]): FlowFlag[] {
  const flags: FlowFlag[] = [];
  const reach = stepReach(steps);
  const byIndex = new Map(reach.map((r) => [r.stepIndex, r]));

  for (const step of [...steps].sort((a, b) => a.stepIndex - b.stepIndex)) {
    const performance = stepPerformance(step);

    // Below the volume floor, one unsubscribe swings the rate past any
    // threshold, so nothing is flagged on rates alone.
    if (step.delivered < MIN_DELIVERED_FOR_JUDGEMENT) continue;

    if (performance.unsubscribeRate !== null && performance.unsubscribeRate > UNSUBSCRIBE_CONCERN_RATE) {
      flags.push({
        stepIndex: step.stepIndex,
        reason: `Unsubscribes at ${(performance.unsubscribeRate * 100).toFixed(2)}% of delivered.`,
      });
    }

    if (performance.deliveryRate !== null && performance.deliveryRate < DELIVERY_CONCERN_RATE) {
      flags.push({
        stepIndex: step.stepIndex,
        reason: `Only ${(performance.deliveryRate * 100).toFixed(1)}% delivered, which points at list health.`,
      });
    }

    const drop = byIndex.get(step.stepIndex)?.dropFromPrevious ?? null;
    if (drop !== null && drop > 0.3) {
      flags.push({
        stepIndex: step.stepIndex,
        reason: `Reaches ${(drop * 100).toFixed(0)}% fewer people than the step before it.`,
      });
    }

    if (performance.clickRate === 0 && step.channel === "email") {
      flags.push({ stepIndex: step.stepIndex, reason: "No clicks at all on a meaningful send." });
    }
  }

  return flags;
}
