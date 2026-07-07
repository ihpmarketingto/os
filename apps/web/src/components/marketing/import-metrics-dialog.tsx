"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { importMetricsCsv, type ImportMetricsState } from "@/app/(app)/campaigns/actions";
import { METRIC_CHANNELS, type MetricChannel } from "@/lib/marketing/constants";

const initialState: ImportMetricsState = {};

export function ImportMetricsDialog({
  clients,
  campaigns,
  defaultChannel,
  channelChoices,
}: {
  clients: { id: string; name: string }[];
  campaigns: { id: string; name: string; clientId: string }[];
  defaultChannel: MetricChannel;
  channelChoices?: MetricChannel[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(importMetricsCsv, initialState);
  const channels = METRIC_CHANNELS.filter((c) => (channelChoices ?? [defaultChannel]).includes(c.value));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Upload className="mr-1 size-3.5" /> Import CSV</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import channel metrics</DialogTitle>
          <DialogDescription>
            Paste rows exported from the ad platform or analytics tool. Required header:
            date,spend,impressions,clicks,leads,conversions,revenue
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="import-client">Client</Label>
              <select id="import-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-channel">Channel</Label>
              <select id="import-channel" name="channel" defaultValue={defaultChannel} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                {channels.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="import-campaign">Campaign (optional)</Label>
            <select id="import-campaign" name="campaignId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Not attached to a campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="import-csv">CSV rows</Label>
            <Textarea
              id="import-csv"
              name="csv"
              rows={6}
              required
              placeholder={"date,spend,impressions,clicks,leads,conversions,revenue\n2026-06-01,120.50,24000,480,14,6,980"}
              className="font-mono text-xs"
            />
          </div>
          {state.imported ? (
            <p className="text-sm text-success">Imported {state.imported} row(s).</p>
          ) : null}
          {state.errors?.map((err, i) => (
            <p key={i} className="text-sm text-risk">
              {err}
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
