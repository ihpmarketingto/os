"use client";

import { useActionState, useState, useTransition } from "react";
import { ClipboardList, Plus, Upload } from "lucide-react";
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
  createAdCreative,
  importCreativeMetrics,
  logOptimisation,
  recordOptimisationOutcome,
  updateCreativeStatus,
  type CreativeImportState,
} from "./actions";

export interface Choice {
  id: string;
  name: string;
}

export function NewCreativeDialog({ clients, campaigns }: { clients: Choice[]; campaigns: Choice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> New creative</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New ad creative</DialogTitle>
          <DialogDescription>
            Variants that test the same idea share a concept. Creative starts as a draft and must be approved before
            it can go live.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createAdCreative(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cr-client">Client</Label>
              <select id="cr-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-campaign">Campaign</Label>
              <select id="cr-campaign" name="campaignId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Not attached</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cr-concept">Concept</Label>
              <Input id="cr-concept" name="concept" required placeholder="e.g. Summer Glow offer" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-variant">Variant</Label>
              <Input id="cr-variant" name="variantLabel" defaultValue="A" maxLength={4} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-name">Creative name</Label>
            <Input id="cr-name" name="name" required placeholder="Must match the ad name in platform exports" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cr-channel">Channel</Label>
              <select id="cr-channel" name="channel" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="meta_ads">Meta Ads</option>
                <option value="google_ads">Google Ads</option>
                <option value="social">Social</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-format">Format</Label>
              <select id="cr-format" name="format" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="static">Static</option>
                <option value="image">Image</option>
                <option value="carousel">Carousel</option>
                <option value="video">Video</option>
                <option value="ugc_video">UGC video</option>
                <option value="story">Story</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-audience">Audience</Label>
              <Input id="cr-audience" name="audience" placeholder="e.g. Warm retargeting" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-primary">Primary text</Label>
            <Textarea id="cr-primary" name="primaryText" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cr-headline">Headline</Label>
              <Input id="cr-headline" name="headline" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-cta">CTA</Label>
              <Input id="cr-cta" name="cta" placeholder="e.g. Book now" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Add creative
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const NEXT_STATUS: Record<string, { to: "draft" | "in_review" | "approved" | "live" | "paused" | "retired"; label: string }[]> = {
  draft: [{ to: "in_review", label: "Send to review" }],
  in_review: [{ to: "approved", label: "Approve" }],
  approved: [{ to: "live", label: "Set live" }],
  live: [
    { to: "paused", label: "Pause" },
    { to: "retired", label: "Retire" },
  ],
  paused: [
    { to: "live", label: "Resume" },
    { to: "retired", label: "Retire" },
  ],
  retired: [],
};

export function CreativeStatusActions({ creativeId, status }: { creativeId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const actions = NEXT_STATUS[status] ?? [];
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((action) => (
        <Button
          key={action.to}
          size="sm"
          variant={action.to === "approved" || action.to === "live" ? "default" : "outline"}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateCreativeStatus(creativeId, action.to);
              if (result.error) toast.error(result.error);
            })
          }
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

const initialImport: CreativeImportState = {};

export function ImportCreativeMetricsDialog({ clients }: { clients: Choice[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(importCreativeMetrics, initialImport);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><Upload className="mr-1 size-3.5" /> Import creative metrics</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import creative-level metrics</DialogTitle>
          <DialogDescription>
            Paste per-ad rows from the platform export. The creative column must match a creative name already in the
            library.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cim-client">Client</Label>
            <select id="cim-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cim-csv">CSV rows</Label>
            <Textarea
              id="cim-csv"
              name="csv"
              rows={6}
              required
              className="font-mono text-xs"
              placeholder={"date,creative,spend,impressions,clicks,leads,conversions,revenue\n2026-07-01,UGC video A,120.50,24000,480,14,6,980"}
            />
          </div>
          {state.imported ? <p className="text-sm text-success">Imported {state.imported} row(s).</p> : null}
          {state.errors?.map((e, i) => (
            <p key={i} className="text-sm text-risk">
              {e}
            </p>
          ))}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Importing..." : "Import"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LogOptimisationDialog({
  clients,
  campaigns,
  creatives,
}: {
  clients: Choice[];
  campaigns: Choice[];
  creatives: Choice[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><ClipboardList className="mr-1 size-3.5" /> Log optimisation</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log an optimisation</DialogTitle>
          <DialogDescription>
            What changed, and why you expected it to work. Record the outcome later so the reasoning is never lost.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await logOptimisation(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ol-client">Client</Label>
              <select id="ol-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ol-type">Change type</Label>
              <select id="ol-type" name="changeType" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="budget">Budget</option>
                <option value="audience">Audience</option>
                <option value="creative">Creative</option>
                <option value="bid">Bid</option>
                <option value="targeting">Targeting</option>
                <option value="placement">Placement</option>
                <option value="pause">Pause</option>
                <option value="scale">Scale</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ol-campaign">Campaign</Label>
              <select id="ol-campaign" name="campaignId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Not specific</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ol-creative">Creative</Label>
              <select id="ol-creative" name="adCreativeId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Not specific</option>
                {creatives.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ol-description">What changed</Label>
            <Textarea id="ol-description" name="description" rows={2} required placeholder="e.g. Raised daily budget from $50 to $65 on the warm retargeting ad set" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ol-rationale">Why</Label>
            <Textarea id="ol-rationale" name="rationale" rows={2} placeholder="e.g. CPL held under $12 for six days at current spend" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ol-expected">Expected outcome</Label>
            <Input id="ol-expected" name="expectedOutcome" placeholder="e.g. 20% more leads without CPL exceeding $15" />
          </div>
          <Button type="submit" className="w-full">
            Log it
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RecordOutcomeDialog({ entryId, description }: { entryId: string; description: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost">Record outcome</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What happened?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await recordOptimisationOutcome(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="entryId" value={entryId} />
          <div className="space-y-1.5">
            <Label htmlFor="oc-observed">Observed outcome</Label>
            <Textarea id="oc-observed" name="observedOutcome" rows={3} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oc-decision">Decision</Label>
            <select id="oc-decision" name="decision" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="scale">Scale it</option>
              <option value="iterate">Iterate</option>
              <option value="kill">Kill it</option>
              <option value="hold">Hold and keep watching</option>
            </select>
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
