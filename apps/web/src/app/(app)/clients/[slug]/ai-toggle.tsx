"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setClientAiEnabled } from "./actions";

export function AiToggle({ clientId, slug, enabled }: { clientId: string; slug: string; enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={checked}
      disabled={isPending}
      onCheckedChange={(next) => {
        setChecked(next);
        startTransition(async () => {
          try {
            await setClientAiEnabled(clientId, slug, next);
          } catch (err) {
            setChecked(!next);
            toast.error(err instanceof Error ? err.message : "Failed to update AI setting");
          }
        });
      }}
    />
  );
}
