"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { computeLeadScore } from "@ihp/types";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import type { DealStage } from "@/lib/crm/constants";
import { applyTaskTemplate } from "@/lib/projects/apply-template";

export async function createLead(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "crm", "create");

  const companyName = String(formData.get("companyName") ?? "").trim();
  if (!companyName) throw new Error("Company name is required");

  const industry = String(formData.get("industry") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "").trim() || null;
  const estimatedValueRaw = String(formData.get("estimatedValue") ?? "").trim();
  const estimatedValue = estimatedValueRaw ? Number(estimatedValueRaw) : null;
  const serviceInterest = String(formData.get("serviceInterest") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { score } = computeLeadScore({
    hasEstimatedValue: Boolean(estimatedValue && estimatedValue > 0),
    serviceInterestCount: serviceInterest.length,
    source,
    hasIndustry: Boolean(industry),
    hasContact: false,
  });

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organisation_id: session.organisationId,
      company_name: companyName,
      industry,
      source,
      estimated_value: estimatedValue,
      service_interest: serviceInterest,
      owner_id: session.userId,
      score,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "leads",
    resourceId: lead.id,
    metadata: { companyName },
  });

  revalidatePath("/crm");
}

export async function convertLeadToDeal(leadId: string): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "crm", "update");

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, company_name, estimated_value")
    .eq("id", leadId)
    .single();
  if (leadError) throw new Error(leadError.message);

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      organisation_id: session.organisationId,
      lead_id: lead.id,
      title: lead.company_name,
      value: lead.estimated_value,
      owner_id: session.userId,
      stage: "new_lead",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("leads").update({ status: "qualified" }).eq("id", leadId);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "deals",
    resourceId: deal.id,
    metadata: { convertedFromLead: leadId },
  });

  revalidatePath("/crm");
}

export async function updateDealStage(dealId: string, stage: DealStage): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "crm", "update");

  const isClosed = stage === "closed_won" || stage === "closed_lost";
  const { error } = await supabase
    .from("deals")
    .update({
      stage,
      status: stage === "closed_won" ? "won" : stage === "closed_lost" ? "lost" : "open",
      closed_at: isClosed ? new Date().toISOString() : null,
    })
    .eq("id", dealId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "deals",
    resourceId: dealId,
    metadata: { stage },
  });

  revalidatePath("/crm");
}

/**
 * Closed-won conversion: create the client record and an onboarding project
 * seeded from the "Client Onboarding" system task template, then send the
 * user straight to the new Client 360 page.
 */
export async function convertDealToClient(dealId: string): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "clients", "create");

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, title, value")
    .eq("id", dealId)
    .single();
  if (dealError) throw new Error(dealError.message);

  const baseSlug = slugify(deal.title);
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      organisation_id: session.organisationId,
      name: deal.title,
      slug: `${baseSlug}-${dealId.slice(0, 6)}`,
      status: "active",
      account_manager_id: session.userId,
      retainer_amount: deal.value,
    })
    .select("id, slug")
    .single();
  if (clientError) throw new Error(clientError.message);

  await supabase.from("deals").update({ client_id: client.id, stage: "closed_won", status: "won" }).eq("id", dealId);

  const { data: template } = await supabase
    .from("task_templates")
    .select("id")
    .eq("name", "Client Onboarding")
    .is("organisation_id", null)
    .maybeSingle();

  if (template) {
    const { data: project } = await supabase
      .from("projects")
      .insert({
        organisation_id: session.organisationId,
        client_id: client.id,
        name: "Client Onboarding",
        service_type: "onboarding",
        owner_id: session.userId,
        status: "active",
        source_template_id: template.id,
      })
      .select("id")
      .single();

    if (project) {
      await applyTaskTemplate(supabase, {
        organisationId: session.organisationId,
        clientId: client.id,
        projectId: project.id,
        templateId: template.id,
      });
    }
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "clients",
    resourceId: client.id,
    clientId: client.id,
    metadata: { convertedFromDeal: dealId },
  });

  redirect(`/clients/${client.slug}`);
}
