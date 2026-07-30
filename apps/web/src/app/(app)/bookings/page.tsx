import { AlertTriangle } from "lucide-react";
import {
  calculateBookingMetrics,
  isUnreconciled,
  isUpcoming,
  type BookingRecord,
  type BookingStatus,
} from "@ihp/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BookingStatusControl, DepositControl, NewBookingDialog, OutcomeDialog } from "./booking-controls";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

function percent(value: number | null): string {
  return value === null ? "No data yet" : `${Math.round(value * 100)}%`;
}

export default async function BookingsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: bookings }, { data: clients }, { data: leads }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, title, scheduled_at, duration_minutes, status, source, deposit_status, deposit_amount, outcome, revenue, client:clients(name), lead:leads(company_name, utm_source, utm_campaign)",
      )
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("leads")
      .select("id, company_name")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rows = bookings ?? [];

  // Hoisted so the metrics and the row partitioning agree on "now", and so
  // nothing impure runs during render.
  const now = new Date();
  const records: BookingRecord[] = rows.map((b) => ({
    status: b.status as BookingStatus,
    scheduledAt: b.scheduled_at,
    depositStatus: b.deposit_status,
    depositAmount: b.deposit_amount === null ? null : Number(b.deposit_amount),
    outcome: b.outcome,
    revenue: b.revenue === null ? null : Number(b.revenue),
  }));
  const metrics = calculateBookingMetrics(records, now);

  const upcoming = rows.filter((_, i) => isUpcoming(records[i]!, now));
  const needsAttention = rows.filter((_, i) => isUnreconciled(records[i]!, now));
  const past = rows.filter((_, i) => !isUpcoming(records[i]!, now) && !isUnreconciled(records[i]!, now));

  const renderTable = (list: typeof rows, options: { showOutcome?: boolean } = {}) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Booking</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>When</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Deposit</TableHead>
          <TableHead>Status</TableHead>
          {options.showOutcome ? <TableHead>Outcome</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((b) => {
          const lead = b.lead as unknown as { company_name: string; utm_source: string | null; utm_campaign: string | null } | null;
          return (
            <TableRow key={b.id}>
              <TableCell>
                <p className="font-medium">{b.title}</p>
                {lead ? <p className="text-xs text-muted-foreground">Lead: {lead.company_name}</p> : null}
              </TableCell>
              <TableCell>{(b.client as unknown as { name: string } | null)?.name ?? "Agency"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(b.scheduled_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                {b.duration_minutes ? ` · ${b.duration_minutes} min` : ""}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {lead?.utm_source ?? b.source.replace(/_/g, " ")}
                {lead?.utm_campaign ? <span className="block">{lead.utm_campaign}</span> : null}
              </TableCell>
              <TableCell>
                <DepositControl
                  bookingId={b.id}
                  depositStatus={b.deposit_status}
                  amount={b.deposit_amount === null ? null : Number(b.deposit_amount)}
                />
              </TableCell>
              <TableCell>
                <BookingStatusControl bookingId={b.id} status={b.status as BookingStatus} />
              </TableCell>
              {options.showOutcome ? (
                <TableCell>
                  {b.status === "attended" ? (
                    <OutcomeDialog bookingId={b.id} title={b.title} outcome={b.outcome} />
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Consultations and appointments, with the source that produced them and what came of them.
          </p>
        </div>
        <NewBookingDialog
          clients={clients ?? []}
          leads={(leads ?? []).map((l) => ({ id: l.id, name: l.company_name }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Upcoming</p>
            <p className="font-heading text-2xl">{metrics.upcoming}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Show rate</p>
            <p className="font-heading text-2xl">{percent(metrics.showRate)}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.attended} attended, {metrics.noShow} no show
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Close rate</p>
            <p className="font-heading text-2xl">{percent(metrics.closeRate)}</p>
            <p className="text-xs text-muted-foreground">of attended consultations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Revenue booked</p>
            <p className="font-heading text-2xl">{cad.format(metrics.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.revenuePerAttended === null
                ? "No attended consultations yet"
                : `${cad.format(metrics.revenuePerAttended)} per consultation`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Deposits outstanding</p>
            <p className="font-heading text-2xl">{cad.format(metrics.depositsOutstandingAmount)}</p>
            <p className="text-xs text-muted-foreground">across {metrics.depositsOutstanding} bookings</p>
          </CardContent>
        </Card>
      </div>

      {metrics.unreconciled > 0 ? (
        <Card className="border-risk/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-risk" />
              {metrics.unreconciled === 1
                ? "1 booking needs marking up"
                : `${metrics.unreconciled} bookings need marking up`}
            </CardTitle>
            <CardDescription>
              These are past their time but still open, so the show rate above is provisional until they are resolved.
            </CardDescription>
          </CardHeader>
          <CardContent>{renderTable(needsAttention)}</CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing booked yet.</p>
              ) : (
                renderTable(upcoming)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {past.length === 0 ? (
                <p className="text-sm text-muted-foreground">No past bookings yet.</p>
              ) : (
                renderTable(past, { showOutcome: true })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
