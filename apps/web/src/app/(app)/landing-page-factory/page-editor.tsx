"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, RefreshCw, Save, Send } from "lucide-react";
import type { LandingPageDraft, LandingPageSection, LandingPageSectionItem } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LandingPagePreview } from "./preview";
import {
  createReusableComponentFromVersion,
  recordPerformanceRecord,
  rollbackPublishedVersion,
  saveDraftVersion,
  submitVersionForApproval,
} from "./actions";

interface SelectOption {
  id: string;
  name: string;
}

interface KnowledgeOption extends SelectOption {
  kind: string;
}

interface VersionHistoryItem {
  id: string;
  version_number: number;
  version_name: string;
  status: string;
  created_at: string;
  published_at: string | null;
}

interface PerformanceRecordItem {
  id: string;
  metric_date: string;
  visits: number;
  leads: number;
  qualified_leads: number;
  bookings: number;
  revenue: number;
  verified_learning: string | null;
  experiment: { name: string } | null;
}

interface LinkedTaskItem {
  id: string;
  title: string;
  status: string;
}

const DEPLOYMENT_PROVIDER_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "vercel", label: "Vercel" },
  { value: "netlify", label: "Netlify" },
  { value: "cloudflare_pages", label: "Cloudflare Pages" },
  { value: "replit", label: "Replit" },
] as const;

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(value: string[]): string {
  return value.join("\n");
}

function updateSection(
  sections: LandingPageSection[],
  sectionId: string,
  updater: (section: LandingPageSection) => LandingPageSection,
) {
  return sections.map((section) => (section.id === sectionId ? updater(section) : section));
}

function moveSection(sections: LandingPageSection[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= sections.length) return sections;
  const clone = [...sections];
  const [section] = clone.splice(index, 1);
  clone.splice(nextIndex, 0, section);
  return clone;
}

function parseAssetValue(value: string) {
  if (!value) return { documentId: null, creativeAssetId: null };
  if (value.startsWith("document:")) return { documentId: value.slice("document:".length), creativeAssetId: null };
  if (value.startsWith("creative:")) return { documentId: null, creativeAssetId: value.slice("creative:".length) };
  return { documentId: null, creativeAssetId: null };
}

