/**
 * Month grid for the content calendar.
 *
 * The trap this exists to avoid is timezone drift. Postgres `date` columns
 * arrive as "2026-07-01", and `new Date("2026-07-01")` parses that as
 * midnight UTC. Anywhere west of Greenwich that is the previous evening, so
 * a post scheduled for the 1st renders on the 30th. Every date-only value
 * here is parsed and formatted as a local calendar day, never through the
 * UTC path.
 */

/** Parses a "YYYY-MM-DD" string as a local calendar day, not as UTC midnight. */
export function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats a Date as "YYYY-MM-DD" using its local parts, never toISOString. */
export function toCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export interface CalendarCell {
  date: Date;
  key: string;
  /** False for the leading and trailing days borrowed from adjacent months. */
  inMonth: boolean;
}

/**
 * Builds a month as whole weeks, including the days either side needed to
 * fill the first and last rows. `weekStartsOn` is 0 for Sunday.
 */
export function buildMonthGrid(year: number, month: number, weekStartsOn = 0): CalendarCell[][] {
  const firstOfMonth = new Date(year, month, 1);
  const offset = (firstOfMonth.getDay() - weekStartsOn + 7) % 7;

  const start = new Date(year, month, 1 - offset);
  const weeks: CalendarCell[][] = [];
  const cursor = new Date(start);

  // Six rows covers every possible month layout, but stop early when the
  // remaining rows would be entirely in the next month.
  for (let week = 0; week < 6; week += 1) {
    const row: CalendarCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(cursor);
      row.push({ date, key: toCalendarDate(date), inMonth: date.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
    if (row.every((cell) => !cell.inMonth) && week > 3) {
      weeks.pop();
      break;
    }
  }

  return weeks;
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
}

/** Steps a year/month pair without rolling over incorrectly at the boundaries. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export interface SchedulableItem {
  id: string;
  /** "YYYY-MM-DD" or null when nothing is scheduled. */
  publishDate: string | null;
}

/** Groups items by the local calendar day they publish on. */
export function groupByDate<T extends SchedulableItem>(items: T[]): Map<string, T[]> {
  const byDate = new Map<string, T[]>();
  for (const item of items) {
    if (!item.publishDate) continue;
    const parsed = parseCalendarDate(item.publishDate);
    if (!parsed) continue;
    const key = toCalendarDate(parsed);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(item);
  }
  return byDate;
}

export interface CadenceSummary {
  scheduled: number;
  unscheduled: number;
  /** Days in the month carrying at least one item. */
  activeDays: number;
  busiestDayCount: number;
  /** Longest run of consecutive days in the month with nothing scheduled. */
  longestGapDays: number;
}

/**
 * Cadence across a month. A content plan fails in two ways that a list view
 * hides: everything landing on three days, and a fortnight of silence. Both
 * are visible here.
 */
export function summariseCadence(
  items: SchedulableItem[],
  year: number,
  month: number,
): CadenceSummary {
  const byDate = groupByDate(items);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let activeDays = 0;
  let busiestDayCount = 0;
  let longestGapDays = 0;
  let currentGap = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = toCalendarDate(new Date(year, month, day));
    const count = byDate.get(key)?.length ?? 0;
    if (count > 0) {
      activeDays += 1;
      busiestDayCount = Math.max(busiestDayCount, count);
      currentGap = 0;
    } else {
      currentGap += 1;
      longestGapDays = Math.max(longestGapDays, currentGap);
    }
  }

  // Scheduled counts only what lands inside this month, so the figure agrees
  // with what the grid actually shows.
  let scheduled = 0;
  for (const [key, list] of byDate) {
    const parsed = parseCalendarDate(key)!;
    if (parsed.getFullYear() === year && parsed.getMonth() === month) scheduled += list.length;
  }

  return {
    scheduled,
    unscheduled: items.filter((i) => !i.publishDate).length,
    activeDays,
    busiestDayCount,
    longestGapDays,
  };
}
