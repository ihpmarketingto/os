import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import {
  calculateProposalTotals,
  checkProposalReadiness,
  lineTotal,
  type LineCadence,
  type ProposalLine,
  type ProposalStatus,
} from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AddLineForm, ProposalStatusControl, RemoveLineButton, SendProposalDialog } from "./proposal-controls";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

const CADENCE_LABEL: Record<LineCadence, string> = {
  one_time: "One time",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, client:clients(name)")
    .eq("organisation_id", session.organisationId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!proposal) notFound();

  const [{ data: rawLines }, { data: packages }] = await Promise.all([
    supabase
      .from("proposal_line_items")
      .select("*")
      .eq("proposal_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("service_packages")
      .select("id, name, cadence, default_price")
      .eq("organisation_id", session.organisationId)
      .eq("is_active", true)
      .order("name"),
  ]);

  const lines: ProposalLine[] = (rawLines ?? []).map((l) => ({
    id: l.id,
    description: l.description,
    cadence: l.cadence as LineCadence,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unit_price),
  }));

  const totals = calculateProposalTotals(lines);
  const readiness = checkProposalReadiness({
    clientId: proposal.client_id,
    lines,
    validUntil: proposal.valid_until,
  });
  const isDraft = proposal.status === "draft";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="flex items-center text-xs text-muted-foreground hover:underline">
          <ChevronLeft className="size-3" /> Finance
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl">{proposal.title}</h1>
          <Badge variant="outline" className="capitalize">
            {proposal.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {(proposal.client as unknown as { name: string } | null)?.name ?? "No client attached"}
          {proposal.valid_until ? ` · valid until ${proposal.valid_until}` : ""}
          {proposal.sent_at
            ? ` · sent ${new Date(proposal.sent_at).toLocaleDateString("en-CA", { dateStyle: "medium" })}`
            : ""}
          {proposal.sent_to_email ? ` to ${proposal.sent_to_email}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">One time</p>
            <p className="font-heading text-2xl">{cad.format(totals.oneTime)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Monthly</p>
            <p className="font-heading text-2xl">{cad.format(totals.monthlyRecurring)}</p>
            <p className="text-xs text-muted-foreground">quarterly lines divided</p>
          </CardContent>
        </Card>
        <Card className="border-brand/40">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">First invoice</p>
            <p className="font-heading text-2xl">{cad.format(totals.firstInvoice)}</p>
            <p className="text-xs text-muted-foreground">one time plus one month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Annual recurring</p>
            <p className="font-heading text-2xl">{cad.format(totals.annualRecurring)}</p>
            <p className="text-xs text-muted-foreground">excludes one-time work</p>
          </CardContent>
        </Card>
      </div>

      {totals.hasMixedCadence ? (
        <p className="text-xs text-muted-foreground">
          This proposal mixes one-time and recurring work. Quote the two figures separately: a single blended number is
          the one that gets agreed to and then argued about.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
          <CardDescription>
            Pricing is snapshotted when a line is added, so repricing the catalogue later never rewrites a quote that
            has already gone out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lines yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {isDraft ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {CADENCE_LABEL[line.cadence]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{cad.format(line.unitPrice)}</TableCell>
                    <TableCell className="text-right">
                      {cad.format(lineTotal(line))}
                      {line.cadence !== "one_time" ? (
                        <span className="text-xs text-muted-foreground">
                          {line.cadence === "monthly" ? " /mo" : " /qtr"}
                        </span>
                      ) : null}
                    </TableCell>
                    {isDraft ? (
                      <TableCell className="text-right">
                        <RemoveLineButton lineId={line.id} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {isDraft ? (
            <AddLineForm proposalId={proposal.id} packages={packages ?? []} />
          ) : (
            <p className="text-xs text-muted-foreground">
              This proposal has been sent, so its lines are locked. That is deliberate: the client is looking at these
              numbers.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
          <CardDescription>
            Marking a proposal sent records that you sent it. IHP OS does not transmit it: nothing here emails the
            client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isDraft && !readiness.ready ? (
            <div className="rounded-md border border-risk/40 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-risk">
                <AlertTriangle className="size-3.5" /> Not ready to send
              </p>
              <ul className="mt-1 space-y-0.5">
                {readiness.blockers.map((blocker) => (
                  <li key={blocker} className="text-xs text-muted-foreground">
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {isDraft ? (
              <SendProposalDialog proposalId={proposal.id} ready={readiness.ready} />
            ) : (
              <ProposalStatusControl proposalId={proposal.id} status={proposal.status as ProposalStatus} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
