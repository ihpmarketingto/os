"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { applyTaskTemplate } from "@/lib/projects/apply-template";
import type { ProjectStatus } from "@/lib/projects/constants";

export async function createProject(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const serviceType = String(formData.get("serviceType") ?? "").trim() || null;
  const templateId = String(formData.get("templateId") ?? "").trim() || null;
  if (!clientId || !name) throw new Error("Client and project name are required");

  await requirePermission(supabase, session.organisationId, "projects", "create", clientId);

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name,
      service_type: serviceType,
      owner_id: session.userId,
      status: "planning",
      source_template_id: templateId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (templateId) {
    await applyTaskTemplate(supabase, {
      organisationId: session.organisationId,
      clientId,
      projectId: project.id,
      templateId,
    });
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "projects",
    resourceId: project.id,
    clientId,
    metadata: { name, templateId },
  });

  revalidatePath("/projects");
  revalidatePath("/tasks");
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "projects", "update");

  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "projects",
    resourceId: projectId,
    metadata: { status },
  });

  revalidatePath("/projects");
}
