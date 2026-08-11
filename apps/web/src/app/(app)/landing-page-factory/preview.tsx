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

function sectionHighlights(section: LandingPageSection, fallback: string[]): string[] {
  const highlights = section.bullets.filter((bullet) => Boolean(bullet) && !isPlaceholderCopy(bullet));
  return highlights.length > 0 ? highlights : fallback;
}

function isPlaceholderUrl(value: string | null | undefined): boolean {
  return Boolean(value && /example\.com/i.test(value));
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function resolvePrimaryCtaHref(draft: LandingPageDraft): string | null {
  switch (draft.form.ctaType) {
    case "booking_link":
      return isPlaceholderUrl(draft.form.bookingUrl) ? null : draft.form.bookingUrl;
    case "external_checkout":
      return isPlaceholderUrl(draft.form.externalCheckoutUrl) ? null : draft.form.externalCheckoutUrl;
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

function resolveEnabledSection(
  draft: LandingPageDraft,
  kind: LandingPageSection["kind"],
): LandingPageSection | null {
  return draft.sections.find((candidate) => candidate.enabled && candidate.kind === kind) ?? null;
}

function resolveOfferContext(draft: LandingPageDraft) {
  const offerSection = resolveEnabledSection(draft, "offer");
  return {
    headline: offerSection?.headline ?? null,
    investmentLabel: offerSection?.subheadline ?? null,
    urgencyLabel: offerSection?.badge ?? draft.theme.urgencyLabel ?? null,
  };
}

function isScaffoldingCopy(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalised = value.trim().toLowerCase();
  if (/^(template landing page|hero image|image slot|results image \d+|healed result|booking|time|trust)$/.test(normalised)) {
    return true;
  }
  if (/^(what conversion should happen|add any reviewed claims|add approved proof point|traffic source:)/.test(normalised)) {
    return true;
  }
  return /^(use|add|connect|clarify|spell out|show|make|attach|answer|point visitors to|list |repeat |review )/.test(normalised);
}

function isOperationalCopy(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalised = value.trim().toLowerCase();
  return /^(do not say:|ga4|meta pixel|utm capture|crm lead routing|required tracking|social proof\b|price:\s*\$0{2,})/.test(normalised);
}

function isPlaceholderCopy(value: string | null | undefined): boolean {
  return isScaffoldingCopy(value) || isOperationalCopy(value);
}

function displayCopy(value: string | null | undefined, fallback?: string | null): string | null {
  if (value && !isPlaceholderCopy(value)) return value;
  return fallback ?? null;
}

function resolveDestinationLabel(draft: LandingPageDraft): string {
  const destination = draft.form.bookingUrl ?? draft.form.externalCheckoutUrl;
  if (destination && !isPlaceholderUrl(destination)) {
    return destination;
  }

  if (draft.form.ctaType === "lead_form") {
    return "This page can capture leads natively once the final form destination is connected.";
  }

  return "Attach the final booking, lead, or checkout destination here.";
}

function PreviewPill({ children, subtle = false }: { children: string; subtle?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] shadow-[0_10px_28px_-24px_rgba(32,18,24,0.5)]",
        subtle
          ? "border-[#e2d5cc] bg-[#faf3ee] text-black/48"
          : "border-white/55 bg-white/90 text-black/58 backdrop-blur",
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
        "h-12 rounded-full px-6 text-[13px] font-medium shadow-[0_18px_40px_-30px_rgba(32,18,24,0.55)] transition-colors",
        variant === "default" && "bg-[color:var(--lpf-primary)] text-white hover:bg-[color:var(--lpf-primary)]/92",
        variant === "outline" && "border-[#dfd1c7] bg-white/92 text-black/72 hover:bg-white",
        variant === "secondary" && "bg-white text-[color:var(--lpf-primary)] hover:bg-white/92",
      )}
    >
      {label}
    </Button>
  );
}

