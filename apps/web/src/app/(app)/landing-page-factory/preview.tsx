import { type CSSProperties } from "react";
import { type LandingPageDraft, type LandingPageSection } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LandingPagePreviewAssetSource {
  id: string;
  kind: "document" | "creative";
  name: string;
  previewUrl: string | null;
  mimeType: string | null;
}

type PreviewMode = "desktop" | "mobile";

interface ResolvedSlotAsset {
  label: string;
  alt: string;
  previewUrl: string | null;
}

function resolveSlotAsset(
  draft: LandingPageDraft,
  assetLookup: Map<string, LandingPagePreviewAssetSource>,
  slot: string,
  fallback: string,
): ResolvedSlotAsset {
  const asset = draft.assetSlots.find((item) => item.slot === slot);
  if (!asset) {
    return { label: fallback, alt: fallback, previewUrl: null };
  }

  const lookupKey = asset.documentId ? `document:${asset.documentId}` : asset.creativeAssetId ? `creative:${asset.creativeAssetId}` : null;
  const source = lookupKey ? assetLookup.get(lookupKey) : null;
  return {
    label: asset.label || source?.name || fallback,
    alt: asset.altText || source?.name || asset.label || fallback,
    previewUrl: source?.previewUrl ?? null,
  };
}

function itemBody(section: LandingPageSection, fallback: string): string {
  return section.body ?? fallback;
}

function sectionHighlights(section: LandingPageSection, fallback: string[]): string[] {
  const highlights = section.bullets.filter(Boolean);
  return highlights.length > 0 ? highlights : fallback;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function resolvePrimaryCtaHref(draft: LandingPageDraft): string | null {
  switch (draft.form.ctaType) {
    case "booking_link":
      return draft.form.bookingUrl;
    case "external_checkout":
      return draft.form.externalCheckoutUrl;
    case "lead_form":
      return "#lead-form";
    default:
      return null;
  }
}

function resolveSectionHref(
  draft: LandingPageDraft,
  kind: LandingPageSection["kind"],
): string | null {
  const section = draft.sections.find((candidate) => candidate.enabled && candidate.kind === kind);
  return section ? `#${section.id}` : null;
}

function PreviewPill({ children, subtle = false }: { children: string; subtle?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
        subtle ? "border-black/10 bg-black/4 text-black/55" : "border-white/20 bg-white/80 text-black/70",
      )}
    >
      {children}
    </span>
  );
}

function PreviewButton({
  label,
  variant = "default",
  href,
}: {
  label: string;
  variant?: "default" | "outline" | "secondary";
  href?: string | null;
}) {
  const external = href ? isExternalHref(href) : false;
  return (
    <Button
      render={
        href ? <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} /> : undefined
      }
      variant={variant}
      className={cn(
        "h-11 rounded-full px-5 text-sm shadow-sm",
        variant === "default" && "bg-[color:var(--lpf-primary)] text-white hover:bg-[color:var(--lpf-primary)]/90",
        variant === "outline" && "border-black/10 bg-white/90 hover:bg-white",
        variant === "secondary" && "bg-white text-[color:var(--lpf-primary)] hover:bg-white/90",
      )}
    >
      {label}
    </Button>
  );
}

function SectionIntro({
  section,
  align = "left",
}: {
  section: LandingPageSection;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("space-y-3", align === "center" && "mx-auto max-w-3xl text-center")}>
      {section.eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45">{section.eyebrow}</p>
      ) : null}
      {section.headline ? <h2 className="font-heading text-3xl leading-[1.05] md:text-4xl">{section.headline}</h2> : null}
      {section.subheadline ? <p className="text-base leading-7 text-black/72">{section.subheadline}</p> : null}
      {section.body ? <p className="max-w-3xl text-sm leading-7 text-black/62">{section.body}</p> : null}
    </div>
  );
}

