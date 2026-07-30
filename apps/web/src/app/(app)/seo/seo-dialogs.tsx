"use client";

import { useActionState, useState } from "react";
import { MapPin, Plus, Upload } from "lucide-react";
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
import { addKeyword, importRankings, recordGbpPeriod, type ImportRankingsState } from "./actions";

export interface ClientChoice {
  id: string;
  name: string;
}

function ClientSelect({ id, clients }: { id: string; clients: ClientChoice[] }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Client</Label>
      <select id={id} name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
        <option value="">Select a client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AddKeywordDialog({ clients }: { clients: ClientChoice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-1 size-3.5" /> Track keyword
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track a keyword</DialogTitle>
          <DialogDescription>
            For local terms, set the location it is measured from. The same phrase ranks differently one town over.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await addKeyword(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Keyword tracked.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <ClientSelect id="kw-client" clients={clients} />
          <div className="space-y-1.5">
            <Label htmlFor="kw-keyword">Keyword</Label>
            <Input id="kw-keyword" name="keyword" required placeholder="e.g. hydrafacial brampton" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kw-location">Location</Label>
              <Input id="kw-location" name="location" placeholder="e.g. Brampton, ON" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kw-intent">Intent</Label>
              <select id="kw-intent" name="intent" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Not set</option>
                <option value="local">Local</option>
                <option value="transactional">Transactional</option>
                <option value="commercial">Commercial</option>
                <option value="informational">Informational</option>
                <option value="navigational">Navigational</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kw-volume">Monthly searches</Label>
              <Input id="kw-volume" name="searchVolume" type="number" min={0} placeholder="880" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kw-difficulty">Difficulty (0-100)</Label>
              <Input id="kw-difficulty" name="difficulty" type="number" min={0} max={100} placeholder="34" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kw-url">Target page</Label>
            <Input id="kw-url" name="targetUrl" placeholder="https://example.ca/hydrafacial" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPriority" className="size-4" />
            Priority keyword
          </label>
          <Button type="submit" className="w-full">
            Track keyword
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const initialImport: ImportRankingsState = {};

export function ImportRankingsDialog({ clients }: { clients: ClientChoice[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(importRankings, initialImport);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Upload className="mr-1 size-3.5" /> Import rankings
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import rankings</DialogTitle>
          <DialogDescription>
            Paste a CSV with keyword and position columns. Leave a position blank or use a dash for a keyword that was
            checked and is not ranking. Importing the same date again corrects that day rather than adding a second
            reading.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <ClientSelect id="ir-client" clients={clients} />
          <div className="space-y-1.5">
            <Label htmlFor="ir-date">Reading date</Label>
            <Input id="ir-date" name="recordedOn" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ir-csv">Data</Label>
            <Textarea
              id="ir-csv"
              name="csv"
              rows={8}
              required
              className="font-mono text-xs"
              placeholder={"keyword,position,url\nhydrafacial brampton,3,https://example.ca/hydrafacial\nlip filler brampton,-,"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Importing..." : "Import"}
          </Button>
          {state.error ? <p className="text-sm text-risk">{state.error}</p> : null}
          {state.imported ? (
            <p className="text-sm text-success">Imported {state.imported} readings.</p>
          ) : null}
          {state.skipped && state.skipped.length > 0 ? (
            <div className="rounded-md border border-dashed p-2">
              <p className="text-xs font-medium">Skipped {state.skipped.length}:</p>
              <ul className="mt-1 space-y-0.5">
                {state.skipped.slice(0, 8).map((s) => (
                  <li key={s} className="text-xs text-muted-foreground">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GbpDialog({ clients }: { clients: ClientChoice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <MapPin className="mr-1 size-3.5" /> Record GBP
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Google Business Profile</DialogTitle>
          <DialogDescription>A reporting period from the GBP performance export.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await recordGbpPeriod(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Period recorded.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <ClientSelect id="gbp-client" clients={clients} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gbp-start">Period start</Label>
              <Input id="gbp-start" name="periodStart" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gbp-end">Period end</Label>
              <Input id="gbp-end" name="periodEnd" type="date" required />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gbp-views">Profile views</Label>
              <Input id="gbp-views" name="profileViews" type="number" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gbp-impressions">Search impressions</Label>
              <Input id="gbp-impressions" name="searchImpressions" type="number" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gbp-calls">Calls</Label>
              <Input id="gbp-calls" name="calls" type="number" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gbp-directions">Direction requests</Label>
              <Input id="gbp-directions" name="directionRequests" type="number" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gbp-clicks">Website clicks</Label>
              <Input id="gbp-clicks" name="websiteClicks" type="number" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gbp-bookings">Bookings</Label>
              <Input id="gbp-bookings" name="bookings" type="number" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gbp-reviews">Reviews total</Label>
              <Input id="gbp-reviews" name="reviewsTotal" type="number" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gbp-new-reviews">New reviews</Label>
              <Input id="gbp-new-reviews" name="newReviews" type="number" min={0} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gbp-rating">Average rating</Label>
            <Input id="gbp-rating" name="averageRating" type="number" min={0} max={5} step="0.1" placeholder="4.8" />
          </div>
          <Button type="submit" className="w-full">
            Record period
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
