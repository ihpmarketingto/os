import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PHASE_LABELS: Record<number, string> = {
  1: "Phase 1: Core Agency Operations",
  2: "Phase 2: Commercial Operations",
  3: "Phase 3: Marketing Delivery",
  4: "Phase 4: Landing Page Factory",
  5: "Phase 5: AI and Connected Workspace",
  6: "Phase 6: Advanced Automation",
};

export function ModulePlaceholder({ title, phase, description }: { title: string; phase: number; description: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background p-12 text-center">
      <Construction className="size-8 text-muted-foreground" />
      <h1 className="font-heading text-2xl">{title}</h1>
      <Badge variant="secondary">{PHASE_LABELS[phase] ?? `Phase ${phase}`}</Badge>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
