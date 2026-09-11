import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)} aria-label="IHP OS">
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full border border-brand/70 text-brand"
      >
        <span className="font-heading text-sm font-bold italic tracking-[-0.08em]">ihp</span>
      </span>
      {compact ? null : (
        <span className="leading-none">
          <span className="block font-heading text-base font-bold tracking-[-0.03em]">IHP OS</span>
          <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Marketing operations
          </span>
        </span>
      )}
    </div>
  );
}
