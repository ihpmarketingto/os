"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONTENT_STATUSES, type ContentStatus } from "@/lib/content/constants";
import { updateContentStatus } from "./actions";

export interface ContentCardData {
  id: string;
  clientId: string;
  clientName: string;
  platform: string | null;
  contentType: string | null;
  hook: string | null;
  status: ContentStatus;
}

export function ContentBoard({ items }: { items: ContentCardData[] }) {
  const byStatus = new Map<ContentStatus, ContentCardData[]>();
  for (const s of CONTENT_STATUSES) byStatus.set(s.value, []);
  for (const item of items) {
    if (!byStatus.has(item.status)) byStatus.set(item.status, []);
    byStatus.get(item.status)!.push(item);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {CONTENT_STATUSES.map((status) => {
        const columnItems = byStatus.get(status.value) ?? [];
        return (
          <div key={status.value} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-medium">{status.label}</p>
              <Badge variant="outline" className="text-[10px]">{columnItems.length}</Badge>
            </div>
            <div className="space-y-2">
              {columnItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
              {columnItems.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Empty</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContentCard({ item }: { item: ContentCardData }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium">{item.hook ?? `${item.contentType ?? "Content"} - ${item.clientName}`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        <p className="text-xs text-muted-foreground">{item.clientName}</p>
        {item.platform ? (
          <Badge variant="outline" className="text-[10px] capitalize">{item.platform}</Badge>
        ) : null}
        <select
          className="w-full rounded-md border bg-background px-2 py-1 text-xs"
          value={item.status}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() => updateContentStatus(item.id, item.clientId, e.target.value as ContentStatus))
          }
        >
          {CONTENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}
