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
import { createContentItem } from "./actions";

export function NewContentDialog({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> New content brief</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New content brief</DialogTitle>
          <DialogDescription>Starts in Idea. Move it through the board as it gets produced.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createContentItem(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client</Label>
            <select id="clientId" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="platform">Platform</Label>
              <Input id="platform" name="platform" placeholder="Instagram, TikTok..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contentType">Type</Label>
              <Input id="contentType" name="contentType" placeholder="Reel, carousel..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hook">Hook</Label>
            <Input id="hook" name="hook" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brief">Brief</Label>
            <Textarea id="brief" name="brief" rows={3} />
          </div>
          <Button type="submit" className="w-full">
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
