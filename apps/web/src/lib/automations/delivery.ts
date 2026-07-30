import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@ihp/database/types.gen";
import { periodLabel } from "@ihp/types";
import { applyTaskTemplate } from "@/lib/projects/apply-template";
import { isRuleEnabled, notifyUsers, ownerUserIds, recordRun } from "./engine";

type Supabase = SupabaseClient<Database>;

export interface DeliveryOutcome {
  clientName: string;
  serviceName: string;
  period: string;
  projectsCreated: number;
  tasksCreated: number;
}

/**
 * Turns active client_services into delivery work for the current period.
 *
 * For each active service:
 *  - `on_start` templates fire once, ever (first generation for that service);
 *  - `each_period` templates fire once per period (month or quarter);
 *  - one-time services fire once and then go quiet.
 *
 * Each generated cycle becomes its own project ("SEO Retainer - 2026-08")
 * holding that cycle's tasks, so delivery is visible and reviewable rather
 * than a flat task pile. Dedupe is the automation_runs unique constraint,
 * so re-running is always safe.
 */
export async function runServiceDelivery(supabase: Supabase, organisationId: string): Promise<DeliveryOutcome[]> {
  if (!(await isRuleEnabled(supabase, organisationId, "service_delivery"))) return [];

  const outcomes: DeliveryOutcome[] = [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const { data: services, error } = await supabase
    .from("client_services")
    .select(
      "id, client_id, service_package_id, owner_id, status, cadence, start_date, end_date, last_fulfilled_period, client:clients(name, account_manager_id), package:service_packages(name, slug, cadence)",
    )
    .eq("organisation_id", organisationId)
    .eq("status", "active")
    .is("deleted_at", null);
  if (error) {
    console.error("[delivery] could not load client services", error);
    return [];
  }

  const owners = await ownerUserIds(supabase, organisationId);

  for (const service of services ?? []) {
    const pkg = service.package as unknown as { name: string; slug: string; cadence: "one_time" | "monthly" | "quarterly" } | null;
    const client = service.client as unknown as { name: string; account_manager_id: string | null } | null;
    if (!pkg || !client) continue;

    // Not started yet, or already finished.
    if (service.start_date > today) continue;
    if (service.end_date && service.end_date < today) continue;

    const cadence = (service.cadence ?? pkg.cadence) as "one_time" | "monthly" | "quarterly";
    const period = periodLabel(cadence, now);

    // Which SOPs apply this run: on_start only if this service has never
    // generated anything, plus each_period for the current cycle.
    const isFirstRun = service.last_fulfilled_period === null;
    const triggers: ("on_start" | "each_period")[] = isFirstRun ? ["on_start", "each_period"] : ["each_period"];
    if (cadence === "one_time" && !isFirstRun) continue;

    const { data: links } = await supabase
      .from("service_package_templates")
      .select("task_template_id, trigger, sort_order, template:task_templates(name)")
      .eq("service_package_id", service.service_package_id)
      .in("trigger", triggers)
      .order("sort_order");

    if (!links || links.length === 0) continue;

    let projectsCreated = 0;
    let tasksCreated = 0;

    for (const link of links) {
      const templateName = (link.template as unknown as { name: string } | null)?.name ?? "Delivery";

      // One run row per (service, template, trigger, period) so a template
      // that appears in both triggers cannot double-fire, and a re-run of
      // the sweep is a no-op.
      const dedupeKey = `${service.id}:${link.task_template_id}:${link.trigger}:${link.trigger === "on_start" ? "start" : period}`;
      const fresh = await recordRun(
        supabase,
        organisationId,
        "service_delivery",
        dedupeKey,
        `${client.name} - ${pkg.name}: ${templateName} (${link.trigger === "on_start" ? "setup" : period})`,
      );
      if (!fresh) continue;

      // Named for the SOP it contains, not the package: a package with two
      // SOPs in the same trigger would otherwise produce two identically
      // named projects. The package is still recoverable from service_type.
      const projectName =
        link.trigger === "on_start"
          ? `${templateName} (setup)`
          : cadence === "one_time"
            ? templateName
            : `${templateName} - ${period}`;

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          organisation_id: organisationId,
          client_id: service.client_id,
          name: projectName,
          service_type: pkg.slug,
          project_type: link.trigger === "on_start" ? "setup" : "recurring_delivery",
          owner_id: service.owner_id ?? client.account_manager_id,
          status: "active",
          source_template_id: link.task_template_id,
        })
        .select("id")
        .single();
      if (projectError) {
        console.error("[delivery] project insert failed", projectError);
        continue;
      }
      projectsCreated += 1;

      try {
        tasksCreated += await applyTaskTemplate(supabase, {
          organisationId,
          clientId: service.client_id,
          projectId: project.id,
          templateId: link.task_template_id,
        });
      } catch (err) {
        console.error("[delivery] template application failed", err);
      }
    }

    if (projectsCreated > 0) {
      await supabase
        .from("client_services")
        .update({ last_fulfilled_period: period })
        .eq("id", service.id);

      await notifyUsers(supabase, organisationId, service.owner_id ? [service.owner_id] : (client.account_manager_id ? [client.account_manager_id] : owners), {
        title: `${pkg.name} delivery generated for ${client.name}`,
        body: `${projectsCreated} project(s), ${tasksCreated} task(s) for ${period === "once" ? "this engagement" : period}.`,
        href: "/projects",
        clientId: service.client_id,
      });

      outcomes.push({
        clientName: client.name,
        serviceName: pkg.name,
        period,
        projectsCreated,
        tasksCreated,
      });
    }
  }

  return outcomes;
}
