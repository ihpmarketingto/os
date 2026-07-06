import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TaskBoard, type TaskCardData } from "./task-board";
import { NewTaskDialog } from "./new-task-dialog";

export default async function TasksPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: tasks }, { data: clients }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, client:clients(name), assignee:profiles!tasks_assignee_id_fkey(full_name)")
      .eq("organisation_id", session.organisationId)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).order("name"),
    supabase
      .from("organisation_members")
      .select("user_id, profiles(full_name)")
      .eq("organisation_id", session.organisationId)
      .eq("status", "active"),
  ]);

  const taskCards: TaskCardData[] = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    clientName: (t.client as unknown as { name: string } | null)?.name ?? null,
    assigneeName: (t.assignee as unknown as { full_name: string | null } | null)?.full_name ?? null,
  }));

  const memberOptions = (members ?? []).map((m) => ({
    id: m.user_id,
    name: (m.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "Unnamed",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Tasks</h1>
          <p className="text-sm text-muted-foreground">Every task assigned to you or visible to your role.</p>
        </div>
        <NewTaskDialog clients={clients ?? []} members={memberOptions} />
      </div>

      <TaskBoard tasks={taskCards} />
    </div>
  );
}
