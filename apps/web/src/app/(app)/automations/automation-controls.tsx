"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { setRuleEnabled, triggerSweep } from "./actions";

export function RunSweepButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await triggerSweep();
          if (result.error) {
            toast.error(result.error);
          } else {
            const total = (result.results ?? []).reduce((sum, r) => sum + r.actions, 0);
            toast.success(
              total === 0
                ? "Sweep complete. Nothing new needed action."
                : `Sweep complete: ${total} action(s) taken (${(result.results ?? [])
                    .filter((r) => r.actions > 0)
                    .map((r) => `${r.rule}: ${r.actions}`)
                    .join(", ")}).`,
            );
          }
        })
      }
    >
      <Play className="mr-1.5 size-3.5" />
      {isPending ? "Running..." : "Run automations now"}
    </Button>
  );
}

export function RuleToggle({ ruleKey, enabled, canEdit }: { ruleKey: string; enabled: boolean; canEdit: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={checked}
      disabled={!canEdit || isPending}
      onCheckedChange={(next) => {
        setChecked(next);
        startTransition(async () => {
          const result = await setRuleEnabled(ruleKey, next);
          if (result.error) {
            setChecked(!next);
            toast.error(result.error);
          }
        });
      }}
    />
  );
}
