/**
 * Booking performance.
 *
 * For a business that runs on consultations, the numbers that matter are not
 * how many bookings were taken but how many turned up and what happened next.
 * Two traps are handled here deliberately:
 *
 *   1. A booking whose time has passed but which nobody has marked attended or
 *      no-show is unreconciled. Counting it as either would move the show rate,
 *      so it is counted as neither and surfaced as work to do.
 *   2. A rate with nothing behind it is withheld rather than reported as zero.
 *      "0% show rate" reads as a disaster; "no data yet" is the truth.
 */

export const BOOKING_STATUSES = [
  "booked",
  "confirmed",
  "attended",
  "rescheduled",
  "cancelled",
  "no_show",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const DEPOSIT_STATUSES = ["not_required", "pending", "paid", "refunded"] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export type BookingOutcome = "closed_won" | "closed_lost";

export interface BookingRecord {
  status: BookingStatus;
  /** ISO timestamp. */
  scheduledAt: string;
  depositStatus: DepositStatus;
  depositAmount?: number | null;
  outcome?: BookingOutcome | null;
  revenue?: number | null;
}

export interface BookingMetrics {
  total: number;
  upcoming: number;
  attended: number;
  noShow: number;
  cancelled: number;
  rescheduled: number;
  /** Past their time and still unresolved. These make every rate below provisional. */
  unreconciled: number;
  /** attended / (attended + no_show). Null when nothing has resolved yet. */
  showRate: number | null;
  /** closed_won / attended. Null when nobody has attended yet. */
  closeRate: number | null;
  revenue: number;
  revenuePerAttended: number | null;
  depositsOutstanding: number;
  depositsOutstandingAmount: number;
}

/** Statuses that mean the appointment is still ahead of us. */
const PENDING_STATUSES = new Set<BookingStatus>(["booked", "confirmed"]);

export function isUnreconciled(booking: BookingRecord, now: Date): boolean {
  return PENDING_STATUSES.has(booking.status) && new Date(booking.scheduledAt).getTime() < now.getTime();
}

export function isUpcoming(booking: BookingRecord, now: Date): boolean {
  return PENDING_STATUSES.has(booking.status) && new Date(booking.scheduledAt).getTime() >= now.getTime();
}

export function calculateBookingMetrics(bookings: BookingRecord[], now = new Date()): BookingMetrics {
  let upcoming = 0;
  let attended = 0;
  let noShow = 0;
  let cancelled = 0;
  let rescheduled = 0;
  let unreconciled = 0;
  let closedWon = 0;
  let revenue = 0;
  let depositsOutstanding = 0;
  let depositsOutstandingAmount = 0;

  for (const booking of bookings) {
    if (booking.status === "attended") attended += 1;
    else if (booking.status === "no_show") noShow += 1;
    else if (booking.status === "cancelled") cancelled += 1;
    else if (booking.status === "rescheduled") rescheduled += 1;

    if (isUpcoming(booking, now)) upcoming += 1;
    if (isUnreconciled(booking, now)) unreconciled += 1;

    if (booking.outcome === "closed_won") closedWon += 1;
    revenue += Number(booking.revenue ?? 0);

    // A pending deposit on a booking that was cancelled is not money we are
    // still waiting on, so only live bookings count towards what is owed.
    if (booking.depositStatus === "pending" && booking.status !== "cancelled") {
      depositsOutstanding += 1;
      depositsOutstandingAmount += Number(booking.depositAmount ?? 0);
    }
  }

  const resolved = attended + noShow;

  return {
    total: bookings.length,
    upcoming,
    attended,
    noShow,
    cancelled,
    rescheduled,
    unreconciled,
    showRate: resolved > 0 ? attended / resolved : null,
    closeRate: attended > 0 ? closedWon / attended : null,
    revenue,
    revenuePerAttended: attended > 0 ? revenue / attended : null,
    depositsOutstanding,
    depositsOutstandingAmount,
  };
}

/**
 * What the status may become next. A cancelled or attended booking is done,
 * and letting the UI move it anywhere would quietly corrupt the show rate.
 */
export function allowedNextStatuses(current: BookingStatus): BookingStatus[] {
  switch (current) {
    case "booked":
      return ["confirmed", "attended", "no_show", "rescheduled", "cancelled"];
    case "confirmed":
      return ["attended", "no_show", "rescheduled", "cancelled"];
    case "rescheduled":
      return ["booked", "confirmed", "cancelled"];
    case "attended":
    case "no_show":
    case "cancelled":
      return [];
  }
}

export function formatBookingStatus(status: BookingStatus): string {
  return status === "no_show" ? "No show" : status.charAt(0).toUpperCase() + status.slice(1);
}
