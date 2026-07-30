import { describe, expect, it } from "vitest";
import {
  allowedNextStatuses,
  calculateBookingMetrics,
  formatBookingStatus,
  isUnreconciled,
  isUpcoming,
  type BookingRecord,
} from "./booking-metrics";

const NOW = new Date("2026-07-30T12:00:00Z");
const PAST = "2026-07-28T15:00:00Z";
const FUTURE = "2026-08-05T15:00:00Z";

function booking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return { status: "booked", scheduledAt: FUTURE, depositStatus: "not_required", ...overrides };
}

describe("isUpcoming and isUnreconciled", () => {
  it("treats a future pending booking as upcoming", () => {
    expect(isUpcoming(booking({ status: "confirmed", scheduledAt: FUTURE }), NOW)).toBe(true);
    expect(isUnreconciled(booking({ status: "confirmed", scheduledAt: FUTURE }), NOW)).toBe(false);
  });

  it("flags a past booking nobody has resolved", () => {
    const stale = booking({ status: "booked", scheduledAt: PAST });
    expect(isUnreconciled(stale, NOW)).toBe(true);
    expect(isUpcoming(stale, NOW)).toBe(false);
  });

  it("does not flag a past booking that was resolved", () => {
    expect(isUnreconciled(booking({ status: "attended", scheduledAt: PAST }), NOW)).toBe(false);
    expect(isUnreconciled(booking({ status: "no_show", scheduledAt: PAST }), NOW)).toBe(false);
    expect(isUnreconciled(booking({ status: "cancelled", scheduledAt: PAST }), NOW)).toBe(false);
  });
});

describe("calculateBookingMetrics", () => {
  it("withholds rates when nothing has resolved rather than reporting zero", () => {
    const metrics = calculateBookingMetrics([booking(), booking()], NOW);
    expect(metrics.showRate).toBeNull();
    expect(metrics.closeRate).toBeNull();
    expect(metrics.revenuePerAttended).toBeNull();
    expect(metrics.upcoming).toBe(2);
  });

  it("computes show rate from resolved bookings only", () => {
    const metrics = calculateBookingMetrics(
      [
        booking({ status: "attended", scheduledAt: PAST }),
        booking({ status: "attended", scheduledAt: PAST }),
        booking({ status: "attended", scheduledAt: PAST }),
        booking({ status: "no_show", scheduledAt: PAST }),
        // Neither of these should move the show rate.
        booking({ status: "cancelled", scheduledAt: PAST }),
        booking({ status: "booked", scheduledAt: FUTURE }),
      ],
      NOW,
    );
    expect(metrics.showRate).toBeCloseTo(0.75, 5);
    expect(metrics.attended).toBe(3);
    expect(metrics.noShow).toBe(1);
    expect(metrics.cancelled).toBe(1);
  });

  it("counts an unreconciled booking without letting it move the show rate", () => {
    const metrics = calculateBookingMetrics(
      [
        booking({ status: "attended", scheduledAt: PAST }),
        booking({ status: "no_show", scheduledAt: PAST }),
        booking({ status: "booked", scheduledAt: PAST }),
      ],
      NOW,
    );
    expect(metrics.unreconciled).toBe(1);
    expect(metrics.showRate).toBeCloseTo(0.5, 5);
  });

  it("computes close rate and revenue per attended booking", () => {
    const metrics = calculateBookingMetrics(
      [
        booking({ status: "attended", scheduledAt: PAST, outcome: "closed_won", revenue: 2400 }),
        booking({ status: "attended", scheduledAt: PAST, outcome: "closed_lost" }),
        booking({ status: "attended", scheduledAt: PAST, outcome: "closed_won", revenue: 1600 }),
        booking({ status: "attended", scheduledAt: PAST }),
      ],
      NOW,
    );
    expect(metrics.closeRate).toBeCloseTo(0.5, 5);
    expect(metrics.revenue).toBe(4000);
    expect(metrics.revenuePerAttended).toBe(1000);
  });

  it("counts outstanding deposits but ignores cancelled bookings", () => {
    const metrics = calculateBookingMetrics(
      [
        booking({ depositStatus: "pending", depositAmount: 50 }),
        booking({ depositStatus: "pending", depositAmount: 75 }),
        booking({ status: "cancelled", depositStatus: "pending", depositAmount: 200 }),
        booking({ depositStatus: "paid", depositAmount: 50 }),
      ],
      NOW,
    );
    expect(metrics.depositsOutstanding).toBe(2);
    expect(metrics.depositsOutstandingAmount).toBe(125);
  });

  it("handles an empty list without dividing by zero", () => {
    const metrics = calculateBookingMetrics([], NOW);
    expect(metrics.total).toBe(0);
    expect(metrics.showRate).toBeNull();
    expect(metrics.revenue).toBe(0);
  });
});

describe("allowedNextStatuses", () => {
  it("lets a booking be confirmed, resolved or moved", () => {
    expect(allowedNextStatuses("booked")).toContain("confirmed");
    expect(allowedNextStatuses("booked")).toContain("no_show");
  });

  it("does not offer confirming a booking that already happened", () => {
    expect(allowedNextStatuses("confirmed")).not.toContain("booked");
  });

  it("closes off resolved bookings so the show rate cannot be rewritten", () => {
    expect(allowedNextStatuses("attended")).toEqual([]);
    expect(allowedNextStatuses("no_show")).toEqual([]);
    expect(allowedNextStatuses("cancelled")).toEqual([]);
  });

  it("lets a rescheduled booking be rebooked", () => {
    expect(allowedNextStatuses("rescheduled")).toContain("booked");
  });
});

describe("formatBookingStatus", () => {
  it("reads as English, not as a database value", () => {
    expect(formatBookingStatus("no_show")).toBe("No show");
    expect(formatBookingStatus("attended")).toBe("Attended");
  });
});
