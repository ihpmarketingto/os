"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import {
  allowedNextProposalStatuses,
  checkProposalReadiness,
  proposalHeadlineAmount,
  type LineCadence,
  type ProposalLine,
  type ProposalStatus,
} from "@ihp/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

type Supabase = Awaited<ReturnType<typeof getSupabaseServerClient>>;

async function loadLines(supabase: Supabase, proposalId: string): Promise<ProposalLine[]> {
  const { data } = await supabase
    .from("proposal_line_items")
    .select("id, description, cadence, quantity, unit_price")
    .eq("proposal_id", proposalId)
    .order("position", { ascending: true });

  return (data ?? []).map((l) => ({
    id: l.id,
    description: l.description,
    cadence: l.cadence as LineCadence,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unit_price),
  }));
}

/**
 * Keeps proposals.amount derived from the lines. Storing the first-invoice
 * value rather than an annualised one, so the pipeline is not inflated by
 * counting a year of a retainer that has not been won.
 */
async function syncAmount(supabase: Supabase, proposalId: string): Promise<void> {
  const lines = await loadLines(supabase, proposalId);
  await supabase
    .from("proposals")
    .update({ amount: proposalHeadlineAmount(lines), updated_at: new Date().toISOString() })
    .eq("id", proposalId);
}

export async function createProposal(formData: FormData): Promise<{ error?: string; id?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const title = str(formData, "title");
  const clientId = str(formData, "clientId");
  if (!title) return { error: "A title is required." };

  try {
    await requirePermission(supabase, session.organisationId, "finance", "create", clientId);
  } catch {
    return { error: "You do not have permission to create proposals for this client." };
  }

  const { data: proposal, error } = await supabase
    .from("proposals")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      title,
      valid_until: str(formData, "validUntil"),
      notes: str(formData, "notes"),
      amount: 0,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "proposals",
    resourceId: proposal.id,
    clientId,
    metadata: { title },
  });

  revalidatePath("/finance");
  return { id: proposal.id };
}

/**
 * Adds a line, snapshotting the description, cadence and price rather than
 * reading them back through the package reference. A package rename or
 * repricing must not silently rewrite a quote that has already gone out.
 */
export async function addProposalLine(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const proposalId = str(formData, "proposalId");
  if (!proposalId) return { error: "Missing proposal." };

  const { data: proposal, error: fetchError } = await supabase
    .from("proposals")
    .select("id, client_id, status")
    .eq("id", proposalId)
    .single();
  if (fetchError) return { error: fetchError.message };
  if (proposal.status !== "draft") return { error: "Only a draft proposal can be edited." };

  try {
    await requirePermission(supabase, session.organisationId, "finance", "create", proposal.client_id);
  } catch {
    return { error: "You do not have permission to edit this proposal." };
  }

  const packageId = str(formData, "servicePackageId");
  let description = str(formData, "description");
  let cadence = (str(formData, "cadence") as LineCadence | null) ?? "one_time";
  let unitPrice = Number(String(formData.get("unitPrice") ?? "0")) || 0;

  if (packageId) {
    const { data: pkg } = await supabase
      .from("service_packages")
      .select("name, cadence, default_price")
      .eq("id", packageId)
      .single();
    if (pkg) {
      description = description ?? pkg.name;
      cadence = pkg.cadence as LineCadence;
      // A price typed on the form wins, so a package can be quoted at a
      // negotiated rate without editing the catalogue.
      if (!formData.get("unitPrice")) unitPrice = Number(pkg.default_price ?? 0);
    }
  }

  if (!description) return { error: "Describe the line, or pick a package." };

  const quantity = Number(String(formData.get("quantity") ?? "1")) || 1;
  if (quantity <= 0) return { error: "Quantity must be more than zero." };

  const { count } = await supabase
    .from("proposal_line_items")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId);

  const { error } = await supabase.from("proposal_line_items").insert({
    organisation_id: session.organisationId,
    proposal_id: proposalId,
    service_package_id: packageId,
    description,
    cadence,
    quantity,
    unit_price: unitPrice,
    position: count ?? 0,
  });
  if (error) return { error: error.message };

  await syncAmount(supabase, proposalId);
  revalidatePath("/finance");
  return {};
}

