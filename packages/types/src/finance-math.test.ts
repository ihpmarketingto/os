import { describe, expect, it } from "vitest";
import {
  checkScopeCreep,
  computeGrossContribution,
  computeMrr,
  forecastRevenue,
  isRenewalDue,
} from "./finance-math";

describe("computeMrr", () => {
  it("sums active monthly retainers and thirds quarterly ones", () => {
    expect(
      computeMrr([
        { amount: 4500, billing_cadence: "monthly", status: "active" },
        { amount: 9000, billing_cadence: "quarterly", status: "active" },
        { amount: 2000, billing_cadence: "monthly", status: "paused" },
        { amount: 1000, billing_cadence: "monthly", status: "ended" },
      ]),
    ).toBe(7500);
  });

  it("is zero with no active retainers", () => {
    expect(computeMrr([])).toBe(0);
  });
});

describe("computeGrossContribution", () => {
  it("applies the spec formula exactly", () => {
    const result = computeGrossContribution({
      revenue: 10000,
      contractorCosts: 2000,
      internalLabourCost: 3000,
      deliverySoftwareAllocation: 500,
      paidMediaManagementAllocation: 500,
    });
    expect(result.grossContribution).toBe(4000);
    expect(result.margin).toBe(0.4);
  });

  it("returns null margin (not 0%) when there is no revenue", () => {
    const result = computeGrossContribution({
      revenue: 0,
      contractorCosts: 100,
      internalLabourCost: 0,
      deliverySoftwareAllocation: 0,
      paidMediaManagementAllocation: 0,
    });
    expect(result.grossContribution).toBe(-100);
    expect(result.margin).toBeNull();
  });
});

describe("isRenewalDue", () => {
  const today = new Date("2026-07-06T12:00:00Z");

  it("is due inside the notice window", () => {
    expect(isRenewalDue({ end_date: "2026-07-20", renewal_notice_days: 30 }, today)).toBe(true);
  });

  it("is not due outside the notice window", () => {
    expect(isRenewalDue({ end_date: "2026-12-31", renewal_notice_days: 30 }, today)).toBe(false);
  });

  it("is due when the end date has already passed", () => {
    expect(isRenewalDue({ end_date: "2026-06-01", renewal_notice_days: 30 }, today)).toBe(true);
  });

  it("is never due without an end date", () => {
    expect(isRenewalDue({ end_date: null }, today)).toBe(false);
  });

  it("defaults the notice window to 30 days", () => {
    expect(isRenewalDue({ end_date: "2026-08-04" }, today)).toBe(true);
    expect(isRenewalDue({ end_date: "2026-08-06" }, today)).toBe(false);
  });
});

describe("checkScopeCreep", () => {
  it("flags hours over the included cap", () => {
    const result = checkScopeCreep({ includedHours: 20, actualHoursThisPeriod: 26 });
    expect(result.isOverIncludedHours).toBe(true);
    expect(result.hoursOver).toBe(6);
    expect(result.utilisation).toBe(1.3);
  });

  it("does not flag under-cap usage", () => {
    const result = checkScopeCreep({ includedHours: 20, actualHoursThisPeriod: 12 });
    expect(result.isOverIncludedHours).toBe(false);
    expect(result.utilisation).toBe(0.6);
  });

  it("returns null utilisation with no cap", () => {
    const result = checkScopeCreep({ includedHours: null, actualHoursThisPeriod: 40 });
    expect(result.isOverIncludedHours).toBe(false);
    expect(result.utilisation).toBeNull();
  });
});

describe("forecastRevenue", () => {
  it("front-loads outstanding invoices and spreads weighted pipeline", () => {
    const months = forecastRevenue({
      mrr: 10000,
      outstandingInvoiceTotal: 3000,
      openPipelineValue: 30000,
      pipelineWinRate: 0.3,
      months: 3,
    });
    expect(months).toEqual([16000, 13000, 13000]);
  });
});
