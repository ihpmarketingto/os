import { computeChannelSummary, type ChannelSummary } from "@ihp/types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ImportMetricsDialog } from "./import-metrics-dialog";
import type { MetricChannel } from "@/lib/marketing/constants";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(2)}%`);
const money = (v: number | null) => (v === null ? "—" : cad.format(v));

/**
 * Shared server component behind Paid Media, SEO, and Email. One
 * channel-agnostic metrics store, three lenses on it.
 */
export async function ChannelDashboard({
  title,
  description,
  channels,
  defaultChannel,
}: {
  title: string;
  description: string;
  channels: MetricChannel[];
  defaultChannel: MetricChannel;
}) {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: metrics }, { data: clients }, { data: campaigns }] = await Promise.all([
    supabase
      .from("campaign_metrics")
      .select("client_id, channel, metric_date, spend, impressions, clicks, leads, conversions, revenue, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .in("channel", channels)
      .order("metric_date", { ascending: false }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
    supabase
      .from("campaigns")
      .select("id, name, client_id")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const rows = metrics ?? [];
  const overall = computeChannelSummary(rows);

  const byClient = new Map<string, { name: string; rows: typeof rows }>();
  for (const row of rows) {
    const name = (row.client as unknown as { name: string } | null)?.name ?? "Unknown";
    if (!byClient.has(row.client_id)) byClient.set(row.client_id, { name, rows: [] });
    byClient.get(row.client_id)!.rows.push(row);
  }
  const clientSummaries: { name: string; summary: ChannelSummary }[] = Array.from(byClient.values())
    .map(({ name, rows: clientRows }) => ({ name, summary: computeChannelSummary(clientRows) }))
    .sort((a, b) => b.summary.spend - a.summary.spend);

  const dateRange =
    rows.length > 0 ? `${rows[rows.length - 1]!.metric_date} to ${rows[0]!.metric_date}` : "no data yet";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ImportMetricsDialog
          clients={clients ?? []}
          campaigns={(campaigns ?? []).map((c) => ({ id: c.id, name: c.name, clientId: c.client_id }))}
          defaultChannel={defaultChannel}
          channelChoices={channels}
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No metrics imported yet. Use Import CSV with the documented column format; API sync for this channel
          activates when its integration credentials are supplied.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Covering {rows.length} imported day-rows, {dateRange}.</p>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Spend" value={cad.format(overall.spend)} />
            <Stat label="Revenue" value={cad.format(overall.revenue)} />
            <Stat label="ROAS" value={overall.roas === null ? "—" : `${overall.roas.toFixed(2)}x`} />
            <Stat label="Leads" value={String(overall.leads)} />
            <Stat label="CPL" value={money(overall.cpl)} />
            <Stat label="CPA" value={money(overall.cpa)} />
            <Stat label="CTR" value={pct(overall.ctr)} />
            <Stat label="CPM" value={money(overall.cpm)} />
          </section>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>ROAS</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>CPL</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>Conv. rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientSummaries.map(({ name, summary }) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>{cad.format(summary.spend)}</TableCell>
                  <TableCell>{cad.format(summary.revenue)}</TableCell>
                  <TableCell>{summary.roas === null ? "—" : `${summary.roas.toFixed(2)}x`}</TableCell>
                  <TableCell>{summary.leads}</TableCell>
                  <TableCell>{money(summary.cpl)}</TableCell>
                  <TableCell>{pct(summary.ctr)}</TableCell>
                  <TableCell>{pct(summary.conversionRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
