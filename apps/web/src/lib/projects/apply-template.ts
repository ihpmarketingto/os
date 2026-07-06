import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@ihp/database/types.gen";

interface TemplateTaskDefinition {
  title: string;
  category: string;
  due_offset_days: number;
}

/**
 * Reads a task_templates.default_tasks array and materializes it into real
 * `tasks` rows for a project, offsetting each due date from today. Used by
 * both "create project from template" and the CRM's closed-won → onboarding
 * project flow, so the offset math only lives in one place.
 */
export async function applyTaskTemplate(
  supabase: SupabaseClient<Database>,
  args: { organisationId: string; clientId: string; projectId: string; templateId: string },
): Promise<number> {
  const { data: template, error } = await supabase
    .from("task_templates")
    .select("default_tasks")
    .eq("id", args.templateId)
    .single();
  if (error) throw new Error(error.message);

  const defaultTasks = (template.default_tasks ?? []) as unknown as TemplateTaskDefinition[];
  if (defaultTasks.length === 0) return 0;

  const today = new Date();
  const taskRows = defaultTasks.map((t) => {
    const due = new Date(today);
    due.setDate(due.getDate() + t.due_offset_days);
    return {
      organisation_id: args.organisationId,
      client_id: args.clientId,
      project_id: args.projectId,
      task_template_id: args.templateId,
      title: t.title,
      category: t.category,
      due_date: due.toISOString().slice(0, 10),
    };
  });

  const { error: insertError } = await supabase.from("tasks").insert(taskRows);
  if (insertError) throw new Error(insertError.message);

  return taskRows.length;
}
