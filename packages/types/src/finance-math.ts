/**
 * Pure commercial calculations for Phase 2. Everything here is deliberately
 * dependency-free and unit-tested — the finance dashboard feeds it rows and
 * renders the results, nothing more.
 */

export interface RetainerLike {
  amount: number;
  billing_cadence: "monthly" | "quarterly";
  status: "active" | "paused" | "ended";
}

/** Monthly recurring revenue from retainers. Quarterly retainers count at one third per month. */
export function computeMrr(retainers: RetainerLike[]): number {
  return round2(
    retainers
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + (r.billing_cadence === "monthly" ? r.amount : r.amount / 3), 0),
  );
}

export interface ProfitabilityInputs {
  /** Payments received (or paid invoices) attributed to the client. */
  revenue: number;
  contractorCosts: number;
  /** Sum of task actual_hours x member hourly cost. */
  internalLabourCost: number;
  deliverySoftwareAllocation: number;
  paidMediaManagementAllocation: number;
}

export interface ProfitabilityResult {
  grossContribution: number;
  /** 0-1; null when revenue is zero (margin undefined, not 0%). */
  margin: number | null;
}

/**
 * Spec section 20 formula: revenue minus contractor costs minus internal
 * labour minus delivery software allocation minus paid media management
 * cost allocation equals gross contribution margin.
 */
export function computeGrossContribution(input: ProfitabilityInputs): ProfitabilityResult {
  const grossContribution = round2(
    input.revenue -
      input.contractorCosts -
      input.internalLabourCost -
      input.deliverySoftwareAllocation -
      input.paidMediaManagementAllocation,
  );
  return {
    grossContribution,
    margin: input.revenue > 0 ? round2(grossContribution / input.revenue) : null,
  };
}

export interface RenewalLike {
  end_date: string | null;
  renewal_notice_days?: number;
}

/**
 * True when the contract/retainer ends within its notice window (default 30
 * days) from `today`, or has already ended. No end date = nothing to renew.
 */
export function isRenewalDue(item: RenewalLike, today: Date): boolean {
  if (!item.end_date) return false;
  const noticeDays = item.renewal_notice_days ?? 30;
  const end = new Date(item.end_date + "T00:00:00Z");
  const windowStart = new Date(end);
  windowStart.setUTCDate(windowStart.getUTCDate() - noticeDays);
  return today >= windowStart;
}

export interface ScopeCreepInputs {
  includedHours: number | null;
  actualHoursThisPeriod: number;
}

export interface ScopeCreepResult {
  isOverIncludedHours: boolean;
  hoursOver: number;
  /** null when the retainer has no included-hours cap to measure against. */
  utilisation: number | null;
}

export function checkScopeCreep(input: ScopeCreepInputs): ScopeCreepResult {
  if (input.includedHours === null || input.includedHours <= 0) {
    return { isOverIncludedHours: false, hoursOver: 0, utilisation: null };
  }
  const hoursOver = round2(Math.max(0, input.actualHoursThisPeriod - input.includedHours));
  return {
    isOverIncludedHours: hoursOver > 0,
    hoursOver,
    utilisation: round2(input.actualHoursThisPeriod / input.includedHours),
  };
}

export interface ForecastInputs {
  mrr: number;
  /** Sent + overdue invoice totals not yet collected. */
  outstandingInvoiceTotal: number;
  /** Open pipeline value x a win-rate weighting (0-1). */
  openPipelineValue: number;
  pipelineWinRate?: number;
  months?: number;
}

/**
 * Deliberately simple forward revenue view: recurring revenue continues,
 * outstanding invoices collect once, weighted pipeline lands spread evenly.
 * Not a promise — a planning number, labelled as such in the UI.
 */
export function forecastRevenue(input: ForecastInputs): number[] {
  const months = input.months ?? 3;
  const winRate = input.pipelineWinRate ?? 0.3;
  const weightedPipelinePerMonth = (input.openPipelineValue * winRate) / months;
  return Array.from({ length: months }, (_, i) =>
    round2(input.mrr + weightedPipelinePerMonth + (i === 0 ? input.outstandingInvoiceTotal : 0)),
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
