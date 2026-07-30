"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createDesign, generateImage, reviewCreativeAsset, uploadCreativeAsset, type GenerateImageState } from "./actions";

export interface ClientChoice {
  id: string;
  name: string;
}

const initialGenerate: GenerateImageState = {};

export function GenerateImagePanel({ clients }: { clients: ClientChoice[] }) {
  const [state, formAction, isPending] = useActionState(generateImage, initialGenerate);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="gen-client">Client</Label>
          <select id="gen-client" name="clientId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="">Shared library</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gen-size">Format</Label>
          <select id="gen-size" name="size" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="1024x1024">Square 1:1 (feed)</option>
            <option value="1024x1536">Portrait 2:3 (4:5 feed, stories)</option>
            <option value="1536x1024">Landscape 3:2</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gen-quality">Quality</Label>
          <select id="gen-quality" name="quality" defaultValue="medium" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="low">Low (about 1 cent)</option>
            <option value="medium">Medium (about 4 cents)</option>
            <option value="high">High (about 17 cents)</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="gen-prompt">Describe the image</Label>
        <Textarea
          id="gen-prompt"
          name="prompt"
          rows={3}
          required
          placeholder="e.g. A woman in her thirties in a bright treatment room, mid-consultation with an aesthetician, natural window light, calm and unposed"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <Sparkles className="mr-1.5 size-4" />
          {isPending ? "Generating..." : "Generate image"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Realism guardrails are added to every prompt. Generated images are labelled AI and can never be marked as a
          real client result.
        </p>
      </div>
      {state.error ? <p className="text-sm text-risk">{state.error}</p> : null}
      {state.assetId ? (
        <p className="text-sm text-success">
          Image added to the library (about US${state.costUsd?.toFixed(3)}). Review it before use.
        </p>
      ) : null}
    </form>
  );
}

export function UploadAssetDialog({ clients }: { clients: ClientChoice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><Upload className="mr-1 size-3.5" /> Upload asset</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload an asset</DialogTitle>
          <DialogDescription>Client photography, logos or artwork to use in designs.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await uploadCreativeAsset(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Asset uploaded.");
              setOpen(false);
            }
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ua-client">Client</Label>
            <select id="ua-client" name="clientId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Shared library</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ua-file">File</Label>
            <Input id="ua-file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" required />
          </div>
          <Button type="submit" className="w-full">
            Upload
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewAssetButton({ assetId }: { assetId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await reviewCreativeAsset(assetId);
          if (result.error) toast.error(result.error);
          else toast.success("Marked as reviewed.");
        })
      }
    >
      Mark reviewed
    </Button>
  );
}

export function NewDesignDialog({ clients }: { clients: ClientChoice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> New design</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New design</DialogTitle>
          <DialogDescription>Pick the placement size. You can duplicate into other sizes later.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createDesign(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="nd-client">Client</Label>
            <select id="nd-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nd-name">Name</Label>
            <Input id="nd-name" name="name" required placeholder="e.g. Summer Glow - square A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nd-format">Format</Label>
            <select id="nd-format" name="format" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="square">Square 1080 x 1080 (feed)</option>
              <option value="portrait">Portrait 1080 x 1350 (4:5 feed)</option>
              <option value="story">Story 1080 x 1920 (9:16)</option>
              <option value="landscape">Landscape 1200 x 628</option>
            </select>
          </div>
          <Button type="submit" className="w-full">
            Create and open
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AiBadge() {
  return <Badge className="bg-brand text-brand-foreground text-[10px]">AI generated</Badge>;
}