export async function removeProposalLine(lineId: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: line, error: fetchError } = await supabase
    .from("proposal_line_items")
    .select("id, proposal_id, proposal:proposals(client_id, status)")
    .eq("id", lineId)
    .single();
  if (fetchError) return { error: fetchError.message };

  const proposal = line.proposal as unknown as { client_id: string | null; status: string } | null;
  if (proposal?.status !== "draft") return { error: "Only a draft proposal can be edited." };

  try {
    await requirePermission(supabase, session.organisationId, "finance", "delete", proposal.client_id);
  } catch {
    return { error: "You do not have permission to edit this proposal." };
  }

  const { error } = await supabase.from("proposal_line_items").delete().eq("id", lineId);
  if (error) return { error: error.message };

  await syncAmount(supabase, line.proposal_id);
  revalidatePath("/finance");
  return {};
}

/**
 * Records that a proposal went to a client. This does not transmit anything:
 * IHP OS has no send path, and nothing here emails the client. It marks the
 * proposal sent, stamps who and when, and stops it being edited afterwards.
 */
export async function markProposalSent(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const proposalId = str(formData, "proposalId");
  if (!proposalId) return { error: "Missing proposal." };

  const { data: proposal, error: fetchError } = await supabase
    .from("proposals")
    .select("id, client_id, status, valid_until, title")
    .eq("id", proposalId)
    .single();
  if (fetchError) return { error: fetchError.message };

  if (!allowedNextProposalStatuses(proposal.status as ProposalStatus).includes("sent")) {
    return { error: `A ${proposal.status} proposal cannot be sent again.` };
  }

  try {
    await requirePermission(supabase, session.organisationId, "finance", "update", proposal.client_id);
  } catch {
    return { error: "You do not have permission to send this proposal." };
  }

  // Checked here, not only in the UI, so an empty or unpriced quote cannot be
  // marked sent by any route.
  const lines = await loadLines(supabase, proposalId);
  const readiness = checkProposalReadiness({
    clientId: proposal.client_id,
    lines,
    validUntil: proposal.valid_until,
  });
  if (!readiness.ready) return { error: readiness.blockers.join(" ") };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("proposals")
    .update({
      status: "sent",
      sent_at: now,
      sent_to_email: str(formData, "sentToEmail"),
      sent_by: session.userId,
      amount: proposalHeadlineAmount(lines),
      updated_at: now,
    })
    .eq("id", proposalId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "external_action",
    resource: "proposals",
    resourceId: proposalId,
    clientId: proposal.client_id,
    metadata: { markedSent: true, sentToEmail: str(formData, "sentToEmail") },
  });

  revalidatePath("/finance");
  return {};
}

export async function updateProposalStatus(
  proposalId: string,
  status: ProposalStatus,
): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: proposal, error: fetchError } = await supabase
    .from("proposals")
    .select("id, client_id, status")
    .eq("id", proposalId)
    .single();
  if (fetchError) return { error: fetchError.message };

  if (!allowedNextProposalStatuses(proposal.status as ProposalStatus).includes(status)) {
    return { error: `A ${proposal.status} proposal cannot become ${status}.` };
  }

  try {
    await requirePermission(supabase, session.organisationId, "finance", "update", proposal.client_id);
  } catch {
    return { error: "You do not have permission to change this proposal." };
  }

  const { error } = await supabase
    .from("proposals")
    .update({ status, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", proposalId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "proposals",
    resourceId: proposalId,
    clientId: proposal.client_id,
    metadata: { from: proposal.status, to: status },
  });

  revalidatePath("/finance");
  return {};
}
