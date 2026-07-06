"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import type { TaskPriority, TaskStatus } from "@/lib/tasks/constants";

export async function createTask(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Task title is required");

  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  const projectId = String(formData.get("projectId") ?? "").trim() || null;
  const assigneeId = String(formData.get("assigneeId") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "medium") as TaskPriority;
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;

  await requirePermission(supabase, session.organisationId, "tasks", "create", clientId);

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      project_id: projectId,
      title,
      category,
      priority,
      assignee_id: assigneeId,
      due_date: dueDate,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "tasks",
    resourceId: task.id,
    clientId,
    metadata: { title },
  });

  revalidatePath("/tasks");
  revalidatePath("/projects");
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "tasks", "update");

  const { error } = await supabase
    .from("tasks")
    .update({ status, completed_at: status === "complete" ? new Date().toISOString() : null })
    .eq("id", taskId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "tasks",
    resourceId: taskId,
    metadata: { status },
  });

  revalidatePath("/tasks");
}
