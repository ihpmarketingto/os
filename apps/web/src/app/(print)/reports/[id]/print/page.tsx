import { notFound } from "next/navigation";
import { computeChannelSummary } from "@ihp/types";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const num = new Intl.NumberFormat("en-CA");

function formatDate(value: string): string {
  // Date-only strings must be read as local calendar days, not UTC midnight,
  // or a report for July shows a June end date in a western timezone.
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString("en-CA", { dateStyle: "long" });
}

/**
 * Print-optimised report. Rendered as a normal page so it stays identical to
 * what is on screen, then handed to the browser's print-to-PDF. Deliberately
 * no headless browser in the deployment: a serverless Chromium is a large,
 * fragile dependency for a document the browser already renders correctly.
 */
export default async function ReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: report } = await supabase
    .from("reports")
    .select("*, client:clients(name)")
    .eq("organisation_id", session.organisationId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!report) notFound();

  const [{ data: metrics }, { data: organisation }] = await Promise.all([
    supabase
      .from("campaign_metrics")
      .select("channel, metric_date, spend, impressions, clicks, leads, conversions, revenue")
      .eq("organisation_id", session.organisationId)
      .eq("client_id", report.client_id)
      .gte("metric_date", report.period_start)
      .lte("metric_date", report.period_end),
    supabase.from("organisations").select("name").eq("id", session.organisationId).maybeSingle(),
  ]);

  const rows = metrics ?? [];
  const overall = computeChannelSummary(rows);

  const byChannel = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!byChannel.has(row.channel)) byChannel.set(row.channel, []);
    byChannel.get(row.channel)!.push(row);
  }
  const channelSummaries = [...byChannel.entries()]
    .map(([channel, channelRows]) => ({ channel, summary: computeChannelSummary(channelRows) }))
    .sort((a, b) => b.summary.spend - a.summary.spend);

  const clientName = (report.client as unknown as { name: string } | null)?.name ?? "Client";

  return (
    <div className="report-print mx-auto max-w-3xl bg-white p-10 text-[#21242C]">
      {/* Hidden when printing, so the control never lands in the PDF. */}
      <div className="no-print mb-6 flex items-center justify-between rounded-md border border-dashed p-3">
        <p className="text-sm text-[#21242C]/70">
          Use your browser&apos;s print dialog and choose Save as PDF. Colours and page breaks are already set up.
        </p>
        <PrintButton />
      </div>

      <header className="mb-8 border-b-2 border-[#622249] pb-4">
        <p className="text-xs uppercase tracking-widest text-[#C89B41]">{organisation?.name ?? "IHP Marketing"}</p>
        <h1 className="mt-1 font-heading text-3xl text-[#310C25]">{report.title}</h1>
        <p className="mt-1 text-sm text-[#21242C]/70">
          {clientName} · {formatDate(report.period_start)} to {formatDate(report.period_end)}
        </p>
      </header>

      {report.executive_summary ? (
        <section className="mb-6">
          <h2 className="mb-2 font-heading text-xl text-[#622249]">Summary</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{report.executive_summary}</p>
        </section>
      ) : null}

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 font-heading text-xl text-[#622249]">Performance</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-[#21242C]/70">
            No metrics were imported for this period, so no performance figures are shown. This section is left empty
            rather than filled with estimates.
          </p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-4 gap-3">
              {[
                { label: "Spend", value: cad.format(overall.spend) },
                { label: "Leads", value: num.format(overall.leads) },
                { label: "Conversions", value: num.format(overall.conversions) },
                { label: "Revenue", value: cad.format(overall.revenue) },
              ].map((stat) => (
                <div key={stat.label} className="rounded-md border border-[#622249]/20 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[#21242C]/60">{stat.label}</p>
                  <p className="font-heading text-lg">{stat.value}</p>
                </div>
              ))}
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#622249]/30 text-left">
                  <th className="py-1.5 font-medium">Channel</th>
                  <th className="py-1.5 text-right font-medium">Spend</th>
                  <th className="py-1.5 text-right font-medium">Clicks</th>
                  <th className="py-1.5 text-right font-medium">Leads</th>
                  <th className="py-1.5 text-right font-medium">Revenue</th>
                  <th className="py-1.5 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {channelSummaries.map(({ channel, summary }) => (
                  <tr key={channel} className="border-b border-[#21242C]/10">
                    <td className="py-1.5 capitalize">{channel.replace(/_/g, " ")}</td>
                    <td className="py-1.5 text-right">{cad.format(summary.spend)}</td>
                    <td className="py-1.5 text-right">{num.format(summary.clicks)}</td>
                    <td className="py-1.5 text-right">{num.format(summary.leads)}</td>
                    <td className="py-1.5 text-right">{cad.format(summary.revenue)}</td>
                    <td className="py-1.5 text-right">
                      {/* Withheld rather than shown as zero when nothing was spent. */}
                      {summary.roas === null ? "n/a" : `${summary.roas.toFixed(2)}x`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {report.key_wins ? (
        <section className="mb-6 break-inside-avoid">
          <h2 className="mb-2 font-heading text-xl text-[#622249]">What worked</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{report.key_wins}</p>
        </section>
      ) : null}

      {report.risks ? (
        <section className="mb-6 break-inside-avoid">
          <h2 className="mb-2 font-heading text-xl text-[#622249]">Risks and watch items</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{report.risks}</p>
        </section>
      ) : null}

      {report.next_month_plan ? (
        <section className="mb-6 break-inside-avoid">
          <h2 className="mb-2 font-heading text-xl text-[#622249]">What happens next</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{report.next_month_plan}</p>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-[#21242C]/15 pt-3 text-xs text-[#21242C]/60">
        <p>
          {organisation?.name ?? "IHP Marketing"} · Prepared for {clientName} ·{" "}
          {report.status === "published" ? "Published" : "Draft, not yet published"}
        </p>
      </footer>
    </div>
  );
}