function VersionStatusBadge({ status }: { status: string }) {
  const variant =
    status === "published"
      ? "default"
      : status === "approved"
        ? "secondary"
        : status === "submitted"
          ? "outline"
          : status === "changes_requested"
            ? "destructive"
            : "outline";

  return (
    <Badge variant={variant} className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function PromoteSectionDialog({
  section,
  versionId,
  onPromoted,
}: {
  section: LandingPageSection;
  versionId: string | null;
  onPromoted: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!versionId) {
    return (
      <Button size="sm" variant="outline" disabled title="Save this draft version first to promote a reusable section.">
        Promote
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setErrorMessage(null);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" disabled={isPending}>
            Promote
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote section to reusable library</DialogTitle>
          <DialogDescription>
            This saves the exact section from the current version snapshot into the reusable component library. It still
            needs approval before template builders can reuse it across clients.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            setErrorMessage(null);
            startTransition(async () => {
              try {
                formData.set("versionId", versionId);
                formData.set("sectionId", section.id);
                await createReusableComponentFromVersion(formData);
                setOpen(false);
                onPromoted(`${section.label} was promoted into the reusable library for review.`);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to promote this section right now.");
              }
            });
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`promote-name-${section.id}`}>Component name</Label>
            <Input id={`promote-name-${section.id}`} name="name" required defaultValue={section.label} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`promote-purpose-${section.id}`}>Conversion purpose</Label>
            <Input
              id={`promote-purpose-${section.id}`}
              name="conversionPurpose"
              defaultValue={section.label}
              placeholder="What job this section does on the page"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`promote-analytics-${section.id}`}>Analytics events</Label>
            <Input
              id={`promote-analytics-${section.id}`}
              name="analyticsEvents"
              placeholder="e.g. hero_cta_click, faq_expand"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`promote-accessibility-${section.id}`}>Accessibility notes</Label>
            <Textarea
              id={`promote-accessibility-${section.id}`}
              name="accessibilityNotes"
              rows={3}
              placeholder="Any alt-text, contrast, focus, or reading-order notes reviewers should keep with this section"
            />
          </div>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            Save reusable component
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RollbackVersionDialog({
  projectId,
  version,
  productionUrl,
  onRecorded,
}: {
  projectId: string;
  version: VersionHistoryItem;
  productionUrl: string | null;
  onRecorded: (message: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setErrorMessage(null);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" disabled={isPending}>
            <RefreshCw className="mr-2 size-4" /> Roll back to this version
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Roll back live page</DialogTitle>
          <DialogDescription>
            Record which production URL and hosting provider now serve this exact approved version. This keeps the
            rollback audit trail explicit.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            setErrorMessage(null);
            startTransition(async () => {
              try {
                formData.set("projectId", projectId);
                formData.set("versionId", version.id);
                await rollbackPublishedVersion(formData);
                setOpen(false);
                onRecorded(`Rollback recorded for ${version.version_name}.`);
                router.refresh();
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to record the rollback right now.");
              }
            });
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`rollback-url-${version.id}`}>Production URL</Label>
            <Input
              id={`rollback-url-${version.id}`}
              name="productionUrl"
              type="url"
              required
              defaultValue={productionUrl ?? ""}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`rollback-provider-${version.id}`}>Provider</Label>
            <select
              id={`rollback-provider-${version.id}`}
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
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            Record rollback
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionEditor({
  section,
  index,
  count,
  versionId,
  onChange,
  onMove,
  onPromoted,
}: {
  section: LandingPageSection;
  index: number;
  count: number;
  versionId: string | null;
  onChange: (section: LandingPageSection) => void;
  onMove: (direction: -1 | 1) => void;
  onPromoted: (message: string) => void;
}) {
  const updateItem = (itemId: string, updater: (item: LandingPageSectionItem) => LandingPageSectionItem) => {
    onChange({
      ...section,
      items: section.items.map((item) => (item.id === itemId ? updater(item) : item)),
    });
  };

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{section.label}</CardTitle>
            <CardDescription className="capitalize">{section.kind.replace(/_/g, " ")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={section.enabled}
                onChange={(event) => onChange({ ...section, enabled: event.target.checked })}
              />
              Enabled
            </label>
            <PromoteSectionDialog section={section} versionId={versionId} onPromoted={onPromoted} />
            <Button size="icon" variant="outline" disabled={index === 0} onClick={() => onMove(-1)}>
              <ChevronUp className="size-4" />
            </Button>
            <Button size="icon" variant="outline" disabled={index === count - 1} onClick={() => onMove(1)}>
              <ChevronDown className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Eyebrow</Label>
            <Input value={section.eyebrow ?? ""} onChange={(event) => onChange({ ...section, eyebrow: event.target.value || null })} />
          </div>
          <div className="space-y-1.5">
            <Label>Badge</Label>
            <Input value={section.badge ?? ""} onChange={(event) => onChange({ ...section, badge: event.target.value || null })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Headline</Label>
          <Input value={section.headline ?? ""} onChange={(event) => onChange({ ...section, headline: event.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label>Subheadline</Label>
          <Input
            value={section.subheadline ?? ""}
            onChange={(event) => onChange({ ...section, subheadline: event.target.value || null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Body</Label>
          <Textarea value={section.body ?? ""} rows={4} onChange={(event) => onChange({ ...section, body: event.target.value || null })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>CTA label</Label>
            <Input value={section.ctaLabel ?? ""} onChange={(event) => onChange({ ...section, ctaLabel: event.target.value || null })} />
          </div>
          <div className="space-y-1.5">
            <Label>CTA href</Label>
            <Input value={section.ctaHref ?? ""} onChange={(event) => onChange({ ...section, ctaHref: event.target.value || null })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Bullets, one per line</Label>
          <Textarea
            value={joinLines(section.bullets)}
            rows={3}
            onChange={(event) => onChange({ ...section, bullets: splitLines(event.target.value) })}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Section items</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  ...section,
                  items: [
                    ...section.items,
                    { id: `${section.id}-${section.items.length + 1}`, title: "New item", body: null, meta: null },
                  ],
                })
              }
            >
              Add item
            </Button>
          </div>

          {section.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No items in this section yet.</p>
          ) : (
            section.items.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-lg border border-border/70 p-3">
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Input
                    value={item.title}
                    onChange={(event) => updateItem(item.id, (current) => ({ ...current, title: event.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onChange({ ...section, items: section.items.filter((current) => current.id !== item.id) })}
                  >
                    Remove
                  </Button>
                </div>
                <Input
                  placeholder="Meta"
                  value={item.meta ?? ""}
                  onChange={(event) => updateItem(item.id, (current) => ({ ...current, meta: event.target.value || null }))}
                />
                <Textarea
                  placeholder="Body"
                  rows={3}
                  value={item.body ?? ""}
                  onChange={(event) => updateItem(item.id, (current) => ({ ...current, body: event.target.value || null }))}
                />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LandingPageEditor({
  projectId,
  projectStatus,
  initialVersionId,
  initialDraft,
  previewUrl,
  productionUrl,
  versionHistory,
  documents,
  creativeAssets,
  knowledgeEntries,
  experiments,
  campaigns,
  performanceRecords,
  linkedTasks,
}: {
  projectId: string;
  projectStatus: string;
  initialVersionId: string | null;
  initialDraft: LandingPageDraft;
  previewUrl: string | null;
  productionUrl: string | null;
  versionHistory: VersionHistoryItem[];
  documents: SelectOption[];
  creativeAssets: SelectOption[];
  knowledgeEntries: KnowledgeOption[];
  experiments: SelectOption[];
  campaigns: SelectOption[];
  performanceRecords: PerformanceRecordItem[];
  linkedTasks: LinkedTaskItem[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [versionId, setVersionId] = useState<string | null>(initialVersionId);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredDraft = useDeferredValue(draft);

  const groupedKnowledge = useMemo(() => {
    const groups = new Map<string, KnowledgeOption[]>();
    for (const entry of knowledgeEntries) {
      if (!groups.has(entry.kind)) groups.set(entry.kind, []);
      groups.get(entry.kind)!.push(entry);
    }
    return groups;
  }, [knowledgeEntries]);

  const assetOptions = useMemo(
    () => [
      ...documents.map((doc) => ({ value: `document:${doc.id}`, label: `Document: ${doc.name}` })),
      ...creativeAssets.map((asset) => ({ value: `creative:${asset.id}`, label: `Creative: ${asset.name}` })),
    ],
    [creativeAssets, documents],
  );

  const runAction = (action: () => Promise<void>, successMessage: string) => {
    startTransition(async () => {
      try {
        await action();
        setMessage(successMessage);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  };

  const buildDraftFormData = () => {
    const formData = new FormData();
    formData.set("projectId", projectId);
    if (versionId) formData.set("versionId", versionId);
    formData.set("draftJson", JSON.stringify(draft));
    return formData;
  };

  const saveDraft = () =>
    runAction(async () => {
      const result = await saveDraftVersion(buildDraftFormData());
      setVersionId(result.versionId);
    }, "Draft saved.");

  const submitForApproval = () =>
    runAction(async () => {
      const formData = buildDraftFormData();
      if (previewUrl) formData.set("previewUrl", previewUrl);
      await submitVersionForApproval(formData);
    }, "Version submitted for client approval.");

  const submitPerformance = (formData: FormData) =>
    runAction(async () => {
      formData.set("projectId", projectId);
      await recordPerformanceRecord(formData);
    }, "Performance record saved.");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl">Editor and live preview</h2>
          <p className="text-sm text-muted-foreground">
            Edit the exact draft version, validate the client-safe inputs, then submit that exact version for approval.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")}>
            Desktop
          </Button>
          <Button variant={previewMode === "mobile" ? "default" : "outline"} onClick={() => setPreviewMode("mobile")}>
            Mobile
          </Button>
          <Button variant="outline" disabled={isPending} onClick={saveDraft}>
            <Save className="mr-2 size-4" /> Save draft
          </Button>
          <Button disabled={isPending || !versionId || projectStatus !== "internal_approval"} onClick={submitForApproval}>
            <Send className="mr-2 size-4" /> Submit for approval
          </Button>
        </div>
      </div>

      {message ? <p className="rounded-lg border border-border/70 bg-card px-4 py-3 text-sm">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Page settings</CardTitle>
              <CardDescription>Draft-level metadata, destination settings, and conversion controls.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Page title</Label>
                  <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Version name</Label>
                  <Input value={draft.versionName} onChange={(event) => setDraft({ ...draft, versionName: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Subdomain</Label>
                  <Input value={draft.subdomain ?? ""} onChange={(event) => setDraft({ ...draft, subdomain: event.target.value || null })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Custom domain</Label>
                  <Input value={draft.domain ?? ""} onChange={(event) => setDraft({ ...draft, domain: event.target.value || null })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Primary CTA type</Label>
                  <select
                    value={draft.form.ctaType}
                    onChange={(event) =>
                      setDraft({ ...draft, form: { ...draft.form, ctaType: event.target.value as LandingPageDraft["form"]["ctaType"] } })
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="booking_link">Booking link</option>
                    <option value="lead_form">Lead form</option>
                    <option value="external_checkout">External checkout</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Submit label</Label>
                  <Input value={draft.form.submitLabel} onChange={(event) => setDraft({ ...draft, form: { ...draft.form, submitLabel: event.target.value } })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Booking URL</Label>
                  <Input value={draft.form.bookingUrl ?? ""} onChange={(event) => setDraft({ ...draft, form: { ...draft.form, bookingUrl: event.target.value || null } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>External checkout URL</Label>
                  <Input
                    value={draft.form.externalCheckoutUrl ?? ""}
                    onChange={(event) => setDraft({ ...draft, form: { ...draft.form, externalCheckoutUrl: event.target.value || null } })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Editor notes</Label>
                <Textarea value={draft.notes ?? ""} rows={3} onChange={(event) => setDraft({ ...draft, notes: event.target.value || null })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Theme, tracking, SEO</CardTitle>
              <CardDescription>Client-specific branding, tracking IDs, and share metadata.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Brand name</Label>
                  <Input value={draft.theme.brandName} onChange={(event) => setDraft({ ...draft, theme: { ...draft.theme, brandName: event.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tag line</Label>
                  <Input value={draft.theme.tagLine ?? ""} onChange={(event) => setDraft({ ...draft, theme: { ...draft.theme, tagLine: event.target.value || null } })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Primary colour</Label>
                  <Input value={draft.theme.primaryColour} onChange={(event) => setDraft({ ...draft, theme: { ...draft.theme, primaryColour: event.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Accent colour</Label>
                  <Input value={draft.theme.accentColour} onChange={(event) => setDraft({ ...draft, theme: { ...draft.theme, accentColour: event.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Surface colour</Label>
                  <Input value={draft.theme.surfaceColour} onChange={(event) => setDraft({ ...draft, theme: { ...draft.theme, surfaceColour: event.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Text colour</Label>
                  <Input value={draft.theme.textColour} onChange={(event) => setDraft({ ...draft, theme: { ...draft.theme, textColour: event.target.value } })} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>GA4 measurement ID</Label>
                  <Input value={draft.tracking.ga4MeasurementId ?? ""} onChange={(event) => setDraft({ ...draft, tracking: { ...draft.tracking, ga4MeasurementId: event.target.value || null } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Meta Pixel ID</Label>
                  <Input value={draft.tracking.metaPixelId ?? ""} onChange={(event) => setDraft({ ...draft, tracking: { ...draft.tracking, metaPixelId: event.target.value || null } })} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Meta title</Label>
                  <Input value={draft.seo.metaTitle} onChange={(event) => setDraft({ ...draft, seo: { ...draft.seo, metaTitle: event.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Canonical URL</Label>
                  <Input value={draft.seo.canonicalUrl ?? ""} onChange={(event) => setDraft({ ...draft, seo: { ...draft.seo, canonicalUrl: event.target.value || null } })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Meta description</Label>
                <Textarea value={draft.seo.metaDescription} rows={3} onChange={(event) => setDraft({ ...draft, seo: { ...draft.seo, metaDescription: event.target.value } })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Client-safe sources and assets</CardTitle>
              <CardDescription>Select only approved knowledge and assets for this client.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {draft.assetSlots.map((slot) => {
                  const currentValue = slot.documentId ? `document:${slot.documentId}` : slot.creativeAssetId ? `creative:${slot.creativeAssetId}` : "";
                  return (
                    <div key={slot.slot} className="space-y-1.5">
                      <Label>{slot.label}</Label>
                      <select
                        value={currentValue}
                        onChange={(event) => {
                          const next = parseAssetValue(event.target.value);
                          setDraft({
                            ...draft,
                            assetSlots: draft.assetSlots.map((current) =>
                              current.slot === slot.slot ? { ...current, ...next } : current,
                            ),
                          });
                        }}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">No asset selected</option>
                        {assetOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {([
                ["brandVoiceIds", "Brand voice"],
                ["offerIds", "Offers"],
                ["audienceIds", "Audience"],
                ["restrictionIds", "Restrictions"],
                ["proofIds", "Proof"],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <select
                    multiple
                    value={draft.sourceContext[key]}
                    onChange={(event) => {
                      const values = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
                      setDraft({
                        ...draft,
                        sourceContext: { ...draft.sourceContext, [key]: values },
                      });
                    }}
                    className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {(groupedKnowledge.get(
                      key === "brandVoiceIds"
                        ? "brand_voice"
                        : key === "offerIds"
                          ? "offer"
                          : key === "audienceIds"
                            ? "icp"
                            : key === "restrictionIds"
                              ? "policy"
                              : "winning_pattern",
                    ) ?? []).map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>

          {draft.sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              count={draft.sections.length}
              versionId={versionId}
              onMove={(direction) => setDraft({ ...draft, sections: moveSection(draft.sections, index, direction) })}
              onChange={(nextSection) =>
                setDraft({
                  ...draft,
                  sections: updateSection(draft.sections, nextSection.id, () => nextSection),
                })
              }
              onPromoted={setMessage}
            />
          ))}

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Performance loop</CardTitle>
              <CardDescription>Track outcomes, A/B-test records, and verified learnings for this page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <form
                action={submitPerformance}
                className="grid gap-3 rounded-xl border border-border/70 p-4"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Version</Label>
                    <select name="versionId" defaultValue={versionId ?? ""} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                      <option value="">Unspecified version</option>
                      {versionHistory.map((version) => (
                        <option key={version.id} value={version.id}>
                          {version.version_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Campaign</Label>
                    <select name="campaignId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                      <option value="">No campaign</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Experiment</Label>
                    <select name="experimentId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                      <option value="">No experiment</option>
                      {experiments.map((experiment) => (
                        <option key={experiment.id} value={experiment.id}>
                          {experiment.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input name="metricDate" type="date" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Visits</Label>
                    <Input name="visits" type="number" min="0" defaultValue="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Leads</Label>
                    <Input name="leads" type="number" min="0" defaultValue="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Qualified</Label>
                    <Input name="qualifiedLeads" type="number" min="0" defaultValue="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bookings</Label>
                    <Input name="bookings" type="number" min="0" defaultValue="0" />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Revenue</Label>
                    <Input name="revenue" type="number" min="0" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Conversion rate</Label>
                    <Input name="conversionRate" type="number" min="0" step="0.0001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Source</Label>
                    <select name="source" defaultValue="manual" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                      <option value="manual">Manual</option>
                      <option value="campaign_metrics">Campaign metrics</option>
                      <option value="experiment">Experiment</option>
                      <option value="import">Import</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Verified learning</Label>
                  <Textarea name="verifiedLearning" rows={3} />
                </div>

                <Button type="submit" disabled={isPending}>
                  Save performance record
                </Button>
              </form>

              {performanceRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No performance records yet.</p>
              ) : (
                <div className="space-y-2">
                  {performanceRecords.map((record) => (
                    <div key={record.id} className="rounded-xl border border-border/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{record.metric_date}</p>
                        {record.experiment ? <Badge variant="outline">{record.experiment.name}</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {record.visits} visits, {record.leads} leads, {record.bookings} bookings, ${record.revenue.toFixed(2)} revenue
                      </p>
                      {record.verified_learning ? <p className="mt-2 text-sm">{record.verified_learning}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <LandingPagePreview draft={deferredDraft} mode={previewMode} />

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Version history</CardTitle>
              <CardDescription>Published history, exact approvals, and rollback points stay explicit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {versionHistory.map((version) => (
                <div key={version.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {version.version_name} · v{version.version_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(version.created_at).toLocaleDateString()}
                        {version.published_at ? ` · Published ${new Date(version.published_at).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <VersionStatusBadge status={version.status} />
                  </div>
                  {version.status === "published" || version.status === "approved" ? (
                    <div className="mt-3">
                      <RollbackVersionDialog
                        projectId={projectId}
                        version={version}
                        productionUrl={productionUrl}
                        onRecorded={setMessage}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Linked work items</CardTitle>
              <CardDescription>Connected work stays visible alongside the page build.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {linkedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No linked tasks found for the connected project.</p>
              ) : (
                linkedTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-border/70 px-3 py-2">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{task.status.replace(/_/g, " ")}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
