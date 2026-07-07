"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { createCampaign } from "./actions";

export function NewCampaignDialog({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> Create campaign</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create campaign</DialogTitle>
          <DialogDescription>Starts in Planning. Move it through approval to launch.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createCampaign(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="campaign-client">Client</Label>
            <select id="campaign-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Name</Label>
            <Input id="campaign-name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-objective">Objective</Label>
            <Input id="campaign-objective" name="objective" placeholder="e.g. 40 consult bookings in June" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-offer">Offer</Label>
            <Input id="campaign-offer" name="offer" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-audience">Audience</Label>
            <Textarea id="campaign-audience" name="audience" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-channels">Channels (comma separated)</Label>
              <Input id="campaign-channels" name="channels" placeholder="meta_ads, email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-budget">Budget (CAD)</Label>
              <Input id="campaign-budget" name="budget" type="number" min="0" step="50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-start">Start</Label>
              <Input id="campaign-start" name="startDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-end">End</Label>
              <Input id="campaign-end" name="endDate" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-kpis">KPIs</Label>
            <Input id="campaign-kpis" name="kpis" placeholder="CPL under $25, ROAS over 3" />
          </div>
          <Button type="submit" className="w-full">
            Create campaign
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
