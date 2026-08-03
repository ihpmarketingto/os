"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { allowedNextPitchStatuses, type PitchStatus } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
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
import { createPitch, logFollowUp, recordPlacement, updatePitchStatus } from "./pitch-actions";

export interface Choice {
  id: string;
  name: string;
}

const STATUS_LABEL: Record<PitchStatus, string> = {
  drafted: "Drafted",
  sent: "Sent",
  responded: "Responded",
  declined: "Declined",
  confirmed: "Confirmed",
};

const STATUS_TONE: Record<PitchStatus, string> = {
  drafted: "border-border text-muted-foreground",
  sent: "border-brand/40 text-brand",
  responded: "border-brand/40 text-brand",
  declined: "border-border text-muted-foreground",
  confirmed: "border-success/40 text-success",
};

export function NewPitchDialog({
  clients,
  mediaContacts,
  influencers,
}: {
  clients: Choice[];
  mediaContacts: Choice[];
  influencers: Choice[];
}) {
  const [open, setOpen] = useState(false);
  const [contactType, setContactType] = useState<"media" | "influencer">("media");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Send className="mr-1 size-3.5" /> New pitch
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New pitch</DialogTitle>
          <DialogDescription>
            Logs the pitch so it can be chased and its result recorded. It does not send anything.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await createPitch(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Pitch logged.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="np-type">Pitching</Label>
              <select
                id="np-type"
                name="contactType"
                value={contactType}
                onChange={(e) => setContactType(e.target.value as "media" | "influencer")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="media">A journalist</option>
                <option value="influencer">A creator</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-client">Client</Label>
              <select id="np-client" name="clientId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Agency</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {contactType === "media" ? (
            <div className="space-y-1.5">
              <Label htmlFor="np-media">Media contact</Label>
              <select id="np-media" name="mediaContactId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Select a contact</option>
                {mediaContacts.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="np-influencer">Creator</Label>
              <select id="np-influencer" name="influencerId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Select a creator</option>
                {influencers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="np-subject">Subject</Label>
            <Input id="np-subject" name="subject" required placeholder="e.g. Local clinic on the rise of walk-in aesthetics" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-angle">Angle</Label>
            <Textarea id="np-angle" name="angle" rows={2} placeholder="Why this is a story for their readers right now" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-notes">Notes</Label>
            <Textarea id="np-notes" name="notes" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Log pitch
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PitchStatusControl({ pitchId, status }: { pitchId: string; status: PitchStatus }) {
  const [isPending, startTransition] = useTransition();
  const next = allowedNextPitchStatuses(status);

  if (next.length === 0) {
    return (
      <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[status]}`}>
        {STATUS_LABEL[status]}
      </Badge>
    );
  }

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) =>
        startTransition(async () => {
          const result = await updatePitchStatus(pitchId, event.target.value as PitchStatus);
          if (result.error) toast.error(result.error);
        })
      }
      className="rounded-md border bg-background px-2 py-1 text-xs"
    >
      <option value={status}>{STATUS_LABEL[status]}</option>
      {next.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

export function FollowUpButton({ pitchId }: { pitchId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await logFollowUp(pitchId);
          if (result.error) toast.error(result.error);
          else toast.success("Follow-up logged.");
        })
      }
    >
      Chased
    </Button>
  );
}

export function PlacementDialog({ pitchId, subject }: { pitchId: string; subject: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Newspaper className="mr-1 size-3.5" /> Record placement
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record placement</DialogTitle>
          <DialogDescription>{subject}</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await recordPlacement(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Placement recorded.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <input type="hidden" name="pitchId" value={pitchId} />
          <div className="space-y-1.5">
            <Label htmlFor="pl-url">Link to the piece</Label>
            <Input id="pl-url" name="placementUrl" type="url" required placeholder="https://" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pl-outlet">Outlet</Label>
              <Input id="pl-outlet" name="placementOutlet" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-date">Published</Label>
              <Input id="pl-date" name="placementPublishedAt" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-reach">Reach, if the outlet stated one</Label>
            <Input id="pl-reach" name="placementReach" type="number" min={0} />
            <p className="text-xs text-muted-foreground">
              Leave blank if unknown. A blank stays out of the totals rather than being counted as zero, and nothing
              here is estimated on your behalf.
            </p>
          </div>
          <Button type="submit" className="w-full">
            <CheckCircle2 className="mr-1 size-3.5" /> Record placement
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
