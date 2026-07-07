"use client";

import { useState, useTransition } from "react";
import { Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createEvent, updateEventStatus, updateTicketSales } from "./actions";

const EVENT_STATUSES = ["planning", "on_sale", "live", "complete", "cancelled"] as const;

export function NewEventDialog({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> Add event</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add event</DialogTitle>
          <DialogDescription>Ticketed or promotional event tied to a client.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createEvent(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="event-name">Name</Label>
            <Input id="event-name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-client">Client</Label>
            <select id="event-client" name="clientId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Agency event</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-venue">Venue</Label>
            <Input id="event-venue" name="venue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-start">Starts</Label>
              <Input id="event-start" name="startsAt" type="datetime-local" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-end">Ends</Label>
              <Input id="event-end" name="endsAt" type="datetime-local" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-ticket">Ticket link</Label>
              <Input id="event-ticket" name="ticketLink" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-target">Target attendance</Label>
              <Input id="event-target" name="targetAttendance" type="number" min="0" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Add event
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EventStatusSelect({ eventId, status }: { eventId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      className="rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-50"
      value={status}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateEventStatus(eventId, e.target.value as (typeof EVENT_STATUSES)[number]))}
    >
      {EVENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}

export function TicketSalesDialog({ eventId, name, sold, revenue }: { eventId: string; name: string; sold: number; revenue: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost"><Ticket className="mr-1 size-3.5" /> Update sales</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ticket sales: {name}</DialogTitle>
          <DialogDescription>Running totals, updated from the ticketing platform.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await updateTicketSales(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="eventId" value={eventId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tickets-sold">Tickets sold</Label>
              <Input id="tickets-sold" name="ticketsSold" type="number" min="0" defaultValue={sold} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-revenue">Revenue (CAD)</Label>
              <Input id="ticket-revenue" name="ticketRevenue" type="number" min="0" step="0.01" defaultValue={revenue} required />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
