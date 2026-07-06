"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEAL_STAGES, OPEN_PIPELINE_STAGES, type DealStage } from "@/lib/crm/constants";
import { convertDealToClient, updateDealStage } from "./actions";

export interface DealCardData {
  id: string;
  title: string;
  stage: DealStage;
  value: number | null;
  currency: string;
  ownerName: string | null;
}

export function PipelineBoard({ deals }: { deals: DealCardData[] }) {
  const dealsByStage = new Map<DealStage, DealCardData[]>();
  for (const stage of OPEN_PIPELINE_STAGES) dealsByStage.set(stage, []);
  for (const deal of deals) {
    if (!dealsByStage.has(deal.stage)) dealsByStage.set(deal.stage, []);
    dealsByStage.get(deal.stage)!.push(deal);
  }

  // Closed/nurture columns only render when they hold deals still needing
  // action (e.g. closed won awaiting client conversion).
  const visibleStages: DealStage[] = [
    ...OPEN_PIPELINE_STAGES,
    ...Array.from(dealsByStage.keys()).filter(
      (stage) => !OPEN_PIPELINE_STAGES.includes(stage) && (dealsByStage.get(stage)?.length ?? 0) > 0,
    ),
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {visibleStages.map((stage) => {
        const stageLabel = DEAL_STAGES.find((s) => s.value === stage)!.label;
        const stageDeals = dealsByStage.get(stage) ?? [];
        return (
          <div key={stage} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-medium">{stageLabel}</p>
              <Badge variant="outline" className="text-[10px]">{stageDeals.length}</Badge>
            </div>
            <div className="space-y-2">
              {stageDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
              {stageDeals.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Empty</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DealCard({ deal }: { deal: DealCardData }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium">{deal.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {deal.value ? (
          <p className="text-xs text-muted-foreground">
            {new Intl.NumberFormat("en-CA", { style: "currency", currency: deal.currency }).format(deal.value)}
          </p>
        ) : null}
        {deal.ownerName ? <p className="text-xs text-muted-foreground">Owner: {deal.ownerName}</p> : null}
        <select
          className="w-full rounded-md border bg-background px-2 py-1 text-xs"
          value={deal.stage}
          disabled={isPending}
          onChange={(e) => {
            const nextStage = e.target.value as DealStage;
            startTransition(async () => {
              await updateDealStage(deal.id, nextStage);
            });
          }}
        >
          {DEAL_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {deal.stage === "closed_won" ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => startTransition(() => convertDealToClient(deal.id))}
          >
            Convert to client
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
