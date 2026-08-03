"use client";

import { useState, useTransition } from "react";
import { BarChart3, Plus, Workflow } from "lucide-react";
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
import { addFlowStep, createFlow, recordStepStats, updateFlowStatus } from "./actions";

export interface ClientChoice {
  id: string;
  name: string;
}

export function NewFlowDialog({ clients }: { clients: ClientChoice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Workflow className="mr-1 size-3.5" /> New flow
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lifecycle flow</DialogTitle>
          <DialogDescription>
            This maps a flow so it can be reviewed and improved. It documents what runs in the sending platform, it
            does not send anything.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await createFlow(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Flow created.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="nf-client">Client</Label>
            <select id="nf-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nf-name">Flow name</Label>
            <Input id="nf-name" name="name" required placeholder="e.g. New enquiry nurture" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nf-type">Type</Label>
              <select id="nf-type" name="flowType" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="welcome">Welcome</option>
                <option value="nurture">Nurture</option>
                <option value="booking_reminder">Booking reminder</option>
                <option value="post_purchase">Post purchase</option>
                <option value="win_back">Win back</option>
                <option value="re_engagement">Re-engagement</option>
                <option value="abandoned_cart">Abandoned cart</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nf-platform">Platform</Label>
              <Input id="nf-platform" name="platform" placeholder="e.g. Klaviyo" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nf-trigger">What puts someone in it</Label>
            <Input id="nf-trigger" name="triggerDescription" placeholder="e.g. Submits the consultation form" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nf-goal">Goal</Label>
            <Textarea id="nf-goal" name="goal" rows={2} placeholder="e.g. Book a consultation within 14 days" />
          </div>
          <Button type="submit" className="w-full">
            Create flow
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FlowStatusSelect({ flowId, status }: { flowId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) =>
        startTransition(async () => {
          const result = await updateFlowStatus(
            flowId,
            event.target.value as "draft" | "live" | "paused" | "archived",
          );
          if (result.error) toast.error(result.error);
        })
      }
      className="rounded-md border bg-background px-2 py-1 text-xs"
    >
      <option value="draft">Draft</option>
      <option value="live">Live</option>
      <option value="paused">Paused</option>
      <option value="archived">Archived</option>
    </select>
  );
}

export function AddStepDialog({ flowId, flowName }: { flowId: string; flowName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Plus className="mr-1 size-3.5" /> Add step
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add step</DialogTitle>
          <DialogDescription>{flowName}</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await addFlowStep(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Step added.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <input type="hidden" name="flowId" value={flowId} />
          <div className="space-y-1.5">
            <Label htmlFor="as-name">Step name</Label>
            <Input id="as-name" name="name" required placeholder="e.g. What to expect at your consultation" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="as-channel">Channel</Label>
              <select id="as-channel" name="channel" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="as-delay">Wait after previous step (hours)</Label>
              <Input id="as-delay" name="delayHours" type="number" min={0} defaultValue={0} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="as-subject">Subject line</Label>
            <Input id="as-subject" name="subject" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="as-purpose">Purpose</Label>
            <Textarea id="as-purpose" name="purpose" rows={2} placeholder="What this step is meant to achieve" />
          </div>
          <Button type="submit" className="w-full">
            Add step
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StepStatsDialog({ stepId, stepName }: { stepId: string; stepName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost">
            <BarChart3 className="mr-1 size-3.5" /> Stats
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Step performance</DialogTitle>
          <DialogDescription>
            {stepName}. Figures replace whatever was there for the window you state, so the numbers on screen always
            say what period they cover.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await recordStepStats(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Performance recorded.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <input type="hidden" name="stepId" value={stepId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ss-start">Period start</Label>
              <Input id="ss-start" name="periodStart" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-end">Period end</Label>
              <Input id="ss-end" name="periodEnd" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-sent">Sent</Label>
              <Input id="ss-sent" name="sent" type="number" min={0} defaultValue={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-delivered">Delivered</Label>
              <Input id="ss-delivered" name="delivered" type="number" min={0} defaultValue={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-opens">Opens</Label>
              <Input id="ss-opens" name="opens" type="number" min={0} defaultValue={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-clicks">Clicks</Label>
              <Input id="ss-clicks" name="clicks" type="number" min={0} defaultValue={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-unsubs">Unsubscribes</Label>
              <Input id="ss-unsubs" name="unsubscribes" type="number" min={0} defaultValue={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-conversions">Conversions</Label>
              <Input id="ss-conversions" name="conversions" type="number" min={0} defaultValue={0} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ss-revenue">Revenue</Label>
            <Input id="ss-revenue" name="revenue" type="number" min={0} step="0.01" defaultValue={0} />
          </div>
          <Button type="submit" className="w-full">
            Record
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
