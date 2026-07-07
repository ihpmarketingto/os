"use client";

import { useState, useTransition } from "react";
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
import { createReport, updateReportStatus } from "./actions";

export function NewReportDialog({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> New report draft</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New report draft</DialogTitle>
          <DialogDescription>
            Drafts stay internal. Publishing to the client portal happens after internal and client review.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createReport(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="report-client">Client</Label>
            <select id="report-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-title">Title</Label>
            <Input id="report-title" name="title" required placeholder="e.g. June performance report" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-start">Period start</Label>
              <Input id="report-start" name="periodStart" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-end">Period end</Label>
              <Input id="report-end" name="periodEnd" type="date" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-summary">Executive summary</Label>
            <Textarea id="report-summary" name="executiveSummary" rows={3} placeholder="What happened, why, and what it means for the business." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-wins">Key wins</Label>
            <Textarea id="report-wins" name="keyWins" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-risks">Risks</Label>
            <Textarea id="report-risks" name="risks" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-next">Next month plan</Label>
            <Textarea id="report-next" name="nextMonthPlan" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Create draft
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const NEXT_ACTIONS: Record<string, { to: "draft" | "internal_review" | "client_review" | "published" | "archived"; label: string }[]> = {
  draft: [{ to: "internal_review", label: "Send to internal review" }],
  internal_review: [
    { to: "client_review", label: "Send to client review" },
    { to: "draft", label: "Back to draft" },
  ],
  client_review: [
    { to: "published", label: "Publish to portal" },
    { to: "internal_review", label: "Back to internal review" },
  ],
  published: [{ to: "archived", label: "Archive" }],
  archived: [],
};

export function ReportStatusActions({ reportId, status }: { reportId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const actions = NEXT_ACTIONS[status] ?? [];
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <Button
          key={action.to}
          size="sm"
          variant={action.to === "published" ? "default" : "outline"}
          disabled={isPending}
          onClick={() => startTransition(() => updateReportStatus(reportId, action.to))}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
