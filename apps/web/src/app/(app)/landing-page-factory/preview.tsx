import { type CSSProperties } from "react";
import { type LandingPageDraft, type LandingPageSection } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function sectionAssetLabel(draft: LandingPageDraft, slot: string): string | null {
  const asset = draft.assetSlots.find((item) => item.slot === slot);
  if (!asset) return null;
  return asset.altText || asset.label;
}

function PreviewSection({
  draft,
  section,
}: {
  draft: LandingPageDraft;
  section: LandingPageSection;
}) {
  const baseSectionClass = "rounded-[1.75rem] border border-black/8 bg-white/80 p-6 shadow-sm shadow-black/5 backdrop-blur";
  switch (section.kind) {
    case "hero":
      return (
        <section className={cn(baseSectionClass, "overflow-hidden bg-white")} id={section.id}>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              {section.badge ? <Badge variant="outline">{section.badge}</Badge> : null}
              {section.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">{section.eyebrow}</p> : null}
              {section.headline ? <h1 className="font-heading text-4xl leading-tight md:text-5xl">{section.headline}</h1> : null}
              {section.subheadline ? <p className="text-lg font-medium opacity-85">{section.subheadline}</p> : null}
              {section.body ? <p className="max-w-2xl text-sm leading-7 opacity-80">{section.body}</p> : null}
              {section.bullets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {section.bullets.map((bullet) => (
                    <span key={bullet} className="rounded-full border border-black/10 px-3 py-1 text-xs opacity-80">
                      {bullet}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-2">
                {section.ctaLabel ? <Button>{section.ctaLabel}</Button> : null}
                {draft.form.bookingUrl ? <Button variant="outline">Preview booking destination</Button> : null}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[radial-gradient(circle_at_top,hsl(0_0%_100%/.95),transparent),linear-gradient(135deg,var(--lpf-primary),var(--lpf-accent))] p-5 text-white shadow-xl shadow-black/15">
              <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">Selected imagery</p>
                <div className="mt-3 aspect-[4/5] rounded-[1rem] border border-dashed border-white/20 bg-black/10 p-4 text-sm text-white/80">
                  {sectionAssetLabel(draft, "hero") ?? "Hero image slot"}
                </div>
                {section.items.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {section.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="rounded-xl bg-white/10 px-3 py-2">
                        <p className="text-sm font-semibold">{item.title}</p>
                        {item.body ? <p className="text-xs text-white/75">{item.body}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      );
    case "results":
    case "offer":
    case "testimonials":
    case "faq":
    case "process":
    case "location":
      return (
        <section className={baseSectionClass} id={section.id}>
          <div className="mb-5 space-y-2">
            {section.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">{section.eyebrow}</p> : null}
            {section.headline ? <h2 className="font-heading text-3xl leading-tight">{section.headline}</h2> : null}
            {section.subheadline ? <p className="text-base font-medium opacity-80">{section.subheadline}</p> : null}
            {section.body ? <p className="max-w-3xl text-sm leading-7 opacity-75">{section.body}</p> : null}
          </div>

          {section.bullets.length > 0 ? (
            <ul className="mb-5 grid gap-2 md:grid-cols-2">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="rounded-xl bg-black/4 px-4 py-3 text-sm">
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}

          {section.items.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => (
                <div key={item.id} className="rounded-[1.25rem] border border-black/8 bg-white px-4 py-4 shadow-sm">
                  <p className="font-medium">{item.title}</p>
                  {item.meta ? <p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-50">{item.meta}</p> : null}
                  {item.body ? <p className="mt-2 text-sm leading-6 opacity-70">{item.body}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          {section.kind === "results" ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="aspect-[4/3] rounded-[1.25rem] border border-dashed border-black/12 bg-black/4 p-4 text-sm opacity-70">
                {sectionAssetLabel(draft, "results_primary") ?? "Results image slot 1"}
              </div>
              <div className="aspect-[4/3] rounded-[1.25rem] border border-dashed border-black/12 bg-black/4 p-4 text-sm opacity-70">
                {sectionAssetLabel(draft, "results_secondary") ?? "Results image slot 2"}
              </div>
            </div>
          ) : null}

          {section.ctaLabel ? (
            <div className="mt-5">
              <Button>{section.ctaLabel}</Button>
            </div>
          ) : null}
        </section>
      );
    case "promise":
      return (
        <section
          className="rounded-[1.75rem] border border-[color:var(--lpf-accent)]/30 bg-[color:var(--lpf-surface)] p-7 shadow-sm"
          id={section.id}
        >
          <div className="space-y-4">
            {section.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">{section.eyebrow}</p> : null}
            {section.headline ? <h2 className="font-heading text-3xl leading-tight">{section.headline}</h2> : null}
            {section.body ? <p className="max-w-3xl text-sm leading-7 opacity-75">{section.body}</p> : null}
            {section.bullets.length > 0 ? (
              <ul className="grid gap-2 md:grid-cols-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-full border border-black/10 px-4 py-2 text-sm">
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
            {section.ctaLabel ? <Button>{section.ctaLabel}</Button> : null}
          </div>
        </section>
      );
    case "final_cta":
      return (
        <section
          className="overflow-hidden rounded-[1.9rem] px-6 py-8 text-white shadow-xl shadow-black/15"
          id={section.id}
          style={{ background: "linear-gradient(135deg,var(--lpf-primary),var(--lpf-accent))" }}
        >
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            {section.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">{section.eyebrow}</p> : null}
            {section.headline ? <h2 className="font-heading text-4xl leading-tight">{section.headline}</h2> : null}
            {section.subheadline ? <p className="text-lg text-white/85">{section.subheadline}</p> : null}
            {section.body ? <p className="text-sm leading-7 text-white/80">{section.body}</p> : null}
            {section.ctaLabel ? <Button variant="secondary">{section.ctaLabel}</Button> : null}
          </div>
        </section>
      );
    default:
      return null;
  }
}

export function LandingPagePreview({
  draft,
  mode,
  className,
}: {
  draft: LandingPageDraft;
  mode: "desktop" | "mobile";
  className?: string;
}) {
  const styles = {
    "--lpf-primary": draft.theme.primaryColour,
    "--lpf-accent": draft.theme.accentColour,
    "--lpf-surface": draft.theme.surfaceColour,
    "--lpf-text": draft.theme.textColour,
  } as CSSProperties;

  return (
    <div className={cn("rounded-[2rem] border border-black/10 bg-[#f4eee9] p-3 shadow-xl", className)}>
      <div
        className={cn(
          "mx-auto min-h-[720px] rounded-[1.6rem] border border-black/8 bg-[color:var(--lpf-surface)] p-4 text-[color:var(--lpf-text)] shadow-inner",
          mode === "mobile" ? "max-w-sm" : "max-w-5xl",
        )}
        style={styles}
      >
        <div className="mb-4 flex items-center justify-between rounded-[1.2rem] border border-black/8 bg-white/75 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] opacity-50">Landing Page Preview</p>
            <p className="font-medium">{draft.theme.brandName}</p>
          </div>
          <div className="text-right text-xs opacity-60">
            <p>{draft.slug}</p>
            <p>{mode === "mobile" ? "Mobile" : "Desktop"}</p>
          </div>
        </div>

        <div className="space-y-4">
          {draft.sections
            .filter((section) => section.enabled)
            .map((section) => (
              <PreviewSection key={section.id} draft={draft} section={section} />
            ))}
        </div>
      </div>
    </div>
  );
}
