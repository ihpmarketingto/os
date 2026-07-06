"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setOrgFeatureFlag } from "./actions";

export function FlagRow({ flagKey, enabled, canEdit }: { flagKey: string; enabled: boolean; canEdit: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={checked}
      disabled={!canEdit || isPending}
      onCheckedChange={(next) => {
        setChecked(next);
        startTransition(async () => {
          const result = await setOrgFeatureFlag(flagKey, next);
          if (result.error) {
            setChecked(!next);
            toast.error(`Failed to update "${flagKey}": ${result.error}`);
          }
        });
      }}
    />
  );
}
