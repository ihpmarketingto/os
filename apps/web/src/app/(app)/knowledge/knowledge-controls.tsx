"use client";

import { useState, useTransition } from "react";
import { BookPlus, Lock } from "lucide-react";
import { toast } from "sonner";
import { KNOWLEDGE_KINDS } from "@ihp/types";
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
import { createKnowledgeEntry, markReviewed, updateKnowledgeStatus } from "./actions";

export interface ClientChoice {
  id: string;
  name: string;
}

const KIND_LABEL: Record<string, string> = {
  sop: "SOP — how the work gets done",
  playbook: "Playbook — the approach for a situation",
  brand_voice: "Brand voice — how to sound",
  offer: "Offer — what is sold and promised",
  icp: "ICP — who it is for",
  objection: "Objection — pushback and the honest answer",
  winning_pattern: "Winning pattern — what has actually worked",
  positioning: "Positioning — how this is different",
  policy: "Policy — a rule that must be followed",
  faq: "FAQ",
};

export function NewEntryDialog({ clients }: { clients: ClientChoice[] }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <BookPlus className="mr-1 size-3.5" /> Add knowledge
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add knowledge</DialogTitle>
          <DialogDescription>
            This is what the AI reads before it drafts anything. Write it the way you would explain it to a new hire.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await createKnowledgeEntry(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Added to the knowledge base.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ke-title">Title</Label>
            <Input id="ke-title" name="title" required placeholder="e.g. How we price a social retainer" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ke-kind">Kind</Label>
            <select id="ke-kind" name="kind" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              {KNOWLEDGE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_LABEL[kind] ?? kind}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ke-client">Applies to</Label>
              <select
                id="ke-client"
                name="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Every client (how IHP works)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ke-conf">Confidentiality</Label>
              <select
                id="ke-conf"
                name="confidentiality"
                disabled={!clientId}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="agency_general">General — usable for any client</option>
                <option value="client_confidential">Confidential — this client only</option>
              </select>
            </div>
          </div>

          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            {clientId ? (
              <>
                <Lock className="mr-1 inline size-3" />
                Mark it confidential if it is their private information: their margins, their internal reasoning. It
                will then never be readable when working on anyone else. A lesson you learned on their account can stay
                general so it travels.
              </>
            ) : (
              "Agency-wide entries are readable when working on every client, so they must not contain anything a client told you in confidence. Pick a client above to unlock the confidential option."
            )}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="ke-body">The material</Label>
            <Textarea id="ke-body" name="body" rows={10} required placeholder="Markdown. Be specific: the AI copies your reasoning, not just your conclusions." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ke-summary">One-line summary</Label>
            <Input id="ke-summary" name="summary" placeholder="Used when the full entry will not fit in a prompt" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ke-tags">Tags, comma separated</Label>
              <Input id="ke-tags" name="tags" placeholder="pricing, retainer, social" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ke-review">Review by</Label>
              <Input id="ke-review" name="reviewDueOn" type="date" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ke-source">Source</Label>
              <Input id="ke-source" name="sourceReference" placeholder="e.g. IHP Knowledge Base / 00_Core" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ke-status">Status</Label>
              <select id="ke-status" name="status" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="draft">Draft — not used by AI yet</option>
                <option value="active">Active — AI may use it</option>
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Add entry
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StatusSelect({ entryId, status }: { entryId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) =>
        startTransition(async () => {
          const result = await updateKnowledgeStatus(
            entryId,
            event.target.value as "draft" | "active" | "archived",
          );
          if (result.error) toast.error(result.error);
        })
      }
      className="rounded-md border bg-background px-2 py-1 text-xs"
    >
      <option value="draft">Draft</option>
      <option value="active">Active</option>
      <option value="archived">Archived</option>
    </select>
  );
}

export function ReviewButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await markReviewed(entryId);
          if (result.error) toast.error(result.error);
          else toast.success("Confirmed as current for another six months.");
        })
      }
    >
      Still true
    </Button>
  );
}
