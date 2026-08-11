"use client";

import { useState, useTransition } from "react";
import { CheckCheck, Copy, Plus, Rocket, ShieldCheck } from "lucide-react";
import { QA_CHECKLIST } from "@ihp/types";
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
  addBuildLibraryProject,
  advancePageStatus,
  approveBrief,
  cloneTemplate,
  createTemplateFromComponents,
  createTemplateFromPreset,
  createBrief,
  createPageProject,
  publishPage,
  recordQaRun,
  setReusableComponentApprovalStatus,
  setBuildProjectReuse,
} from "./actions";

export interface Option {
  id: string;
  name: string;
}

export interface ReusableComponentOption extends Option {
  category: string;
}

const DEPLOYMENT_PROVIDER_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "vercel", label: "Vercel" },
  { value: "netlify", label: "Netlify" },
  { value: "cloudflare_pages", label: "Cloudflare Pages" },
  { value: "replit", label: "Replit" },
] as const;

type DeploymentProviderValue = (typeof DEPLOYMENT_PROVIDER_OPTIONS)[number]["value"];

function parseDeploymentProvider(value: FormDataEntryValue | null): DeploymentProviderValue {
  const raw = typeof value === "string" ? value : "";
  return DEPLOYMENT_PROVIDER_OPTIONS.find((option) => option.value === raw)?.value ?? "manual";
}

