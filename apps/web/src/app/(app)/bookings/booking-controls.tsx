"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, CircleDollarSign, Target } from "lucide-react";
import { toast } from "sonner";
import { allowedNextStatuses, formatBookingStatus, type BookingStatus } from "@ihp/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBooking, recordBookingOutcome, updateBookingStatus, updateDepositStatus } from "./actions";

export interface ClientChoice {
  id: string;
  name: string;
}

export interface LeadChoice {
  id: string;
  name: string;
}

export function NewBookingDialog({ clients, leads }: { clients: ClientChoice[]; leads: LeadChoice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <CalendarPlus className="mr-1 size-3.5" /> Add booking
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add booking</DialogTitle>
          <DialogDescription>
            A consultation or appointment. Link it to the lead it came from so the source gets credit when it closes.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createBooking(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="bk-title">Title</Label>
            <Input id="bk-title" name="title" required placeholder="e.g. Skin consultation - Priya N" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bk-when">Date and time</Label>
              <Input id="bk-when" name="scheduledAt" type="datetime-local" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-duration">Minutes</Label>
              <Input id="bk-duration" name="durationMinutes" type="number" min={5} step={5} defaultValue={30} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bk-client">Client</Label>
            <select id="bk-client" name="clientId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Agency booking</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bk-lead">From lead</Label>
              <select id="bk-lead" name="leadId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Not from a tracked lead</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-deposit">Deposit (optional)</Label>
              <Input id="bk-deposit" name="depositAmount" type="number" min={0} step="0.01" placeholder="50.00" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Add booking
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_TONE: Record<BookingStatus, string> = {
  booked: "border-border text-muted-foreground",
  confirmed: "border-brand/40 text-brand",
  attended: "border-success/40 text-success",
  rescheduled: "border-border text-muted-foreground",
  cancelled: "border-border text-muted-foreground",
  no_show: "border-risk/40 text-risk",
};

/**
 * Resolved bookings have no onward transitions, so they render as a plain
 * badge. That is the point: the show rate should not be editable after the fact.
 */
export function BookingStatusControl({ bookingId, status }: { bookingId: string; status: BookingStatus }) {
  const [isPending, startTransition] = useTransition();
  const next = allowedNextStatuses(status);

  if (next.length === 0) {
    return (
      <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[status]}`}>
        {formatBookingStatus(status)}
      </Badge>
    );
  }

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) =>
        startTransition(async () => {
          const result = await updateBookingStatus(bookingId, event.target.value as BookingStatus);
          if (result.error) toast.error(result.error);
        })
      }
      className="rounded-md border bg-background px-2 py-1 text-xs"
    >
      <option value={status}>{formatBookingStatus(status)}</option>
      {next.map((s) => (
        <option key={s} value={s}>
          {formatBookingStatus(s)}
        </option>
      ))}
    </select>
  );
}

export function DepositControl({
  bookingId,
  depositStatus,
  amount,
}: {
  bookingId: string;
  depositStatus: "not_required" | "pending" | "paid" | "refunded";
  amount: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  if (depositStatus === "not_required") return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <div className="flex items-center gap-1.5">
      <CircleDollarSign className="size-3.5 text-muted-foreground" />
      <select
        value={depositStatus}
        disabled={isPending}
        onChange={(event) =>
          startTransition(async () => {
            const result = await updateDepositStatus(
              bookingId,
              event.target.value as "not_required" | "pending" | "paid" | "refunded",
            );
            if (result.error) toast.error(result.error);
          })
        }
        className="rounded-md border bg-background px-2 py-1 text-xs"
      >
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="refunded">Refunded</option>
      </select>
      {amount ? <span className="text-xs text-muted-foreground">${amount.toFixed(2)}</span> : null}
    </div>
  );
}

export function OutcomeDialog({
  bookingId,
  title,
  outcome,
}: {
  bookingId: string;
  title: string;
  outcome: "closed_won" | "closed_lost" | null;
}) {
  const [open, setOpen] = useState(false);

  if (outcome) {
    return (
      <Badge variant="outline" className={`text-[10px] ${outcome === "closed_won" ? "border-success/40 text-success" : ""}`}>
        {outcome === "closed_won" ? "Won" : "Lost"}
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Target className="mr-1 size-3.5" /> Outcome
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record outcome</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await recordBookingOutcome(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Outcome recorded.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <input type="hidden" name="bookingId" value={bookingId} />
          <div className="space-y-1.5">
            <Label htmlFor="oc-outcome">Outcome</Label>
            <select id="oc-outcome" name="outcome" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="closed_won">Closed won</option>
              <option value="closed_lost">Closed lost</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oc-revenue">Revenue, if won</Label>
            <Input id="oc-revenue" name="revenue" type="number" min={0} step="0.01" placeholder="2400.00" />
          </div>
          <Button type="submit" className="w-full">
            Save outcome
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
