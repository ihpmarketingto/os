import { describe, expect, it } from "vitest";
import {
  allowedNextProposalStatuses,
  calculateProposalTotals,
  checkProposalReadiness,
  lineTotal,
  monthlyEquivalent,
  proposalHeadlineAmount,
  type ProposalLine,
} from "./proposal-math";

function line(overrides: Partial<ProposalLine> = {}): ProposalLine {
  return {
    id: Math.random().toString(36).slice(2),
    description: "Line",
    cadence: "one_time",
    quantity: 1,
    unitPrice: 1000,
    ...overrides,
  };
}

describe("lineTotal and monthlyEquivalent", () => {
  it("multiplies quantity by price", () => {
    expect(lineTotal(line({ quantity: 3, unitPrice: 250 }))).toBe(750);
  });

  it("gives a one-time line no monthly value", () => {
    expect(monthlyEquivalent(line({ cadence: "one_time", unitPrice: 5000 }))).toBe(0);
  });

  it("divides a quarterly line rather than counting it as monthly", () => {
    expect(monthlyEquivalent(line({ cadence: "quarterly", unitPrice: 900 }))).toBe(300);
  });
});

describe("calculateProposalTotals", () => {
  it("never blends one-time and recurring into a single figure", () => {
    const totals = calculateProposalTotals([
      line({ cadence: "one_time", unitPrice: 4000 }),
      line({ cadence: "monthly", unitPrice: 2000 }),
    ]);
    expect(totals.oneTime).toBe(4000);
    expect(totals.monthlyRecurring).toBe(2000);
    // The first invoice is build plus one month, not build plus a year.
    expect(totals.firstInvoice).toBe(6000);
    expect(totals.annualRecurring).toBe(24000);
    expect(totals.hasMixedCadence).toBe(true);
  });

  it("does not claim mixed cadence when everything recurs", () => {
    const totals = calculateProposalTotals([
      line({ cadence: "monthly", unitPrice: 1500 }),
      line({ cadence: "quarterly", unitPrice: 600 }),
    ]);
    expect(totals.hasMixedCadence).toBe(false);
    expect(totals.oneTime).toBe(0);
    expect(totals.monthlyRecurring).toBe(1700);
  });

  it("excludes one-time work from the annual recurring figure", () => {
    const totals = calculateProposalTotals([
      line({ cadence: "one_time", unitPrice: 10000 }),
      line({ cadence: "monthly", unitPrice: 1000 }),
    ]);
    expect(totals.annualRecurring).toBe(12000);
  });

  it("handles a proposal with no lines", () => {
    const totals = calculateProposalTotals([]);
    expect(totals.firstInvoice).toBe(0);
    expect(totals.hasMixedCadence).toBe(false);
    expect(totals.lineCount).toBe(0);
  });
});

describe("proposalHeadlineAmount", () => {
  it("stores the first invoice, not an overstated annual value", () => {
    const lines = [line({ cadence: "one_time", unitPrice: 3000 }), line({ cadence: "monthly", unitPrice: 2500 })];
    expect(proposalHeadlineAmount(lines)).toBe(5500);
    // Guards against anyone switching this to annualised and inflating every
    // proposal in the pipeline overnight.
    expect(proposalHeadlineAmount(lines)).not.toBe(33000);
  });
});

describe("allowedNextProposalStatuses", () => {
  it("only lets a draft be sent", () => {
    expect(allowedNextProposalStatuses("draft")).toEqual(["sent"]);
  });

  it("does not let a sent proposal go back to draft", () => {
    expect(allowedNextProposalStatuses("sent")).not.toContain("draft");
  });

  it("closes off decided proposals", () => {
    expect(allowedNextProposalStatuses("accepted")).toEqual([]);
    expect(allowedNextProposalStatuses("declined")).toEqual([]);
    expect(allowedNextProposalStatuses("expired")).toEqual([]);
  });
});

describe("checkProposalReadiness", () => {
  const validUntil = "2026-09-30";

  it("passes a complete proposal", () => {
    const result = checkProposalReadiness({
      clientId: "client-1",
      lines: [line({ cadence: "monthly", unitPrice: 2000 })],
      validUntil,
    });
    expect(result).toEqual({ ready: true, blockers: [] });
  });

  it("blocks a proposal with no lines", () => {
    const result = checkProposalReadiness({ clientId: "client-1", lines: [], validUntil });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("There are no line items.");
  });

  it("blocks a proposal priced entirely at zero", () => {
    const result = checkProposalReadiness({
      clientId: "client-1",
      lines: [line({ unitPrice: 0 })],
      validUntil,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("zero"))).toBe(true);
  });

  it("blocks a proposal with no client and no expiry, listing both", () => {
    const result = checkProposalReadiness({
      clientId: null,
      lines: [line({ unitPrice: 500 })],
      validUntil: null,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toHaveLength(2);
  });

  it("does not complain about zero pricing when there are no lines to price", () => {
    const result = checkProposalReadiness({ clientId: "client-1", lines: [], validUntil });
    expect(result.blockers.some((b) => b.includes("zero"))).toBe(false);
  });
});
