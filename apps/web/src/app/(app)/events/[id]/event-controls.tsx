"use client";

import { useState, useTransition } from "react";
import { Handshake, ListPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addDeliverable,
  addSegment,
  addSponsor,
  toggleDeliverable,
  toggleSegmentComplete,
  updateSponsorStatus,
} from "./actions";

export function AddSegmentDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <ListPlus className="mr-1 size-3.5" /> Add segment
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a segment</DialogTitle>
          <DialogDescription>
            Timed from the event start, not the clock. Move the event and the whole run of show moves with it.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await addSegment(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Segment added.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <input type="hidden" name="eventId" value={eventId} />
          <div className="space-y-1.5">
            <Label htmlFor="sg-title">What happens</Label>
            <Input id="sg-title" name="title" required placeholder="e.g. Welcome and housekeeping" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sg-start">Starts (minutes after doors)</Label>
              <Input id="sg-start" name="startsAfterMinutes" type="number" min={0} defaultValue={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sg-duration">Runs for (minutes)</Label>
              <Input id="sg-duration" name="durationMinutes" type="number" min={1} defaultValue={15} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sg-owner">Who runs it</Label>
              <Input id="sg-owner" name="ownerName" placeholder="e.g. Sarah" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sg-location">Where</Label>
              <Input id="sg-location" name="location" placeholder="e.g. Main room" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sg-notes">Notes</Label>
            <Textarea id="sg-notes" name="notes" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Add segment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SegmentCheck({ segmentId, done }: { segmentId: string; done: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <input
      type="checkbox"
      checked={done}
      disabled={isPending}
      aria-label="Mark segment done"
      className="size-4"
      onChange={(event) => {
        const next = event.target.checked;
        startTransition(async () => {
          const result = await toggleSegmentComplete(segmentId, next);
          if (result.error) toast.error(result.error);
        });
      }}
    />
  );
}

export function AddSponsorDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Handshake className="mr-1 size-3.5" /> Add sponsor
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a sponsor</DialogTitle>
          <DialogDescription>
            Cash and in-kind are kept apart so they are never added together by accident.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await addSponsor(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Sponsor added.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <input type="hidden" name="eventId" value={eventId} />
          <div className="space-y-1.5">
            <Label htmlFor="sp-name">Sponsor</Label>
            <Input id="sp-name" name="name" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-tier">Tier</Label>
              <select id="sp-tier" name="tier" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="title">Title</option>
                <option value="presenting">Presenting</option>
                <option value="supporting">Supporting</option>
                <option value="in_kind">In kind</option>
                <option value="media">Media</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-cash">Cash committed</Label>
              <Input id="sp-cash" name="cashAmount" type="number" min={0} step="0.01" defaultValue={0} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-inkind">In kind, if any</Label>
            <Input id="sp-inkind" name="inKindDescription" placeholder="e.g. Venue and catering" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-contact">Contact</Label>
              <Input id="sp-contact" name="contactName" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-email">Email</Label>
              <Input id="sp-email" name="contactEmail" type="email" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Add sponsor
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SponsorStatusSelect({ sponsorId, status }: { sponsorId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) =>
        startTransition(async () => {
          const result = await updateSponsorStatus(
            sponsorId,
            event.target.value as "prospect" | "pitched" | "committed" | "paid" | "declined",
          );
          if (result.error) toast.error(result.error);
        })
      }
      className="rounded-md border bg-background px-2 py-1 text-xs"
    >
      <option value="prospect">Prospect</option>
      <option value="pitched">Pitched</option>
      <option value="committed">Committed</option>
      <option value="paid">Paid</option>
      <option value="declined">Declined</option>
    </select>
  );
}

export function AddDeliverableForm({ sponsorId }: { sponsorId: string }) {
  return (
    <form
      action={async (formData) => {
        const result = await addDeliverable(formData);
        if (result.error) toast.error(result.error);
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="sponsorId" value={sponsorId} />
      <Input name="description" required placeholder="What was promised" className="h-8 max-w-xs text-xs" />
      <Input name="dueDate" type="date" className="h-8 w-36 text-xs" />
      <Button type="submit" size="sm" variant="ghost">
        <Plus className="mr-1 size-3.5" /> Add
      </Button>
    </form>
  );
}

export function DeliverableCheck({ deliverableId, done }: { deliverableId: string; done: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <input
      type="checkbox"
      checked={done}
      disabled={isPending}
      aria-label="Mark delivered"
      className="size-3.5"
      onChange={(event) => {
        const next = event.target.checked;
        startTransition(async () => {
          const result = await toggleDeliverable(deliverableId, next);
          if (result.error) toast.error(result.error);
        });
      }}
    />
  );
}