function AssetPlaceholder({
  title,
  label,
  imageUrl,
  imageAlt,
  note,
  aspectClass,
  dark = false,
}: {
  title: string;
  label: string;
  imageUrl?: string | null;
  imageAlt?: string;
  note?: string | null;
  aspectClass: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.6rem] border p-4 shadow-[0_18px_50px_-35px_rgba(20,12,18,0.45)]",
        dark
          ? "border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] text-white"
          : "border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.78))] text-black",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.24em]", dark ? "text-white/65" : "text-black/45")}>
            {title}
          </p>
          <p className={cn("text-sm", dark ? "text-white/85" : "text-black/70")}>{label}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
            dark ? "bg-white/12 text-white/72" : "bg-black/4 text-black/48",
          )}
        >
          Image slot
        </span>
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.25rem] border border-dashed p-4",
          aspectClass,
          dark ? "border-white/18 bg-black/12" : "border-black/10 bg-[linear-gradient(135deg,rgba(125,58,70,0.08),rgba(217,166,139,0.22))]",
        )}
      >
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={imageAlt ?? label} className="absolute inset-0 size-full object-cover" />
            <div className={cn("absolute inset-0", dark ? "bg-black/28" : "bg-white/10")} />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_58%)] opacity-80" />
        )}
        <div className="relative flex h-full flex-col justify-between">
          <div className={cn("max-w-[15rem] text-sm leading-6", dark ? "text-white/82" : "text-black/68")}>{label}</div>
          {note ? (
            <div className={cn("self-start rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]", dark ? "bg-white/10 text-white/70" : "bg-white/70 text-black/48")}>
              {note}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BookingCard({ draft, section }: { draft: LandingPageDraft; section: LandingPageSection }) {
  const bullets = sectionHighlights(section, [
    "Customized shape and colour planning",
    "Clear aftercare and next steps",
    "Book online without back-and-forth",
  ]).slice(0, 3);
  const primaryHref = resolvePrimaryCtaHref(draft);
  const secondaryHref = resolveSectionHref(draft, "faq") ?? resolveSectionHref(draft, "results") ?? primaryHref;
  const destinationLabel =
    draft.form.bookingUrl ??
    draft.form.externalCheckoutUrl ??
    (draft.form.ctaType === "lead_form"
      ? "This page can capture leads natively once the final form destination is connected."
      : "Attach the final booking, lead, or checkout destination here.");

  return (
    <div
      id={draft.form.ctaType === "lead_form" ? "lead-form" : undefined}
      className="rounded-[1.6rem] border border-black/8 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(20,12,18,0.5)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">Primary conversion path</p>
          <h3 className="mt-2 font-heading text-2xl leading-tight">{draft.form.submitLabel}</h3>
        </div>
        <Badge variant="outline" className="border-black/10 bg-black/4 text-black/60">
          {draft.form.ctaType === "booking_link" ? "Booking" : draft.form.ctaType === "lead_form" ? "Lead form" : "Checkout"}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        {bullets.map((bullet) => (
          <div key={bullet} className="flex items-start gap-2 rounded-2xl bg-[color:var(--lpf-surface)] px-3 py-3 text-sm text-black/68">
            <span className="mt-1 size-2 rounded-full bg-[color:var(--lpf-accent)]" />
            <span>{bullet}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 rounded-[1.35rem] border border-black/8 bg-[linear-gradient(180deg,rgba(125,58,70,0.08),rgba(255,255,255,0.96))] p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-black/45">Destination</p>
        <p className="text-sm leading-6 text-black/70">{destinationLabel}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <PreviewButton label={draft.form.submitLabel} href={primaryHref} />
        <PreviewButton label="Preview next step" href={secondaryHref} variant="outline" />
      </div>
    </div>
  );
}

function QuoteCard({
  title,
  body,
  meta,
}: {
  title: string;
  body?: string | null;
  meta?: string | null;
}) {
  return (
    <div className="rounded-[1.45rem] border border-black/8 bg-white p-5 shadow-[0_20px_50px_-38px_rgba(20,12,18,0.45)]">
      <p className="text-xs tracking-[0.24em] text-[color:var(--lpf-primary)]">★★★★★</p>
      <p className="mt-3 font-heading text-xl leading-8">
        &ldquo;{title}&rdquo;
      </p>
      {body ? <p className="mt-3 text-sm leading-7 text-black/64">{body}</p> : null}
      {meta ? <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-black/42">{meta}</p> : null}
    </div>
  );
}

function ProcessCard({ item, index }: { item: LandingPageSection["items"][number]; index: number }) {
  return (
    <div className="relative rounded-[1.5rem] border border-black/8 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(20,12,18,0.45)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-[color:var(--lpf-primary)] text-sm font-semibold text-white">
          {index + 1}
        </div>
        <div>
          {item.meta ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/40">{item.meta}</p> : null}
          <p className="font-heading text-2xl leading-tight">{item.title}</p>
        </div>
      </div>
      {item.body ? <p className="text-sm leading-7 text-black/64">{item.body}</p> : null}
    </div>
  );
}

function FaqCard({ item }: { item: LandingPageSection["items"][number] }) {
  return (
    <div className="rounded-[1.35rem] border border-black/8 bg-white px-5 py-4 shadow-[0_18px_40px_-36px_rgba(20,12,18,0.4)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-black/88">{item.title}</p>
          {item.body ? <p className="mt-2 text-sm leading-7 text-black/62">{item.body}</p> : null}
        </div>
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black/4 text-lg text-black/45">
          +
        </div>
      </div>
    </div>
  );
}

function PreviewSection({
  draft,
  assetLookup,
  section,
}: {
  draft: LandingPageDraft;
  assetLookup: Map<string, LandingPagePreviewAssetSource>;
  section: LandingPageSection;
}) {
  const primaryHref = resolvePrimaryCtaHref(draft);

  switch (section.kind) {
    case "hero": {
      const heroVisual = resolveSlotAsset(draft, assetLookup, "hero", "Show the strongest hero image or close-up result here.");
      const heroDetailVisual = resolveSlotAsset(
        draft,
        assetLookup,
        "hero_detail",
        "Add a secondary visual, brand detail, or close-up proof image here.",
      );
      const heroItems = section.items.slice(0, 3);
      const heroPrimaryHref = section.ctaHref ?? primaryHref;
      const resultsHref = resolveSectionHref(draft, "results") ?? heroPrimaryHref;
      return (
        <section
          className="relative overflow-hidden rounded-[2.3rem] border border-black/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,243,0.98))] px-6 py-6 shadow-[0_30px_90px_-50px_rgba(20,12,18,0.55)] md:px-8 md:py-8"
          id={section.id}
        >
          <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top_right,rgba(125,58,70,0.16),transparent_60%)]" />
          <div className="absolute -left-10 top-10 size-40 rounded-full bg-[color:var(--lpf-accent)]/22 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                {section.badge ? <Badge className="border-0 bg-[color:var(--lpf-primary)]/10 text-[color:var(--lpf-primary)]">{section.badge}</Badge> : null}
                {section.eyebrow ? <PreviewPill subtle>{section.eyebrow}</PreviewPill> : null}
              </div>

              {section.headline ? <h1 className="max-w-3xl font-heading text-4xl leading-[0.98] md:text-6xl">{section.headline}</h1> : null}
              {section.subheadline ? <p className="max-w-2xl text-lg leading-8 text-black/74">{section.subheadline}</p> : null}
              {section.body ? <p className="max-w-2xl text-sm leading-8 text-black/62">{section.body}</p> : null}

              <div className="flex flex-wrap gap-2 pt-1">
                {sectionHighlights(section, ["Custom-mapped service", "Natural healed result", "Simple booking path"]).map((bullet) => (
                  <PreviewPill key={bullet}>{bullet}</PreviewPill>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {section.ctaLabel ? <PreviewButton label={section.ctaLabel} href={heroPrimaryHref} /> : null}
                <PreviewButton label="See healed results" href={resultsHref} variant="outline" />
              </div>

              {heroItems.length > 0 ? (
                <div className="grid gap-3 pt-3 md:grid-cols-3">
                  {heroItems.map((item) => (
                    <div key={item.id} className="rounded-[1.3rem] border border-black/8 bg-white/88 px-4 py-4 shadow-[0_18px_40px_-38px_rgba(20,12,18,0.45)]">
                      {item.meta ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/42">{item.meta}</p> : null}
                      <p className="mt-2 font-medium text-black/86">{item.title}</p>
                      {item.body ? <p className="mt-2 text-sm leading-6 text-black/60">{item.body}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <AssetPlaceholder
                  title="Hero visual"
                  label={heroVisual.label}
                  imageUrl={heroVisual.previewUrl}
                  imageAlt={heroVisual.alt}
                  note="Primary visual"
                  aspectClass="aspect-[4/5]"
                />
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-black/8 bg-[color:var(--lpf-primary)] px-5 py-5 text-white shadow-[0_22px_60px_-42px_rgba(20,12,18,0.55)]">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">Why this converts</p>
                    <p className="mt-3 font-heading text-2xl leading-tight">
                      {draft.social.socialProofLabel ?? "Real proof, clear offer, repeated CTA"}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/78">
                      A strong landing page makes the outcome obvious, lowers fear, and gives the visitor a clean next step.
                    </p>
                  </div>
                  <AssetPlaceholder
                    title="Supporting visual"
                    label={heroDetailVisual.label}
                    imageUrl={heroDetailVisual.previewUrl}
                    imageAlt={heroDetailVisual.alt}
                    note="Detail visual"
                    aspectClass="aspect-[4/3]"
                  />
                  <div className="rounded-[1.5rem] border border-black/8 bg-white/92 px-4 py-4 shadow-[0_18px_45px_-38px_rgba(20,12,18,0.42)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/42">Visitor takeaway</p>
                    <p className="mt-2 text-sm leading-7 text-black/64">
                      {section.subheadline ?? "Make the promise feel polished, intentional, and easy to trust."}
                    </p>
                  </div>
                </div>
              </div>
              <BookingCard draft={draft} section={section} />
            </div>
          </div>
        </section>
      );
    }
    case "results": {
      const resultsPrimary = resolveSlotAsset(
        draft,
        assetLookup,
        "results_primary",
        "Before and after collage or strongest proof image",
      );
      const resultsSecondary = resolveSlotAsset(
        draft,
        assetLookup,
        "results_secondary",
        "Healed result, detail shot, or supporting proof image",
      );
      return (
        <section className="rounded-[2.1rem] border border-black/8 bg-[rgba(255,250,246,0.92)] px-6 py-6 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.45)] md:px-8 md:py-8" id={section.id}>
          <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-5">
              <SectionIntro section={section} />
              <div className="grid gap-4 md:grid-cols-2">
                <AssetPlaceholder
                  title="Results gallery"
                  label={resultsPrimary.label}
                  imageUrl={resultsPrimary.previewUrl}
                  imageAlt={resultsPrimary.alt}
                  note="Before + after"
                  aspectClass="aspect-[4/3]"
                />
                <AssetPlaceholder
                  title="Healed outcome"
                  label={resultsSecondary.label}
                  imageUrl={resultsSecondary.previewUrl}
                  imageAlt={resultsSecondary.alt}
                  note="Healed result"
                  aspectClass="aspect-[4/3]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {section.items.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-black/8 bg-white px-4 py-4 shadow-[0_18px_45px_-38px_rgba(20,12,18,0.4)]">
                    {item.meta ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--lpf-primary)]">{item.meta}</p> : null}
                    <p className="mt-2 font-medium text-black/86">{item.title}</p>
                    {item.body ? <p className="mt-2 text-sm leading-7 text-black/62">{item.body}</p> : null}
                  </div>
                ))}
              </div>

              {section.bullets.length > 0 ? (
                <div className="rounded-[1.6rem] border border-black/8 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(20,12,18,0.4)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/42">Claims and highlights</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {section.bullets.map((bullet) => (
                      <PreviewPill key={bullet} subtle>
                        {bullet}
                      </PreviewPill>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      );
    }
    case "offer": {
      const offerPrimaryHref = section.ctaHref ?? primaryHref;
      const compareHref = resolveSectionHref(draft, "faq") ?? resolveSectionHref(draft, "testimonials") ?? offerPrimaryHref;
      return (
        <section className="rounded-[2.05rem] border border-black/8 bg-white px-6 py-6 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.45)] md:px-8 md:py-8" id={section.id}>
          <div className="grid gap-6 xl:grid-cols-[1fr_0.96fr]">
            <div className="space-y-5">
              <SectionIntro section={section} />
              {section.bullets.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {section.bullets.map((bullet) => (
                    <div key={bullet} className="rounded-[1.2rem] border border-black/8 bg-[color:var(--lpf-surface)] px-4 py-4 text-sm leading-7 text-black/66">
                      {bullet}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.7rem] border border-black/8 bg-[linear-gradient(180deg,rgba(125,58,70,0.08),rgba(255,255,255,0.98))] p-5 shadow-[0_22px_60px_-42px_rgba(20,12,18,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/42">What is included</p>
                <div className="mt-4 grid gap-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="rounded-[1.2rem] border border-black/8 bg-white/90 px-4 py-4">
                      {item.meta ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--lpf-primary)]">{item.meta}</p> : null}
                      <p className="mt-2 font-medium text-black/86">{item.title}</p>
                      {item.body ? <p className="mt-2 text-sm leading-7 text-black/62">{item.body}</p> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-black/8 bg-[color:var(--lpf-primary)] px-5 py-5 text-white shadow-[0_24px_65px_-45px_rgba(20,12,18,0.55)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/65">Investment and CTA</p>
                <p className="mt-3 font-heading text-3xl leading-tight">{section.subheadline ?? "Clarify the investment"}</p>
                <p className="mt-3 text-sm leading-7 text-white/78">{itemBody(section, "Use this area for the final offer framing and what the visitor gets when they book.")}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {section.ctaLabel ? <PreviewButton label={section.ctaLabel} href={offerPrimaryHref} variant="secondary" /> : null}
                  <PreviewButton label="Compare options" href={compareHref} variant="outline" />
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }
    case "promise": {
      const promisePrimaryHref = section.ctaHref ?? primaryHref;
      return (
        <section
          className="overflow-hidden rounded-[2.1rem] border border-[color:var(--lpf-accent)]/40 bg-[linear-gradient(140deg,rgba(255,248,244,0.98),rgba(255,255,255,0.94))] px-6 py-7 shadow-[0_24px_70px_-48px_rgba(20,12,18,0.44)] md:px-8"
          id={section.id}
        >
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
            <div className="space-y-4">
              <SectionIntro section={section} />
              {section.ctaLabel ? (
                <div className="pt-2">
                  <PreviewButton label={section.ctaLabel} href={promisePrimaryHref} />
                </div>
              ) : null}
            </div>

            <div className="grid gap-3">
              {sectionHighlights(section, ["Lower the fear", "Name the concern", "Give the visitor a reason to trust the next step"]).map((bullet) => (
                <div key={bullet} className="rounded-[1.3rem] border border-black/8 bg-white/94 px-4 py-4 text-sm leading-7 text-black/66 shadow-[0_18px_45px_-38px_rgba(20,12,18,0.38)]">
                  {bullet}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "process": {
      return (
        <section className="rounded-[2.05rem] border border-black/8 bg-white px-6 py-6 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.44)] md:px-8 md:py-8" id={section.id}>
          <div className="space-y-6">
            <SectionIntro section={section} align="center" />
            <div className="grid gap-4 xl:grid-cols-4">
              {section.items.map((item, index) => (
                <ProcessCard key={item.id} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "testimonials": {
      return (
        <section className="rounded-[2.05rem] border border-black/8 bg-[rgba(255,251,247,0.94)] px-6 py-6 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.44)] md:px-8 md:py-8" id={section.id}>
          <div className="space-y-6">
            <SectionIntro section={section} align="center" />
            <div className="grid gap-4 xl:grid-cols-3">
              {section.items.map((item) => (
                <QuoteCard key={item.id} title={item.title} body={item.body} meta={item.meta} />
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "faq": {
      return (
        <section className="rounded-[2.05rem] border border-black/8 bg-white px-6 py-6 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.44)] md:px-8 md:py-8" id={section.id}>
          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              <SectionIntro section={section} />
              {section.bullets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {section.bullets.map((bullet) => (
                    <PreviewPill key={bullet} subtle>
                      {bullet}
                    </PreviewPill>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {section.items.map((item) => (
                <FaqCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "location": {
      const trustVisual = resolveSlotAsset(
        draft,
        assetLookup,
        "trust_visual",
        "Use this slot for the studio, founder, venue, or another trust-building image.",
      );
      const locationPrimaryHref = section.ctaHref ?? primaryHref;
      return (
        <section className="rounded-[2.05rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,244,239,0.96))] px-6 py-6 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.44)] md:px-8 md:py-8" id={section.id}>
          <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
            <div className="space-y-5">
              <SectionIntro section={section} />
              <div className="flex flex-wrap gap-2">
                {sectionHighlights(section, ["Add studio or service area context", "Reassure around policies", "Keep the final click clear"]).map((bullet) => (
                  <PreviewPill key={bullet} subtle>
                    {bullet}
                  </PreviewPill>
                ))}
              </div>
              {section.ctaLabel ? (
                <div className="pt-2">
                  <PreviewButton label={section.ctaLabel} href={locationPrimaryHref} />
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <AssetPlaceholder
                title="Trust visual"
                label={trustVisual.label}
                imageUrl={trustVisual.previewUrl}
                imageAlt={trustVisual.alt}
                note="Trust cue"
                aspectClass="aspect-[4/3]"
              />
              <div className="rounded-[1.7rem] border border-black/8 bg-white p-5 shadow-[0_22px_60px_-42px_rgba(20,12,18,0.42)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/42">Trust details</p>
                <div className="mt-4 grid gap-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="rounded-[1.2rem] border border-black/8 bg-[color:var(--lpf-surface)] px-4 py-4">
                      {item.meta ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--lpf-primary)]">{item.meta}</p> : null}
                      <p className="mt-2 font-medium text-black/86">{item.title}</p>
                      {item.body ? <p className="mt-2 text-sm leading-7 text-black/62">{item.body}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }
    case "final_cta": {
      const finalPrimaryHref = section.ctaHref ?? primaryHref;
      const faqHref = resolveSectionHref(draft, "faq") ?? resolveSectionHref(draft, "location") ?? finalPrimaryHref;
      return (
        <section
          className="relative overflow-hidden rounded-[2.25rem] px-6 py-10 text-white shadow-[0_32px_90px_-48px_rgba(20,12,18,0.6)] md:px-8"
          id={section.id}
          style={{ background: "linear-gradient(135deg,var(--lpf-primary),color-mix(in srgb,var(--lpf-accent) 68%, white 12%))" }}
        >
          <div className="absolute left-0 top-0 size-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 size-72 rounded-full bg-black/10 blur-3xl" />
          <div className="relative mx-auto max-w-3xl space-y-5 text-center">
            {section.eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/68">{section.eyebrow}</p> : null}
            {section.headline ? <h2 className="font-heading text-4xl leading-[1.02] md:text-5xl">{section.headline}</h2> : null}
            {section.subheadline ? <p className="text-lg leading-8 text-white/84">{section.subheadline}</p> : null}
            {section.body ? <p className="text-sm leading-8 text-white/76">{section.body}</p> : null}
            {section.badge ? (
              <div className="flex justify-center">
                <PreviewPill>{section.badge}</PreviewPill>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {section.ctaLabel ? <PreviewButton label={section.ctaLabel} href={finalPrimaryHref} variant="secondary" /> : null}
              <PreviewButton label="Need a question answered first?" href={faqHref} variant="outline" />
            </div>
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}

function LandingPageSections({
  draft,
  assetSources,
}: {
  draft: LandingPageDraft;
  assetSources: LandingPagePreviewAssetSource[];
}) {
  const assetLookup = new Map(assetSources.map((asset) => [`${asset.kind}:${asset.id}`, asset] as const));

  return (
    <div className="space-y-5">
      {draft.sections
        .filter((section) => section.enabled)
        .map((section) => (
          <PreviewSection key={section.id} draft={draft} assetLookup={assetLookup} section={section} />
        ))}
    </div>
  );
}

export function LandingPagePublicPage({
  draft,
  assetSources,
  className,
}: {
  draft: LandingPageDraft;
  assetSources: LandingPagePreviewAssetSource[];
  className?: string;
}) {
  const styles = {
    "--lpf-primary": draft.theme.primaryColour,
    "--lpf-accent": draft.theme.accentColour,
    "--lpf-surface": draft.theme.surfaceColour,
    "--lpf-text": draft.theme.textColour,
  } as CSSProperties;

  return (
    <main
      className={cn(
        "min-h-screen bg-[linear-gradient(180deg,#f7ede8_0%,#fff9f6_34%,#f3e5db_100%)] text-[color:var(--lpf-text)]",
        className,
      )}
      style={styles}
    >
      <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
        <LandingPageSections draft={draft} assetSources={assetSources} />
      </div>
    </main>
  );
}

export function LandingPagePreview({
  draft,
  assetSources,
  mode,
  className,
}: {
  draft: LandingPageDraft;
  assetSources: LandingPagePreviewAssetSource[];
  mode: PreviewMode;
  className?: string;
}) {
  const styles = {
    "--lpf-primary": draft.theme.primaryColour,
    "--lpf-accent": draft.theme.accentColour,
    "--lpf-surface": draft.theme.surfaceColour,
    "--lpf-text": draft.theme.textColour,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2.2rem] border border-black/10 bg-[linear-gradient(180deg,#f4ebe5,#efe1d7)] p-3 shadow-[0_35px_90px_-55px_rgba(20,12,18,0.6)]",
        className,
      )}
    >
      <div className="absolute inset-x-10 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_72%)]" />
      <div
        className={cn(
          "relative mx-auto min-h-[760px] rounded-[1.85rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,244,239,0.98))] p-4 text-[color:var(--lpf-text)] shadow-inner md:p-5",
          mode === "mobile" ? "max-w-sm" : "max-w-6xl",
        )}
        style={styles}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-black/8 bg-white/78 px-4 py-3 backdrop-blur md:px-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-black/40">Landing Page Factory Preview</p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-heading text-xl">{draft.theme.brandName}</p>
              {draft.theme.tagLine ? <p className="text-sm text-black/56">{draft.theme.tagLine}</p> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-right">
            <div className="text-xs text-black/52">
              <p>{draft.slug}</p>
              <p>{mode === "mobile" ? "Mobile preview" : "Desktop preview"}</p>
            </div>
            <PreviewButton label={draft.form.submitLabel} />
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 rounded-full border border-black/8 bg-white/75 px-4 py-3">
          <PreviewPill subtle>{draft.seo.metaTitle}</PreviewPill>
          {draft.social.shareHeadline ? <PreviewPill subtle>{draft.social.shareHeadline}</PreviewPill> : null}
          {draft.theme.urgencyLabel ? <PreviewPill subtle>{draft.theme.urgencyLabel}</PreviewPill> : null}
        </div>

        <LandingPageSections draft={draft} assetSources={assetSources} />
      </div>
    </div>
  );
}
