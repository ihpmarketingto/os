import { AlertTriangle, CalendarClock } from "lucide-react";
import {
  checkScopeCreep,
  computeGrossContribution,
  computeMrr,
  forecastRevenue,
  isRenewalDue,
} from "@ihp/types";
import { hasPermission } from "@ihp/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NewContractDialog, NewExpenseDialog, NewInvoiceDialog, NewRetainerDialog } from "./new-record-dialogs";
import { InvoiceStatusSelect, RecordPaymentDialog } from "./invoice-actions";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export default async function FinancePage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const canViewFinance = await hasPermission(supabase, session.organisationId, "finance", "read");
  if (!canViewFinance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Finance</CardTitle>
          <CardDescription>
            Your role does not include financial access. Ask the Agency Owner if you believe you need it.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const thirtyDaysAgoDate = new Date();
  thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
  const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();

  const [
    { data: clients },
    { data: retainers },
    { data: invoices },
    { data: contracts },
    { data: expenses },
    { data: proposals },
    { data: payments },
    { data: openDeals },
    { data: recentTasks },
    { data: rates },
  ] = await Promise.all([
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
    supabase.from("retainers").select("*").eq("organisation_id", session.organisationId).is("deleted_at", null),
    supabase
      .from("invoices")
      .select("*, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("contracts").select("*, client:clients(name)").eq("organisation_id", session.organisationId).is("deleted_at", null),
    supabase
      .from("expenses")
      .select("*, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("incurred_on", { ascending: false }),
    supabase.from("proposals").select("*, client:clients(name)").eq("organisation_id", session.organisationId).is("deleted_at", null),
    supabase.from("payments").select("amount, invoice_id").eq("organisation_id", session.organisationId),
    supabase.from("deals").select("value").eq("organisation_id", session.organisationId).eq("status", "open"),
    supabase
      .from("tasks")
      .select("client_id, assignee_id, actual_hours")
      .eq("organisation_id", session.organisationId)
      .not("actual_hours", "is", null)
      .gte("updated_at", thirtyDaysAgo),
    supabase.from("member_rates").select("user_id, hourly_cost, effective_from").eq("organisation_id", session.organisationId),
  ]);

  const today = new Date();
  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.name]));

  // --- KPIs -----------------------------------------------------------------
  const mrr = computeMrr(retainers ?? []);
  const outstandingInvoices = (invoices ?? []).filter((i) => i.status === "sent" || i.status === "overdue");
  const outstandingTotal = outstandingInvoices.reduce((sum, i) => sum + Number(i.amount) + Number(i.tax_amount), 0);
  const overdueTotal = (invoices ?? [])
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount) + Number(i.tax_amount), 0);
  const openPipelineValue = (openDeals ?? []).reduce((sum, d) => sum + Number(d.value ?? 0), 0);
  const forecast = forecastRevenue({ mrr, outstandingInvoiceTotal: outstandingTotal, openPipelineValue });

  // --- Renewals -------------------------------------------------------------
  const renewalsDue = [
    ...(contracts ?? [])
      .filter((c) => c.status === "signed" && isRenewalDue(c, today))
      .map((c) => ({
        kind: "Contract",
        name: c.name,
        clientName: (c.client as unknown as { name: string } | null)?.name ?? "",
        endDate: c.end_date,
      })),
    ...(retainers ?? [])
      .filter((r) => r.status === "active" && isRenewalDue({ end_date: r.end_date }, today))
      .map((r) => ({ kind: "Retainer", name: r.name, clientName: clientNameById.get(r.client_id) ?? "", endDate: r.end_date })),
  ];

  // --- Scope creep ----------------------------------------------------------
  const hoursByClient = new Map<string, number>();
  for (const t of recentTasks ?? []) {
    if (!t.client_id) continue;
    hoursByClient.set(t.client_id, (hoursByClient.get(t.client_id) ?? 0) + Number(t.actual_hours ?? 0));
  }
  const scopeCreepAlerts = (retainers ?? [])
    .filter((r) => r.status === "active")
    .map((r) => ({
      clientName: clientNameById.get(r.client_id) ?? "",
      result: checkScopeCreep({
        includedHours: r.included_hours,
        actualHoursThisPeriod: hoursByClient.get(r.client_id) ?? 0,
      }),
    }))
    .filter((a) => a.result.isOverIncludedHours);

  // --- Profitability --------------------------------------------------------
  const latestRateByUser = new Map<string, number>();
  for (const rate of (rates ?? []).sort((a, b) => a.effective_from.localeCompare(b.effective_from))) {
    latestRateByUser.set(rate.user_id, Number(rate.hourly_cost));
  }
  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount));
  }
  const revenueByClient = new Map<string, number>();
  for (const invoice of invoices ?? []) {
    const collected =
      invoice.status === "paid"
        ? Number(invoice.amount) + Number(invoice.tax_amount)
        : (paidByInvoice.get(invoice.id) ?? 0);
    if (collected > 0) revenueByClient.set(invoice.client_id, (revenueByClient.get(invoice.client_id) ?? 0) + collected);
  }
  const contractorCostByClient = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (e.category === "contractor" && e.client_id) {
      contractorCostByClient.set(e.client_id, (contractorCostByClient.get(e.client_id) ?? 0) + Number(e.amount));
    }
  }
  const labourByClient = new Map<string, number>();
  for (const t of recentTasks ?? []) {
    if (!t.client_id || !t.assignee_id) continue;
    const rate = latestRateByUser.get(t.assignee_id) ?? 0;
    labourByClient.set(t.client_id, (labourByClient.get(t.client_id) ?? 0) + Number(t.actual_hours ?? 0) * rate);
  }
  const profitabilityRows = (clients ?? [])
    .map((c) => {
      const result = computeGrossContribution({
        revenue: revenueByClient.get(c.id) ?? 0,
        contractorCosts: contractorCostByClient.get(c.id) ?? 0,
        internalLabourCost: labourByClient.get(c.id) ?? 0,
        deliverySoftwareAllocation: 0,
        paidMediaManagementAllocation: 0,
      });
      return { name: c.name, revenue: revenueByClient.get(c.id) ?? 0, ...result };
    })
    .filter((row) => row.revenue > 0 || row.grossContribution !== 0)
    .sort((a, b) => b.grossContribution - a.grossContribution);

  const clientOptions = clients ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">Finance</h1>
          <p className="text-sm text-muted-foreground">Retainers, invoices, costs and client profitability.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewInvoiceDialog clients={clientOptions} />
          <NewRetainerDialog clients={clientOptions} />
          <NewContractDialog clients={clientOptions} />
          <NewExpenseDialog clients={clientOptions} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Monthly recurring revenue" value={cad.format(mrr)} />
        <KpiCard label="Outstanding invoices" value={cad.format(outstandingTotal)} sub={`${outstandingInvoices.length} open`} />
        <KpiCard label="Overdue" value={cad.format(overdueTotal)} tone={overdueTotal > 0 ? "risk" : undefined} />
        <KpiCard
          label="3-month forecast"
          value={forecast.map((m) => cad.format(m)).join(" · ")}
          sub="Planning number, not a promise"
        />
      </section>

      {(renewalsDue.length > 0 || scopeCreepAlerts.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          {renewalsDue.length > 0 ? (
            <Card className="border-brand/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="size-4 text-brand" /> Renewals due
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {renewalsDue.map((r, i) => (
                  <p key={i} className="text-sm">
                    <Badge variant="outline" className="mr-2 text-[10px]">{r.kind}</Badge>
                    {r.clientName}: {r.name} ends {r.endDate}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}
          {scopeCreepAlerts.length > 0 ? (
            <Card className="border-risk/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4 text-risk" /> Scope creep
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scopeCreepAlerts.map((a, i) => (
                  <p key={i} className="text-sm">
                    {a.clientName}: {a.result.hoursOver}h over included hours in the last 30 days (
                    {Math.round((a.result.utilisation ?? 0) * 100)}% of retainer)
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>
      )}

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({(invoices ?? []).length})</TabsTrigger>
          <TabsTrigger value="retainers">Retainers ({(retainers ?? []).length})</TabsTrigger>
          <TabsTrigger value="contracts">Contracts ({(contracts ?? []).length})</TabsTrigger>
          <TabsTrigger value="proposals">Proposals ({(proposals ?? []).length})</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({(expenses ?? []).length})</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="pt-4">
          {(invoices ?? []).length === 0 ? (
            <EmptyNote text="No invoices yet. Create one and mark it sent; it then appears in the client's portal." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices ?? []).map((inv) => {
                  const total = Number(inv.amount) + Number(inv.tax_amount);
                  const outstanding = Math.max(0, total - (paidByInvoice.get(inv.id) ?? 0));
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.number}</TableCell>
                      <TableCell>{(inv.client as unknown as { name: string } | null)?.name}</TableCell>
                      <TableCell>{cad.format(total)}</TableCell>
                      <TableCell>{inv.due_date ?? "—"}</TableCell>
                      <TableCell>
                        <InvoiceStatusSelect invoiceId={inv.id} status={inv.status} />
                      </TableCell>
                      <TableCell>
                        {inv.status !== "paid" && inv.status !== "void" ? (
                          <RecordPaymentDialog invoiceId={inv.id} invoiceNumber={inv.number} outstanding={outstanding} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="retainers" className="pt-4">
          {(retainers ?? []).length === 0 ? (
            <EmptyNote text="No retainers yet. Add one to start tracking MRR and scope." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Included hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(retainers ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{clientNameById.get(r.client_id)}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{cad.format(Number(r.amount))}</TableCell>
                    <TableCell className="capitalize">{r.billing_cadence}</TableCell>
                    <TableCell>{r.included_hours ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : "outline"} className="capitalize">{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="pt-4">
          {(contracts ?? []).length === 0 ? (
            <EmptyNote text="No contracts on file yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(contracts ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{(c.client as unknown as { name: string } | null)?.name}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.value ? cad.format(Number(c.value)) : "—"}</TableCell>
                    <TableCell>{c.end_date ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "signed" ? "default" : "outline"} className="capitalize">{c.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="proposals" className="pt-4">
          {(proposals ?? []).length === 0 ? (
            <EmptyNote text="No proposals yet. Proposals attach to deals in CRM; the builder UI arrives with the proposal-template work." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(proposals ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>{(p.client as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                    <TableCell>{p.amount ? cad.format(Number(p.amount)) : "—"}</TableCell>
                    <TableCell className="capitalize">{p.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="pt-4">
          {(expenses ?? []).length === 0 ? (
            <EmptyNote text="No expenses recorded. Contractor costs logged here feed client profitability." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(expenses ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.incurred_on}</TableCell>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell>{(e.client as unknown as { name: string } | null)?.name ?? "Agency overhead"}</TableCell>
                    <TableCell className="capitalize">{e.category.replace(/_/g, " ")}</TableCell>
                    <TableCell>{cad.format(Number(e.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="profitability" className="pt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Revenue collected minus contractor costs minus internal labour (task hours x member rates, last 30 days).
            Software and paid-media management allocations are not yet configured and count as zero.
          </p>
          {profitabilityRows.length === 0 ? (
            <EmptyNote text="No revenue or costs recorded yet. Mark an invoice paid or record a payment to see contribution by client." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Revenue collected</TableHead>
                  <TableHead>Gross contribution</TableHead>
                  <TableHead>Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitabilityRows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{cad.format(row.revenue)}</TableCell>
                    <TableCell className={row.grossContribution < 0 ? "text-risk" : undefined}>
                      {cad.format(row.grossContribution)}
                    </TableCell>
                    <TableCell>{row.margin === null ? "—" : `${Math.round(row.margin * 100)}%`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "risk" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-xl ${tone === "risk" ? "text-risk" : ""}`}>{value}</CardTitle>
      </CardHeader>
      {sub ? <CardContent className="pt-0 text-xs text-muted-foreground">{sub}</CardContent> : null}
    </Card>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;
}
