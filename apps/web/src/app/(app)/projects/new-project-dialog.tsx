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
import { createProject } from "./actions";

export function NewProjectDialog({
  clients,
  templates,
}: {
  clients: { id: string; name: string }[];
  templates: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> Create project</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>Optionally start from a template to auto-generate its task list.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createProject(formData);
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
          <div className="space-y-1.5">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serviceType">Service type</Label>
            <Input id="serviceType" name="serviceType" placeholder="e.g. paid media, website" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="templateId">Start from template (optional)</Label>
            <select id="templateId" name="templateId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">
            Create project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