function SectionIntro({
  section,
  align = "left",
  headlineFallback,
  bodyFallback,
}: {
  section: LandingPageSection;
  align?: "left" | "center";
  headlineFallback?: string;
  bodyFallback?: string;
}) {
  const headline = displayCopy(section.headline, headlineFallback);
  const subheadline = displayCopy(section.subheadline);
  const body = displayCopy(section.body, bodyFallback);
  return (
    <div className={cn("space-y-3", align === "center" && "mx-auto max-w-3xl text-center")}>
      {section.eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-black/38">{section.eyebrow}</p>
      ) : null}
      {headline ? <h2 className="font-heading text-[2.25rem] leading-[0.95] tracking-[-0.02em] md:text-[3.4rem]">{headline}</h2> : null}
      {subheadline ? (
        <p className="max-w-2xl text-[1.02rem] leading-8 text-black/72">
          {subheadline}
        </p>
      ) : null}
      {body ? (
        <p className="max-w-3xl text-[15px] leading-7 text-black/60">
          {body}
        </p>
      ) : null}
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
  const labelIsScaffolding = isScaffoldingCopy(label);
  const displayLabel = displayCopy(label, imageUrl ? title : "Add an approved image here.") ?? (imageUrl ? title : "Add an approved image here.");
  const emptyLabelTone = dark ? "text-white/84" : labelIsScaffolding ? "text-black/52 italic" : "text-black/68";
  const emptyHelperTone = dark ? "text-white/65" : "text-black/46";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.8rem] border p-4 shadow-[0_26px_60px_-42px_rgba(20,12,18,0.48)]",
        dark
          ? "border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] text-white"
          : "border-[#e4d8cf] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,240,235,0.92))] text-black",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.22em]", dark ? "text-white/62" : "text-black/38")}>
            {title}
          </p>
          {note ? <p className={cn("text-xs", dark ? "text-white/72" : "text-black/48")}>{note}</p> : null}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
            dark ? "bg-white/12 text-white/72" : "bg-white text-black/46 shadow-[0_10px_24px_-18px_rgba(20,12,18,0.45)]",
          )}
        >
          {imageUrl ? "Approved image" : "Needs image"}
        </span>
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.45rem] border p-4",
          aspectClass,
          dark
            ? "border-white/18 bg-black/12"
            : "border-[#eadcd2] bg-[linear-gradient(135deg,rgba(125,58,70,0.08),rgba(217,166,139,0.24))]",
        )}
      >
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={imageAlt ?? label} className="absolute inset-0 size-full object-cover" />
            <div className={cn("absolute inset-0", dark ? "bg-black/28" : "bg-white/10")} />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.82),transparent_58%)] opacity-90" />
        )}
        <div className="relative flex h-full flex-col justify-between">
          {imageUrl ? (
            <div className={cn("mt-auto self-start rounded-full px-3 py-1.5 text-[11px]", dark ? "bg-black/32 text-white/84" : "bg-white/86 text-black/58")}>
              {displayLabel}
            </div>
          ) : (
            <div className="flex h-full items-end">
              <div>
                <p className={cn("max-w-[16rem] text-base leading-6", emptyLabelTone)}>
                  {displayLabel}
                </p>
                <p className={cn("mt-2 text-xs leading-6", emptyHelperTone)}>
                  Add an approved asset here to give this section real proof and texture.
                </p>
              </div>
            </div>
          )}
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
  const offerContext = resolveOfferContext(draft);
  const destinationLabel = resolveDestinationLabel(draft);
  const submitLabel = displayCopy(draft.form.submitLabel, "Book now") ?? "Book now";
  const offerSummary = displayCopy(offerContext.headline, "A clear summary of what the visitor gets, what it costs, and what happens next.");

  return (
    <div
      id={draft.form.ctaType === "lead_form" ? "lead-form" : undefined}
      className="rounded-[2rem] border border-[#e4d7cd] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,241,236,0.96))] p-6 shadow-[0_30px_78px_-46px_rgba(20,12,18,0.52)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/38">Reserve</p>
          <h3 className="mt-2 font-heading text-[2rem] leading-tight">{submitLabel}</h3>
          {offerContext.investmentLabel ? <p className="mt-2 text-sm text-black/62">{offerContext.investmentLabel}</p> : null}
        </div>
        {offerContext.urgencyLabel ? (
          <Badge variant="outline" className="border-[#ddd1c7] bg-white/84 text-black/54">
            {offerContext.urgencyLabel}
          </Badge>
        ) : null}
      </div>

      {offerSummary ? (
        <div className="mt-5 rounded-[1.45rem] border border-[#e5d8ce] bg-white/84 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-black/36">Offer summary</p>
          <p className="mt-2 text-sm leading-7 text-black/68">{offerSummary}</p>
        </div>
      ) : null}

      <div className="mt-5 space-y-2.5">
        {bullets.map((bullet) => (
          <div
            key={bullet}
            className="flex items-start gap-3 rounded-[1.2rem] border border-[#eaded5] bg-white/92 px-4 py-3 text-sm leading-7 text-black/66"
          >
            <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--lpf-primary)]/12 text-[10px] font-semibold text-[color:var(--lpf-primary)]">
              +
            </span>
            <span>{bullet}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 rounded-[1.45rem] border border-[#e6d9d0] bg-[linear-gradient(180deg,rgba(125,58,70,0.05),rgba(255,255,255,0.96))] p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-black/38">Destination</p>
        <p className="text-sm leading-6 text-black/70">{destinationLabel}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <PreviewButton label={submitLabel} href={primaryHref} />
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
  const displayTitle = displayCopy(title, "Add a reviewed client quote that makes the result feel personal and believable.");
  const displayBody = displayCopy(body, "Use approved proof from this client only, focused on comfort, clarity, and the finished outcome.");
  return (
    <div className="rounded-[1.6rem] border border-[#e5d8ce] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,240,235,0.9))] p-6 shadow-[0_24px_55px_-40px_rgba(20,12,18,0.45)]">
      <p className="text-[11px] tracking-[0.24em] text-[color:var(--lpf-primary)]">★★★★★</p>
      <p className="mt-4 font-heading text-[1.7rem] leading-8 tracking-[-0.015em]">
        &ldquo;{displayTitle}&rdquo;
      </p>
      {displayBody ? <p className="mt-3 text-sm leading-7 text-black/62">{displayBody}</p> : null}
      {meta ? <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/38">{meta}</p> : null}
    </div>
  );
}

function ProcessCard({ item, index }: { item: LandingPageSection["items"][number]; index: number }) {
  const title = displayCopy(item.title, `Step ${index + 1}`) ?? `Step ${index + 1}`;
  const body = displayCopy(item.body, "Keep this step simple so the path from click to outcome feels obvious.");
  return (
    <div className="relative rounded-[1.7rem] border border-[#e4d7cd] bg-white/96 p-6 shadow-[0_22px_55px_-42px_rgba(20,12,18,0.42)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-[color:var(--lpf-primary)] text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(20,12,18,0.48)]">
          {index + 1}
        </div>
        <div>
          {item.meta ? <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/36">{item.meta}</p> : null}
          <p className="font-heading text-[1.85rem] leading-tight tracking-[-0.02em]">{title}</p>
        </div>
      </div>
      {body ? <p className="text-sm leading-7 text-black/62">{body}</p> : null}
    </div>
  );
}

function FaqCard({ item }: { item: LandingPageSection["items"][number] }) {
  const title = displayCopy(item.title, "Common question") ?? "Common question";
  const body = displayCopy(item.body, "Use this answer to remove friction and make the next step feel clear.");
  return (
    <div className="rounded-[1.55rem] border border-[#e5d8ce] bg-white/96 px-5 py-5 shadow-[0_20px_45px_-38px_rgba(20,12,18,0.38)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-black/88">{title}</p>
          {body ? <p className="mt-2 text-sm leading-7 text-black/62">{body}</p> : null}
        </div>
        <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e1d3ca] bg-[#fbf4ef] text-lg text-black/42">
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
      const offerContext = resolveOfferContext(draft);
      const heroHeadline = displayCopy(section.headline, "Make the outcome feel immediate");
      const heroSubheadline = displayCopy(section.subheadline, "Lead with the offer, the audience, and the clearest next step.");
      const heroBody = displayCopy(section.body, "Keep the opening crisp: outcome, trust cue, and a single conversion path.");
      const socialProofLabel = displayCopy(draft.social.socialProofLabel, "Real proof. Clear promise. Repeated CTA.") ?? "Real proof. Clear promise. Repeated CTA.";
      const heroDetailLabel = displayCopy(heroDetailVisual.label, "Use a detail crop, brand moment, or close-up proof image.") ?? "Use a detail crop, brand moment, or close-up proof image.";
      return (
        <section
          className="relative overflow-hidden rounded-[2.8rem] border border-[#e6d8cf] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(250,243,237,0.98))] px-6 py-7 shadow-[0_34px_95px_-56px_rgba(20,12,18,0.58)] md:px-9 md:py-9"
          id={section.id}
        >
          <div className="absolute -left-16 top-0 size-52 rounded-full bg-[color:var(--lpf-accent)]/22 blur-3xl" />
          <div className="absolute right-0 top-0 h-72 w-[38%] bg-[radial-gradient(circle_at_top_right,rgba(125,58,70,0.14),transparent_68%)]" />
          <div className="absolute bottom-0 left-[24%] h-48 w-48 rounded-full bg-white/55 blur-3xl" />
          <div className="relative grid gap-10 xl:grid-cols-[minmax(0,0.97fr)_450px] xl:items-center">
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                {section.badge ? <Badge className="border-0 bg-[color:var(--lpf-primary)]/10 px-3 py-1 text-[color:var(--lpf-primary)]">{section.badge}</Badge> : null}
                {section.eyebrow ? <PreviewPill subtle>{section.eyebrow}</PreviewPill> : null}
              </div>

              <div className="space-y-5">
                {heroHeadline ? (
                  <h1 className="max-w-[11ch] font-heading text-[3.3rem] leading-[0.9] tracking-[-0.03em] md:text-[5.4rem]">
                    {heroHeadline}
                  </h1>
                ) : null}
                {heroSubheadline ? <p className="max-w-2xl text-[1.08rem] leading-8 text-black/72">{heroSubheadline}</p> : null}
                {heroBody ? <p className="max-w-2xl text-[15px] leading-8 text-black/60">{heroBody}</p> : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {offerContext.investmentLabel ? (
                  <div className="rounded-[1.55rem] border border-[#e4d6cd] bg-white/86 px-4 py-3 shadow-[0_18px_40px_-34px_rgba(20,12,18,0.36)]">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-black/34">Investment</p>
                    <p className="mt-1 font-heading text-[1.85rem] leading-tight">{offerContext.investmentLabel}</p>
                  </div>
                ) : null}
                {offerContext.urgencyLabel ? (
                  <div className="flex items-center rounded-[1.55rem] border border-[#e7dad1] bg-[color:var(--lpf-surface)] px-4 py-3 text-sm text-black/62 shadow-[0_18px_40px_-34px_rgba(20,12,18,0.28)]">
                    {offerContext.urgencyLabel}
                  </div>
                ) : null}
              </div>

              {heroItems.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:max-w-[44rem]">
                  {heroItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 rounded-[1.55rem] border border-[#e6d9d0] bg-white/90 px-4 py-4 shadow-[0_20px_45px_-38px_rgba(20,12,18,0.42)]"
                    >
                      <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--lpf-primary)] text-sm font-semibold text-white shadow-[0_12px_28px_-20px_rgba(20,12,18,0.44)]">
                        ✓
                      </div>
                      <div>
                        {item.meta ? <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/36">{item.meta}</p> : null}
                        <p className="mt-1 font-medium text-black/86">{displayCopy(item.title, item.meta ?? "Approved proof point") ?? (item.meta ?? "Approved proof point")}</p>
                        {displayCopy(item.body, "Use one clear proof point that makes the promised outcome feel more believable.") ? (
                          <p className="mt-2 text-sm leading-7 text-black/58">
                            {displayCopy(item.body, "Use one clear proof point that makes the promised outcome feel more believable.")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {section.ctaLabel ? <PreviewButton label={section.ctaLabel} href={heroPrimaryHref} /> : null}
                <PreviewButton label="See healed results" href={resultsHref} variant="outline" />
              </div>
            </div>

            <div className="space-y-6 xl:pl-3">
              <div className="relative rounded-[2.25rem] border border-[#e8d9d0] bg-[linear-gradient(180deg,rgba(249,241,236,0.96),rgba(255,255,255,0.94))] p-4 pb-24 shadow-[0_28px_70px_-44px_rgba(20,12,18,0.54)]">
                <AssetPlaceholder
                  title="Primary visual"
                  label={heroVisual.label}
                  imageUrl={heroVisual.previewUrl}
                  imageAlt={heroVisual.alt}
                  note="Lead with the finished result or strongest close-up"
                  aspectClass="aspect-[4/5]"
                />

                <div className="absolute left-4 top-4 max-w-[220px] rounded-[1.6rem] bg-[color:var(--lpf-primary)] px-5 py-5 text-white shadow-[0_22px_55px_-34px_rgba(20,12,18,0.58)]">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/62">Why this converts</p>
                  <p className="mt-3 font-heading text-[1.85rem] leading-tight">
                    {socialProofLabel}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/78">
                    The first fold should make the outcome feel obvious before the visitor has to think too hard.
                  </p>
                </div>

                <div className="absolute -bottom-8 left-10 right-10 rounded-[1.45rem] border border-[#e6d9d0] bg-white/96 p-3 shadow-[0_22px_52px_-38px_rgba(20,12,18,0.48)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/38">Supporting visual</p>
                  <div className="mt-3 overflow-hidden rounded-[1.15rem] border border-[#eaddd4] bg-[linear-gradient(135deg,rgba(125,58,70,0.06),rgba(217,166,139,0.22))]">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {heroDetailVisual.previewUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={heroDetailVisual.previewUrl} alt={heroDetailVisual.alt} className="absolute inset-0 size-full object-cover" />
                          <div className="absolute inset-0 bg-white/10" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.84),transparent_58%)]" />
                      )}
                      <div className="relative flex h-full items-end p-4">
                        <div>
                          <p className="max-w-[15rem] text-sm leading-6 text-black/62">{heroDetailLabel}</p>
                          {!heroDetailVisual.previewUrl ? (
                            <p className="mt-1 text-xs text-black/42">Use a detail crop, brand moment, or close-up proof image.</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="xl:pl-7">
                <BookingCard draft={draft} section={section} />
              </div>
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
        <section className="rounded-[2.35rem] border border-[#e7dbd1] bg-[linear-gradient(180deg,rgba(255,250,246,0.94),rgba(255,255,255,0.96))] px-6 py-7 shadow-[0_28px_75px_-50px_rgba(20,12,18,0.46)] md:px-8 md:py-8" id={section.id}>
          <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
            <div className="space-y-6">
              <SectionIntro
                section={section}
                headlineFallback="Proof that makes the offer feel real"
                bodyFallback="Lead with real outcomes first, then clarify what visitors should expect."
              />
              <div className="grid gap-3">
                {section.items.map((item) => (
                  <div key={item.id} className="rounded-[1.45rem] border border-[#e5d8ce] bg-white/94 px-4 py-4 shadow-[0_20px_44px_-38px_rgba(20,12,18,0.38)]">
                    {item.meta ? <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--lpf-primary)]">{item.meta}</p> : null}
                    <p className="mt-2 font-medium text-black/86">{displayCopy(item.title, item.meta ?? "Approved proof point") ?? (item.meta ?? "Approved proof point")}</p>
                    {displayCopy(item.body, "Use a specific result or reviewed claim that helps the visitor picture the outcome.") ? (
                      <p className="mt-2 text-sm leading-7 text-black/60">
                        {displayCopy(item.body, "Use a specific result or reviewed claim that helps the visitor picture the outcome.")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              {sectionHighlights(section, ["Approved results", "Reviewed claims", "Outcome-focused proof"]).length > 0 ? (
                <div className="rounded-[1.65rem] border border-[#e4d7ce] bg-white/94 p-5 shadow-[0_20px_45px_-38px_rgba(20,12,18,0.38)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/38">Claims and highlights</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sectionHighlights(section, ["Approved results", "Reviewed claims", "Outcome-focused proof"]).map((bullet) => (
                      <PreviewPill key={bullet} subtle>
                        {bullet}
                      </PreviewPill>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <AssetPlaceholder
                title="Results gallery"
                label={resultsPrimary.label}
                imageUrl={resultsPrimary.previewUrl}
                imageAlt={resultsPrimary.alt}
                note="Primary proof image"
                aspectClass="aspect-[4/5]"
              />
              <div className="space-y-4">
                <AssetPlaceholder
                  title="Supporting proof"
                  label={resultsSecondary.label}
                  imageUrl={resultsSecondary.previewUrl}
                  imageAlt={resultsSecondary.alt}
                  note="Healed or detail image"
                  aspectClass="aspect-[4/4]"
                />
                <div className="rounded-[1.7rem] border border-[#e4d7ce] bg-[color:var(--lpf-primary)] px-5 py-5 text-white shadow-[0_22px_55px_-40px_rgba(20,12,18,0.52)]">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/62">Proof standard</p>
                  <p className="mt-3 font-heading text-[2rem] leading-tight">
                    Show outcome first, then explain why it is believable.
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/78">
                    When the visuals do their job, the rest of the section only has to clarify and reassure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }
    case "offer": {
      const offerPrimaryHref = section.ctaHref ?? primaryHref;
      const compareHref = resolveSectionHref(draft, "faq") ?? resolveSectionHref(draft, "testimonials") ?? offerPrimaryHref;
      return (
        <section className="rounded-[2.35rem] border border-[#e6dad0] bg-white px-6 py-7 shadow-[0_28px_75px_-50px_rgba(20,12,18,0.46)] md:px-8 md:py-8" id={section.id}>
          <div className="grid gap-8 xl:grid-cols-[0.94fr_1.06fr] xl:items-start">
            <div className="space-y-6">
              <SectionIntro
                section={section}
                bodyFallback="Clarify what is included, how booking works, and why this offer feels considered."
              />
              {sectionHighlights(section, ["What is included", "How booking works", "Why this offer feels worth it"]).length > 0 ? (
                <div className="grid gap-3">
                  {sectionHighlights(section, ["What is included", "How booking works", "Why this offer feels worth it"]).map((bullet, index) => (
                    <div key={bullet} className="flex items-start gap-4 rounded-[1.35rem] border border-[#e5d8ce] bg-[color:var(--lpf-surface)] px-4 py-4 text-sm leading-7 text-black/66">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[color:var(--lpf-primary)] shadow-[0_10px_24px_-18px_rgba(20,12,18,0.38)]">
                        {index + 1}
                      </span>
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[1.85rem] border border-[#e4d7ce] bg-[linear-gradient(180deg,rgba(125,58,70,0.06),rgba(255,255,255,0.98))] p-5 shadow-[0_22px_60px_-42px_rgba(20,12,18,0.42)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/38">What is included</p>
                <div className="mt-4 grid gap-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="rounded-[1.3rem] border border-[#e5d8ce] bg-white/92 px-4 py-4">
                      {item.meta ? <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--lpf-primary)]">{item.meta}</p> : null}
                      <p className="mt-2 font-medium text-black/86">{displayCopy(item.title, item.meta ?? "Included detail") ?? (item.meta ?? "Included detail")}</p>
                      {displayCopy(item.body, "Clarify the deliverable, the booking flow, and what the visitor gets once they commit.") ? (
                        <p className="mt-2 text-sm leading-7 text-black/60">
                          {displayCopy(item.body, "Clarify the deliverable, the booking flow, and what the visitor gets once they commit.")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.85rem] border border-black/0 bg-[color:var(--lpf-primary)] px-5 py-5 text-white shadow-[0_24px_65px_-42px_rgba(20,12,18,0.56)]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/62">Investment and CTA</p>
                <p className="mt-3 font-heading text-[2.35rem] leading-tight tracking-[-0.02em]">{section.subheadline ?? "Clarify the investment"}</p>
                {displayCopy(section.body, "Clarify what the visitor gets, why it is worth the investment, and what happens after they book.") ? (
                  <p className="mt-3 text-sm leading-7 text-white/80">
                    {displayCopy(section.body, "Clarify what the visitor gets, why it is worth the investment, and what happens after they book.")}
                  </p>
                ) : null}
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
          className="overflow-hidden rounded-[2.3rem] border border-[#eadccf] bg-[linear-gradient(140deg,rgba(255,248,244,0.98),rgba(255,255,255,0.94))] px-6 py-7 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.44)] md:px-8"
          id={section.id}
        >
          <div className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
            <div className="space-y-5">
              <SectionIntro
                section={section}
                headlineFallback="Lower the fear before the click"
                bodyFallback="Name the concern, explain the safeguard, and make the next step feel low-risk."
              />
              {section.ctaLabel ? (
                <div className="pt-2">
                  <PreviewButton label={section.ctaLabel} href={promisePrimaryHref} />
                </div>
              ) : null}
            </div>

            <div className="grid gap-3">
              {sectionHighlights(section, ["Lower the fear", "Name the concern", "Give the visitor a reason to trust the next step"]).map((bullet) => (
                <div key={bullet} className="rounded-[1.45rem] border border-[#e5d8ce] bg-white/94 px-5 py-4 text-sm leading-7 text-black/66 shadow-[0_18px_45px_-38px_rgba(20,12,18,0.38)]">
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
        <section className="rounded-[2.2rem] border border-[#e6dad0] bg-white px-6 py-7 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.44)] md:px-8 md:py-8" id={section.id}>
          <div className="space-y-6">
            <SectionIntro section={section} align="center" headlineFallback="A clear path from click to outcome" />
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
        <section className="rounded-[2.2rem] border border-[#e8dbd1] bg-[rgba(255,251,247,0.96)] px-6 py-7 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.44)] md:px-8 md:py-8" id={section.id}>
          <div className="space-y-6">
            <SectionIntro
              section={section}
              align="center"
              headlineFallback="Proof that feels personal and believable"
              bodyFallback="Use approved reviews that speak to comfort, clarity, and the result visitors actually want."
            />
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
        <section className="rounded-[2.2rem] border border-[#e6dad0] bg-white px-6 py-7 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.44)] md:px-8 md:py-8" id={section.id}>
          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              <SectionIntro
                section={section}
                headlineFallback="The questions people ask before they book"
                bodyFallback="Answer the concerns that usually slow the conversion."
              />
              {section.bullets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sectionHighlights(section, ["Healing and downtime", "Payment timing", "Suitability and next steps"]).map((bullet) => (
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
        <section className="rounded-[2.2rem] border border-[#e6dad0] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,244,239,0.96))] px-6 py-7 shadow-[0_26px_70px_-48px_rgba(20,12,18,0.44)] md:px-8 md:py-8" id={section.id}>
          <div className="grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
            <div className="space-y-5">
              <SectionIntro
                section={section}
                bodyFallback="Use this section for trust cues, service area, and final booking guidance."
              />
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
              <div className="rounded-[1.8rem] border border-[#e4d7ce] bg-white p-5 shadow-[0_22px_60px_-42px_rgba(20,12,18,0.42)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/38">Trust details</p>
                <div className="mt-4 grid gap-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="rounded-[1.3rem] border border-[#e5d8ce] bg-[color:var(--lpf-surface)] px-4 py-4">
                      {item.meta ? <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--lpf-primary)]">{item.meta}</p> : null}
                      <p className="mt-2 font-medium text-black/86">{displayCopy(item.title, item.meta ?? "Trust detail") ?? (item.meta ?? "Trust detail")}</p>
                      {displayCopy(item.body, "Use a trust cue here: service area, studio detail, policy, or final reassurance.") ? (
                        <p className="mt-2 text-sm leading-7 text-black/60">
                          {displayCopy(item.body, "Use a trust cue here: service area, studio detail, policy, or final reassurance.")}
                        </p>
                      ) : null}
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
          className="relative overflow-hidden rounded-[2.45rem] px-6 py-12 text-white shadow-[0_32px_90px_-48px_rgba(20,12,18,0.6)] md:px-8"
          id={section.id}
          style={{ background: "linear-gradient(135deg,var(--lpf-primary),color-mix(in srgb,var(--lpf-accent) 68%, white 12%))" }}
        >
          <div className="absolute left-0 top-0 size-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 size-72 rounded-full bg-black/10 blur-3xl" />
          <div className="relative mx-auto max-w-3xl space-y-5 text-center">
            {section.eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/66">{section.eyebrow}</p> : null}
            {displayCopy(section.headline, "Ready to take the next step?") ? (
              <h2 className="font-heading text-[2.8rem] leading-[0.95] tracking-[-0.02em] md:text-[4.2rem]">
                {displayCopy(section.headline, "Ready to take the next step?")}
              </h2>
            ) : null}
            {displayCopy(section.subheadline) ? <p className="text-lg leading-8 text-white/84">{displayCopy(section.subheadline)}</p> : null}
            {displayCopy(section.body, "Close with the clearest reason to act now, plus the final reassurance.") ? (
              <p className="text-sm leading-8 text-white/76">
                {displayCopy(section.body, "Close with the clearest reason to act now, plus the final reassurance.")}
              </p>
            ) : null}
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
    <div className="space-y-6 md:space-y-8">
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
        "min-h-screen bg-[radial-gradient(circle_at_top,#fffdfb_0%,#fbf4ee_34%,#f0e0d4_100%)] text-[color:var(--lpf-text)]",
        className,
      )}
      style={styles}
    >
      <div className="mx-auto max-w-6xl px-3 py-5 md:px-6 md:py-8">
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
        "relative overflow-hidden rounded-[2.4rem] border border-[#ddcec3] bg-[linear-gradient(180deg,#f3e7de,#ead9ce)] p-3 shadow-[0_38px_96px_-56px_rgba(20,12,18,0.62)] md:p-4",
        className,
      )}
    >
      <div className="absolute inset-x-10 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),transparent_72%)]" />
      <div
        className={cn(
          "relative mx-auto min-h-[760px] rounded-[2rem] border border-[#e4d6cb] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(250,244,239,0.98))] p-4 text-[color:var(--lpf-text)] shadow-inner md:p-5",
          mode === "mobile" ? "max-w-[26rem]" : "max-w-6xl",
        )}
        style={styles}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-full border border-[#e3d7cd] bg-white/82 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#d9b7a7]" />
              <span className="size-2 rounded-full bg-[#d5c4b9]" />
              <span className="size-2 rounded-full bg-[#e5ddd7]" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/38">{draft.theme.brandName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PreviewPill subtle>{mode === "mobile" ? "Mobile preview" : "Desktop preview"}</PreviewPill>
            {draft.theme.urgencyLabel ? <PreviewPill subtle>{draft.theme.urgencyLabel}</PreviewPill> : null}
          </div>
        </div>

        <p className="mb-6 px-1 text-[11px] uppercase tracking-[0.22em] text-black/34">{draft.slug}</p>

        <LandingPageSections draft={draft} assetSources={assetSources} />
      </div>
    </div>
  );
}
