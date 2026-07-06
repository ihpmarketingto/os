"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function num(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function createRetainer(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const amount = num(formData, "amount");
  const startDate = str(formData, "startDate");
  if (!clientId || amount === null || !startDate) throw new Error("Client, amount and start date are required");

  await requirePermission(supabase, session.organisationId, "finance", "update", clientId);

  const { data: retainer, error } = await supabase
    .from("retainers")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name: str(formData, "name") ?? "Monthly retainer",
      amount,
      billing_cadence: (str(formData, "billingCadence") as "monthly" | "quarterly" | null) ?? "monthly",
      included_hours: num(formData, "includedHours"),
      start_date: startDate,
      end_date: str(formData, "endDate"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "retainers",
    resourceId: retainer.id,
    clientId,
    metadata: { amount },
  });

  revalidatePath("/finance");
}

export async function createInvoice(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const amount = num(formData, "amount");
  if (!clientId || amount === null) throw new Error("Client and amount are required");

  await requirePermission(supabase, session.organisationId, "finance", "update", clientId);

  // Simple per-year sequence. The unique (organisation_id, number) constraint
  // is the backstop against the rare concurrent-create collision.
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", session.organisationId)
    .like("number", `INV-${year}-%`);
  const number = `INV-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      number,
      amount,
      tax_amount: num(formData, "taxAmount") ?? 0,
      due_date: str(formData, "dueDate"),
      notes: str(formData, "notes"),
      created_by: session.userId,
    })
    .select("id, number")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "invoices",
    resourceId: invoice.id,
    clientId,
    metadata: { number: invoice.number, amount },
  });

  revalidatePath("/finance");
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "draft" | "sent" | "paid" | "overdue" | "void",
): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "finance", "update");

  const { error } = await supabase
    .from("invoices")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "invoices",
    resourceId: invoiceId,
    metadata: { status },
  });

  revalidatePath("/finance");
  revalidatePath("/client-portal");
}

export async function recordPayment(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "finance", "update");

  const invoiceId = str(formData, "invoiceId");
  const amount = num(formData, "amount");
  if (!invoiceId || amount === null) throw new Error("Invoice and amount are required");

  const { error } = await supabase.from("payments").insert({
    organisation_id: session.organisationId,
    invoice_id: invoiceId,
    amount,
    method: (str(formData, "method") as "stripe" | "square" | "e_transfer" | "cheque" | "wire" | "other" | null) ?? "e_transfer",
    reference: str(formData, "reference"),
    recorded_by: session.userId,
  });
  if (error) throw new Error(error.message);

  // Mark the invoice paid when recorded payments cover the total.
  const [{ data: invoice }, { data: payments }] = await Promise.all([
    supabase.from("invoices").select("id, amount, tax_amount").eq("id", invoiceId).single(),
    supabase.from("payments").select("amount").eq("invoice_id", invoiceId),
  ]);
  if (invoice && payments) {
    const paidTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (paidTotal >= Number(invoice.amount) + Number(invoice.tax_amount)) {
      await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", invoiceId);
    }
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "payments",
    resourceId: invoiceId,
    metadata: { amount },
  });

  revalidatePath("/finance");
  revalidatePath("/client-portal");
}

export async function createContract(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  if (!clientId || !name) throw new Error("Client and contract name are required");

  await requirePermission(supabase, session.organisationId, "finance", "update", clientId);

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name,
      status: (str(formData, "status") as "draft" | "sent" | "signed" | null) ?? "draft",
      start_date: str(formData, "startDate"),
      end_date: str(formData, "endDate"),
      renewal_notice_days: num(formData, "renewalNoticeDays") ?? 30,
      value: num(formData, "value"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "contracts",
    resourceId: contract.id,
    clientId,
  });

  revalidatePath("/finance");
}

export async function createExpense(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const description = str(formData, "description");
  const amount = num(formData, "amount");
  const clientId = str(formData, "clientId");
  if (!description || amount === null) throw new Error("Description and amount are required");

  await requirePermission(supabase, session.organisationId, "finance", "update", clientId);

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      category: (str(formData, "category") as "contractor" | "software" | "ad_spend" | "ai_spend" | "other" | null) ?? "other",
      description,
      vendor: str(formData, "vendor"),
      amount,
      incurred_on: str(formData, "incurredOn") ?? new Date().toISOString().slice(0, 10),
      recorded_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "expenses",
    resourceId: expense.id,
    clientId,
    metadata: { amount },
  });

  revalidatePath("/finance");
}
