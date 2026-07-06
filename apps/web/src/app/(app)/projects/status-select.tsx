"use client";

import { useTransition } from "react";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projects/constants";
import { updateProjectStatus } from "./actions";

export function ProjectStatusSelect({ projectId, status }: { projectId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-50"
      value={status}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateProjectStatus(projectId, e.target.value as ProjectStatus))}
    >
      {PROJECT_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
