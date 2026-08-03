"use client";

import { useState, useTransition } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { allowedNextProposalStatuses, type ProposalStatus } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
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
import {
  addProposalLine,
  markProposalSent,
  removeProposalLine,
  updateProposalStatus,
} from "../../proposal-actions";

export interface PackageChoice {
  id: string;
  name: string;
  cadence: string;
  default_price: number | null;
}

export function AddLineForm({ proposalId, packages }: { proposalId: string; packages: PackageChoice[] }) {
  return (
    <form
      action={async (formData) => {
        const result = await addProposalLine(formData);
        if (result.error) toast.error(result.error);
        else toast.success("Line added.");
      }}
      className="flex flex-wrap items-end gap-2 border-t pt-4"
    >
      <input type="hidden" name="proposalId" value={proposalId} />
      <div className="space-y-1">
        <Label htmlFor="pl-package" className="text-xs">
          From the catalogue
        </Label>
        <select
          id="pl-package"
          name="servicePackageId"
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          <option value="">Custom line</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.default_price ? ` (${p.default_price})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pl-desc" className="text-xs">
          Description
        </Label>
        <Input id="pl-desc" name="description" className="h-8 w-56 text-xs" placeholder="Leave blank to use package name" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pl-cadence" className="text-xs">
          Cadence
        </Label>
        <select id="pl-cadence" name="cadence" className="h-8 rounded-md border bg-background px-2 text-xs">
          <option value="one_time">One time</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pl-qty" className="text-xs">
          Qty
        </Label>
        <Input id="pl-qty" name="quantity" type="number" min="0.5" step="0.5" defaultValue={1} className="h-8 w-20 text-xs" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pl-price" className="text-xs">
          Unit price
        </Label>
        <Input id="pl-price" name="unitPrice" type="number" min={0} step="0.01" className="h-8 w-28 text-xs" placeholder="Package price" />
      </div>
      <Button type="submit" size="sm">
        <Plus className="mr-1 size-3.5" /> Add line
      </Button>
    </form>
  );
}

export function RemoveLineButton({ lineId }: { lineId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      aria-label="Remove line"
      onClick={() =>
        startTransition(async () => {
          const result = await removeProposalLine(lineId);
          if (result.error) toast.error(result.error);
        })
      }
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}

export function SendProposalDialog({ proposalId, ready }: { proposalId: string; ready: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" disabled={!ready}>
            <Send className="mr-1 size-3.5" /> Mark as sent
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as sent</DialogTitle>
          <DialogDescription>
            This records that you sent the proposal. It does not send it: IHP OS has no send path and nothing here
            emails the client. Once marked sent, the lines lock.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await markProposalSent(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Recorded as sent.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <input type="hidden" name="proposalId" value={proposalId} />
          <div className="space-y-1.5">
            <Label htmlFor="sp-email">Who did you send it to</Label>
            <Input id="sp-email" name="sentToEmail" type="email" placeholder="name@client.ca" />
          </div>
          <Button type="submit" className="w-full">
            Record as sent
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProposalStatusControl({ proposalId, status }: { proposalId: string; status: ProposalStatus }) {
  const [isPending, startTransition] = useTransition();
  const next = allowedNextProposalStatuses(status);

  if (next.length === 0) {
    return (
      <Badge variant="outline" className="capitalize">
        {status}
      </Badge>
    );
  }

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) =>
        startTransition(async () => {
          const result = await updateProposalStatus(proposalId, event.target.value as ProposalStatus);
          if (result.error) toast.error(result.error);
        })
      }
      className="rounded-md border bg-background px-2 py-1 text-sm capitalize"
    >
      <option value={status}>{status}</option>
      {next.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}
