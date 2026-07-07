"use client";

import { useTransition } from "react";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "@/lib/marketing/constants";
import { updateCampaignStatus } from "./actions";

export function CampaignStatusSelect({
  campaignId,
  clientId,
  status,
}: {
  campaignId: string;
  clientId: string;
  status: CampaignStatus;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      className="rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-50"
      value={status}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateCampaignStatus(campaignId, clientId, e.target.value as CampaignStatus))}
    >
      {CAMPAIGN_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
