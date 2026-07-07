"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
import { createInfluencer, createMediaContact, updateInfluencerStatus } from "./actions";

const INFLUENCER_STATUSES = ["prospect", "contacted", "negotiating", "active", "past"] as const;

export function NewInfluencerDialog({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> Add creator</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add creator</DialogTitle>
          <DialogDescription>Influencer or UGC creator for outreach and campaigns.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createInfluencer(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="inf-name">Name</Label>
            <Input id="inf-name" name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inf-handle">Handle</Label>
              <Input id="inf-handle" name="handle" placeholder="@handle" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inf-platform">Platform</Label>
              <Input id="inf-platform" name="platform" placeholder="Instagram, TikTok..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inf-followers">Followers</Label>
              <Input id="inf-followers" name="followers" type="number" min="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inf-email">Email</Label>
              <Input id="inf-email" name="email" type="email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inf-client">Client (optional)</Label>
            <select id="inf-client" name="clientId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Agency-wide roster</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">
            Add creator
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InfluencerStatusSelect({ influencerId, status }: { influencerId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      className="rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-50"
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => updateInfluencerStatus(influencerId, e.target.value as (typeof INFLUENCER_STATUSES)[number]))
      }
    >
      {INFLUENCER_STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}

export function NewMediaContactDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><Plus className="mr-1 size-3.5" /> Add media contact</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add media contact</DialogTitle>
          <DialogDescription>Journalists and publications for pitching.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createMediaContact(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="mc-name">Name</Label>
            <Input id="mc-name" name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mc-outlet">Outlet</Label>
              <Input id="mc-outlet" name="outlet" placeholder="e.g. CTV Toronto" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-beat">Beat</Label>
              <Input id="mc-beat" name="beat" placeholder="e.g. local events, tech" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mc-email">Email</Label>
              <Input id="mc-email" name="email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-phone">Phone</Label>
              <Input id="mc-phone" name="phone" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Add contact
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
