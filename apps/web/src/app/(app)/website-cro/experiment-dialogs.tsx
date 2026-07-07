"use client";

import { useState, useTransition } from "react";
import { FlaskConical, Plus } from "lucide-react";
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
import { concludeExperiment, createExperiment, startExperiment } from "./actions";

export function NewExperimentDialog({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> New experiment</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New CRO experiment</DialogTitle>
          <DialogDescription>A hypothesis and success metric are required before anything runs.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createExperiment(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="exp-client">Client</Label>
            <select id="exp-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-name">Name</Label>
            <Input id="exp-name" name="name" required placeholder="e.g. Booking CTA above the fold" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-hypothesis">Hypothesis</Label>
            <Textarea id="exp-hypothesis" name="hypothesis" required rows={2} placeholder="If we..., then..., because..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-page">Page URL</Label>
              <Input id="exp-page" name="pageUrl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-metric">Success metric</Label>
              <Input id="exp-metric" name="successMetric" placeholder="e.g. booking conversion rate" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-variant">Variant description</Label>
            <Textarea id="exp-variant" name="variant" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Create experiment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StartExperimentButton({ experimentId }: { experimentId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(() => startExperiment(experimentId))}>
      Start
    </Button>
  );
}

export function ConcludeExperimentDialog({ experimentId, name }: { experimentId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost"><FlaskConical className="mr-1 size-3.5" /> Conclude</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conclude: {name}</DialogTitle>
          <DialogDescription>Record the result and the decision so the learning is never lost.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await concludeExperiment(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="experimentId" value={experimentId} />
          <div className="space-y-1.5">
            <Label htmlFor="exp-result">Result</Label>
            <Textarea id="exp-result" name="result" rows={2} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-confidence">Statistical confidence</Label>
              <Input id="exp-confidence" name="confidence" placeholder="e.g. 95%, or directional only" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-decision">Decision</Label>
              <select id="exp-decision" name="decision" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="ship">Ship</option>
                <option value="revert">Revert</option>
                <option value="iterate">Iterate</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-learnings">Learnings</Label>
            <Textarea id="exp-learnings" name="learnings" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Save conclusion
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