export function AddBuildProjectDialog({ clients }: { clients: Option[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><Plus className="mr-1 size-3.5" /> Add to Build Library</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Build Library project</DialogTitle>
          <DialogDescription>
            Past work becomes governed reference material. Nothing is reusable until it is reviewed and approved.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await addBuildLibraryProject(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="blp-name">Project name</Label>
            <Input id="blp-name" name="projectName" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="blp-source">Source</Label>
              <select id="blp-source" name="sourceProvider" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="manual">Manual entry</option>
                <option value="github">GitHub</option>
                <option value="replit">Replit</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blp-client">Original client</Label>
              <select id="blp-client" name="clientId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Not client-specific</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blp-repo">Repository URL</Label>
            <Input id="blp-repo" name="repositoryUrl" type="url" placeholder="https://github.com/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="blp-deploy">Deployment URL</Label>
              <Input id="blp-deploy" name="deploymentUrl" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blp-replit">Replit URL</Label>
              <Input id="blp-replit" name="replitUrl" type="url" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="blp-pagetype">Page type</Label>
              <Input id="blp-pagetype" name="pageType" placeholder="e.g. offer landing page" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blp-industry">Industry</Label>
              <Input id="blp-industry" name="industry" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="blp-goal">Conversion goal</Label>
              <Input id="blp-goal" name="conversionGoal" placeholder="e.g. bookings" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blp-traffic">Traffic source</Label>
              <Input id="blp-traffic" name="trafficSource" placeholder="e.g. Meta Ads" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blp-learnings">Learnings</Label>
            <Textarea id="blp-learnings" name="learnings" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Add project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReuseStatusButtons({ projectId, status }: { projectId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  if (status === "approved_for_reuse" || status === "restricted") return null;
  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => setBuildProjectReuse(projectId, "approved_for_reuse"))}
      >
        <ShieldCheck className="mr-1 size-3.5" /> Approve reuse
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => startTransition(() => setBuildProjectReuse(projectId, "restricted"))}
      >
        Restrict
      </Button>
    </div>
  );
}

export function NewBriefDialog({ clients, campaigns }: { clients: Option[]; campaigns: Option[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> New brief</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Landing page brief</DialogTitle>
          <DialogDescription>
            The brief is the contract for the page. Required and forbidden claims travel with it into QA.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createBrief(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brief-client">Client</Label>
              <select id="brief-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-campaign">Campaign</Label>
              <select id="brief-campaign" name="campaignId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">No campaign yet</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brief-title">Title</Label>
              <Input id="brief-title" name="title" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brief-offer">Offer</Label>
            <Input id="brief-offer" name="offer" required placeholder="What is being sold and why act now" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brief-conversion">Conversion action</Label>
              <Input id="brief-conversion" name="conversionAction" required placeholder="e.g. booked consult" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-cta">Main CTA</Label>
              <Input id="brief-cta" name="mainCta" required placeholder="e.g. Book my consult" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brief-audience">Audience</Label>
              <Input id="brief-audience" name="audience" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-traffic">Traffic source</Label>
              <Input id="brief-traffic" name="trafficSource" placeholder="e.g. Meta Ads" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brief-price">Price</Label>
              <Input id="brief-price" name="price" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-promotion">Promotion</Label>
              <Input id="brief-promotion" name="promotion" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-launch">Launch date</Label>
              <Input id="brief-launch" name="launchDate" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brief-booking">Booking link</Label>
            <Input id="brief-booking" name="bookingLink" type="url" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brief-proof">Proof points and testimonials</Label>
            <Textarea id="brief-proof" name="proofPoints" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brief-objections">Objections to handle</Label>
            <Textarea id="brief-objections" name="objections" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brief-required-claims">Required claims</Label>
              <Textarea id="brief-required-claims" name="requiredClaims" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-forbidden-claims">Forbidden claims</Label>
              <Textarea id="brief-forbidden-claims" name="forbiddenClaims" rows={2} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brief-disclaimer">Required disclaimer</Label>
            <Input id="brief-disclaimer" name="requiredDisclaimer" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brief-tracking">Required tracking</Label>
            <Input id="brief-tracking" name="requiredTracking" placeholder="e.g. GA4, Meta Pixel, UTM capture" />
          </div>
          <Button type="submit" className="w-full">
            Create brief
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ApproveBriefButton({ briefId }: { briefId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(() => approveBrief(briefId))}>
      <CheckCheck className="mr-1 size-3.5" /> Approve brief
    </Button>
  );
}

export function NewPageProjectDialog({
  briefs,
  references,
  templates,
  projects,
}: {
  briefs: Option[];
  references: Option[];
  templates: Option[];
  projects: Option[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 size-3.5" /> New page project</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New page project</DialogTitle>
          <DialogDescription>
            Starts from an approved brief. Generated code lives in its own repository, never inside IHP OS.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createPageProject(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="page-project-link">Delivery project</Label>
            <select id="page-project-link" name="projectId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">No linked project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="page-brief">Approved brief</Label>
            <select id="page-brief" name="briefId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a brief</option>
              {briefs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="page-name">Page name</Label>
            <Input id="page-name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="page-mode">Generation mode</Label>
            <select id="page-mode" name="generationMode" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="build_from_strategy">Build from strategy</option>
              <option value="clone_and_adapt">Clone and adapt</option>
              <option value="build_from_components">Build from components</option>
              <option value="improve_existing">Improve existing page</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="page-template">Reusable template</Label>
            <select id="page-template" name="templateId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Use the built-in Lip Blush conversion preset</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <input type="hidden" name="templatePresetKey" value="lip_blush_conversion" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="page-reference">Reference project (approved for reuse only)</Label>
            <select id="page-reference" name="referenceBuildProjectId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">None</option>
              {references.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="page-repo">Repository URL</Label>
              <Input id="page-repo" name="repositoryUrl" type="url" placeholder="Dedicated page repo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="page-branch">Branch</Label>
              <Input id="page-branch" name="branch" placeholder="main" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Create page project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type PageStatus =
  | "planning"
  | "generating"
  | "preview"
  | "qa"
  | "internal_approval"
  | "client_approval"
  | "approved_to_publish"
  | "published"
  | "archived";

const NEXT_STATUS: Record<string, { to: PageStatus; label: string; needsPreviewUrl?: boolean }[]> = {
  planning: [{ to: "generating", label: "Start generation" }],
  generating: [{ to: "preview", label: "Preview ready", needsPreviewUrl: true }],
  preview: [{ to: "qa", label: "Send to QA" }],
  qa: [{ to: "internal_approval", label: "Send to internal approval" }],
  internal_approval: [{ to: "qa", label: "Back to QA" }],
  client_approval: [{ to: "preview", label: "Back to preview" }],
  published: [{ to: "archived", label: "Archive" }],
};

export function PageStatusActions({ projectId, status }: { projectId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const actions = NEXT_STATUS[status] ?? [];
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => (
        action.needsPreviewUrl ? (
          <Dialog key={action.to}>
            <DialogTrigger
              render={
                <Button size="sm" variant="outline" disabled={isPending}>
                  {action.label}
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{action.label}</DialogTitle>
                <DialogDescription>
                  Record the preview deployment explicitly so the next approval step stays tied to a real URL.
                </DialogDescription>
              </DialogHeader>
              <form
                action={async (formData) => {
                  const previewUrl = String(formData.get("previewUrl") ?? "").trim();
                  const provider = parseDeploymentProvider(formData.get("provider"));
                  await advancePageStatus(projectId, action.to, previewUrl, provider);
                }}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`preview-url-${projectId}`}>Preview URL</Label>
                  <Input id={`preview-url-${projectId}`} name="previewUrl" type="url" required placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`preview-provider-${projectId}`}>Provider</Label>
                  <select
                    id={`preview-provider-${projectId}`}
                    name="provider"
                    defaultValue="manual"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {DEPLOYMENT_PROVIDER_OPTIONS.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full">
                  Save preview deployment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            key={action.to}
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => advancePageStatus(projectId, action.to))}
          >
            {action.label}
          </Button>
        )
      ))}
    </div>
  );
}

export function QaRunDialog({ projectId, versionId, projectName }: { projectId: string; versionId?: string | null; projectName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost">Run QA</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QA: {projectName}</DialogTitle>
          <DialogDescription>
            Any failed check blocks publishing until a later run passes. Warnings are recorded but do not block.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await recordQaRun(formData);
            setOpen(false);
          }}
          className="space-y-2"
        >
          <input type="hidden" name="projectId" value={projectId} />
          {versionId ? <input type="hidden" name="versionId" value={versionId} /> : null}
          {QA_CHECKLIST.map((check) => (
            <div key={check} className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="text-sm">{check}</span>
              <select name={`check:${check}`} defaultValue="pass" className="rounded-md border bg-background px-2 py-1 text-xs">
                <option value="pass">Pass</option>
                <option value="warning">Warning</option>
                <option value="fail">Fail</option>
              </select>
            </div>
          ))}
          <div className="space-y-1.5 pt-2">
            <Label htmlFor="qa-notes">Notes</Label>
            <Textarea id="qa-notes" name="notes" rows={2} />
          </div>
          <Button type="submit" className="w-full">
            Record QA run
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateTemplateDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><Plus className="mr-1 size-3.5" /> New template</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create reusable template</DialogTitle>
          <DialogDescription>
            Starts from the built-in Lip Blush conversion preset, then becomes reusable across client page projects.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createTemplateFromPreset(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="presetKey" value="lip_blush_conversion" />
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Template name</Label>
            <Input id="template-name" name="name" required placeholder="Lip Blush conversion template" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="template-description">Description</Label>
            <Textarea id="template-description" name="description" rows={3} />
          </div>
          <Button type="submit" className="w-full">
            Create template
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CloneTemplateDialog({ templateId, templateName }: { templateId: string; templateName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost"><Copy className="mr-1 size-3.5" /> Clone</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone template</DialogTitle>
          <DialogDescription>
            Make a reusable copy of {templateName} so you can adapt it without touching the original.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await cloneTemplate(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="templateId" value={templateId} />
          <div className="space-y-1.5">
            <Label htmlFor={`template-clone-${templateId}`}>New template name</Label>
            <Input id={`template-clone-${templateId}`} name="name" required defaultValue={`${templateName} copy`} />
          </div>
          <Button type="submit" className="w-full">
            Clone template
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReusableComponentApprovalButtons({
  componentId,
  status,
}: {
  componentId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-1.5">
      {status !== "approved" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => setReusableComponentApprovalStatus(componentId, "approved"))}
        >
          <ShieldCheck className="mr-1 size-3.5" /> Approve
        </Button>
      ) : null}
      {status !== "rejected" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => startTransition(() => setReusableComponentApprovalStatus(componentId, "rejected"))}
        >
          Reject
        </Button>
      ) : null}
    </div>
  );
}

export function BuildTemplateFromComponentsDialog({
  components,
}: {
  components: ReusableComponentOption[];
}) {
  const [open, setOpen] = useState(false);
  if (components.length === 0) {
    return (
      <Button size="sm" variant="outline" disabled>
        Build from components
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">Build from components</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create template from approved components</DialogTitle>
          <DialogDescription>
            Select approved reusable sections. IHP OS will arrange them into a sensible landing-page order automatically.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createTemplateFromComponents(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="component-template-name">Template name</Label>
            <Input id="component-template-name" name="name" required placeholder="Offer page from approved components" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="component-template-description">Description</Label>
            <Textarea id="component-template-description" name="description" rows={3} />
          </div>
          <div className="space-y-2 rounded-xl border border-border/70 p-4">
            <p className="text-sm font-medium">Approved components</p>
            {components.map((component) => (
              <label key={component.id} className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2">
                <input type="checkbox" name="componentIds" value={component.id} className="mt-1" />
                <span className="min-w-0">
                  <span className="block font-medium">{component.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{component.category.replace(/_/g, " ")}</span>
                </span>
              </label>
            ))}
          </div>
          <Button type="submit" className="w-full">
            Create template
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PublishDialog({
  projectId,
  projectName,
  blocked,
  reasons,
}: {
  projectId: string;
  projectName: string;
  blocked: boolean;
  reasons: string[];
}) {
  const [open, setOpen] = useState(false);
  if (blocked) {
    return (
      <div className="text-xs text-muted-foreground" title={reasons.join(" ")}>
        Publish blocked: {reasons[0]}
      </div>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Rocket className="mr-1 size-3.5" /> Publish</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish {projectName}</DialogTitle>
          <DialogDescription>
            QA passed and the client has approved. This records the production deployment and is logged as an
            external action.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await publishPage(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <div className="space-y-1.5">
            <Label htmlFor="publish-url">Production URL</Label>
            <Input id="publish-url" name="productionUrl" type="url" required placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publish-provider">Provider</Label>
            <select id="publish-provider" name="provider" defaultValue="manual" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              {DEPLOYMENT_PROVIDER_OPTIONS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">
            Publish
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
