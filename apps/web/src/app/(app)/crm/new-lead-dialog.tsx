"use client";

import { useState } from "react";
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
import { createLead } from "./actions";

export function NewLeadDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> Add lead</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>Creates a lead in the intake queue. Convert it to a deal once qualified.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createLead(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" name="companyName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" placeholder="e.g. Beauty and Wellness" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source">Source</Label>
            <Input id="source" name="source" placeholder="e.g. referral, cold outreach, inbound" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimatedValue">Estimated value (CAD)</Label>
            <Input id="estimatedValue" name="estimatedValue" type="number" min="0" step="100" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serviceInterest">Service interest (comma separated)</Label>
            <Input id="serviceInterest" name="serviceInterest" placeholder="paid media, seo" />
          </div>
          <Button type="submit" className="w-full">
            Create lead
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
