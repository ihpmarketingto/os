"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TASK_STATUSES, type TaskStatus } from "@/lib/tasks/constants";
import { updateTaskStatus } from "./actions";

export interface TaskCardData {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  dueDate: string | null;
  clientName: string | null;
  assigneeName: string | null;
}

const PRIORITY_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  urgent: "default",
  high: "default",
  medium: "secondary",
  low: "outline",
};

export function TaskBoard({ tasks }: { tasks: TaskCardData[] }) {
  const byStatus = new Map<TaskStatus, TaskCardData[]>();
  for (const s of TASK_STATUSES) byStatus.set(s.value, []);
  for (const task of tasks) {
    if (!byStatus.has(task.status)) byStatus.set(task.status, []);
    byStatus.get(task.status)!.push(task);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {TASK_STATUSES.map((status) => {
        const columnTasks = byStatus.get(status.value) ?? [];
        return (
          <div key={status.value} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-medium">{status.label}</p>
              <Badge variant="outline" className="text-[10px]">{columnTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {columnTasks.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Empty</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ task }: { task: TaskCardData }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        <div className="flex items-center gap-1.5">
          <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"} className="text-[10px] capitalize">
            {task.priority}
          </Badge>
          {task.dueDate ? <span className="text-xs text-muted-foreground">Due {task.dueDate}</span> : null}
        </div>
        {task.clientName ? <p className="text-xs text-muted-foreground">{task.clientName}</p> : null}
        {task.assigneeName ? <p className="text-xs text-muted-foreground">Assignee: {task.assigneeName}</p> : null}
        <select
          className="w-full rounded-md border bg-background px-2 py-1 text-xs"
          value={task.status}
          disabled={isPending}
          onChange={(e) => startTransition(() => updateTaskStatus(task.id, e.target.value as TaskStatus))}
        >
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}
