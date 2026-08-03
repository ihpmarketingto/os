"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildMonthGrid,
  groupByDate,
  isSameCalendarDay,
  monthLabel,
  shiftMonth,
  summariseCadence,
} from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CONTENT_STATUSES, type ContentStatus } from "@/lib/content/constants";
import type { ContentCardData } from "./content-board";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Statuses that mean the item is committed to a date, not just pencilled in. */
const COMMITTED: ReadonlySet<ContentStatus> = new Set<ContentStatus>(["approved", "scheduled", "published"]);

const STATUS_LABEL = new Map(CONTENT_STATUSES.map((s) => [s.value, s.label]));

export interface CalendarItem extends ContentCardData {
  publishDate: string | null;
}

export function ContentCalendar({ items, today }: { items: CalendarItem[]; today: string }) {
  // Today is passed in from the server so the first render matches and the
  // component does not read the clock during render.
  const initial = useMemo(() => {
    const [year, month] = today.split("-").map(Number);
    return { year: year!, month: month! - 1 };
  }, [today]);

  const [cursor, setCursor] = useState(initial);
  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month, 0), [cursor]);
  const byDate = useMemo(() => groupByDate(items), [items]);
  const cadence = useMemo(() => summariseCadence(items, cursor.year, cursor.month), [items, cursor]);

  const todayDate = useMemo(() => {
    const [year, month, day] = today.split("-").map(Number);
    return new Date(year!, month! - 1, day!);
  }, [today]);

  const unscheduled = items.filter((i) => !i.publishDate);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <p className="min-w-[10rem] text-center font-heading text-lg">
            {monthLabel(cursor.year, cursor.month)}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(initial)}>
            Today
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {cadence.scheduled} scheduled across {cadence.activeDays} day
          {cadence.activeDays === 1 ? "" : "s"}
          {cadence.longestGapDays > 6 ? ` · longest quiet run ${cadence.longestGapDays} days` : ""}
          {cadence.busiestDayCount > 3 ? ` · busiest day ${cadence.busiestDayCount} posts` : ""}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-7 gap-px">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-1 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px rounded-lg border bg-border">
            {grid.flat().map((cell) => {
              const dayItems = byDate.get(cell.key) ?? [];
              const isToday = isSameCalendarDay(cell.date, todayDate);
              return (
                <div
                  key={cell.key}
                  className={`min-h-[7rem] bg-background p-1.5 ${cell.inMonth ? "" : "opacity-40"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-xs ${
                        isToday
                          ? "flex size-5 items-center justify-center rounded-full bg-brand font-medium text-brand-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {dayItems.length > 2 ? (
                      <span className="text-[10px] text-muted-foreground">{dayItems.length}</span>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <Link
                        key={item.id}
                        href={`/content-studio?item=${item.id}`}
                        title={`${item.hook ?? "Untitled"} — ${STATUS_LABEL.get(item.status) ?? item.status}`}
                        className={`block truncate rounded px-1.5 py-1 text-[11px] leading-tight ${
                          COMMITTED.has(item.status)
                            ? "bg-brand/15 text-foreground"
                            : "border border-dashed text-muted-foreground"
                        }`}
                      >
                        {item.platform ? <span className="font-medium">{item.platform}: </span> : null}
                        {item.hook ?? "Untitled"}
                      </Link>
                    ))}
                    {dayItems.length > 3 ? (
                      <p className="px-1.5 text-[10px] text-muted-foreground">+{dayItems.length - 3} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Solid items are approved, scheduled or published. Dashed items still have a date but are not signed off yet.
      </p>

      {unscheduled.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-2 text-sm font-medium">
              {unscheduled.length} item{unscheduled.length === 1 ? "" : "s"} with no publish date
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unscheduled.map((item) => (
                <Badge key={item.id} variant="outline" className="max-w-[18rem] truncate text-[11px]">
                  {item.clientName}: {item.hook ?? "Untitled"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
