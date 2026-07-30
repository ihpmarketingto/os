import { AlertTriangle, Trophy } from "lucide-react";
import { assessCreativeFatigue, rankCreatives, type CreativeRow } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChannelDashboard } from "@/components/marketing/channel-dashboard";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  CreativeStatusActions,
  ImportCreativeMetricsDialog,
  LogOptimisationDialog,
  NewCreativeDialog,
  RecordOutcomeDialog,
} from "./creative-dialogs";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(2)}%`);
const money = (v: number | null) => (v === null ? "—" : cad.format(v));

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  live: "default",
  approved: "secondary",
  in_review: "secondary",
  draft: "outline",
  paused: "outline",
  retired: "outline",
};

export default async function PaidMediaPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: creatives }, { data: creativeMetrics }, { data: optimisations }, { data: clients }, { data: campaigns }] =
    await Promise.all([
      supabase
        .from("ad_creatives")
        .select("id, name, concept, variant_label, audience, format, channel, status, launched_at, client:clients(name)")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("concept")
        .order("variant_label"),
      supabase
        .from("campaign_metrics")
        .select("ad_creative_id, metric_date, spend, impressions, clicks, leads, conversions, revenue")
        .eq("organisation_id", session.organisationId)
        .not("ad_creative_id", "is", null),
      supabase
        .from("optimisation_log")
        .select("id, change_type, description, rationale, expected_outcome, observed_outcome, decision, changed_at, client:clients(name), creative:ad_creatives(name)")
        .eq("organisation_id", session.organisationId)
        .order("changed_at", { ascending: false })
        .limit(25),
      supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
      supabase
        .from("campaigns")
        .select("id, name")
        .eq("organisation_id", session.organisationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

  const metricsByCreative = new Map<string, { metric_date: string; spend: number; impressions: number; clicks: number; leads: number; conversions: number; revenue: number }[]>();
  for (const row of creativeMetrics ?? []) {
    if (!row.ad_creative_id) continue;
    if (!metricsByCreative.has(row.ad_creative_id)) metricsByCreative.set(row.ad_creative_id, []);
    metricsByCreative.get(row.ad_creative_id)!.push({
      metric_date: row.metric_date,
      spend: Number(row.spend),
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
      leads: Number(row.leads),
      conversions: Number(row.conversions),
      revenue: Number(row.revenue),
    });
  }

  const creativeRows: CreativeRow[] = (creatives ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    concept: c.concept,
    variantLabel: c.variant_label,
    audience: c.audience,
    metrics: metricsByCreative.get(c.id) ?? [],
  }));
  const ranked = rankCreatives(creativeRows, "roas");
  const rankedById = new Map(ranked.map((r) => [r.id, r]));

  const nowMs = new Date().getTime();
  const fatigueById = new Map(
    (creatives ?? []).map((c) => {
      const metrics = metricsByCreative.get(c.id) ?? [];
      const daysLive = c.launched_at
        ? Math.max(1, Math.round((nowMs - new Date(c.launched_at).getTime()) / 86400000))
        : null;
      return [c.id, assessCreativeFatigue({ metrics, daysLive })];
    }),
  );

  const fatigued = (creatives ?? []).filter((c) => fatigueById.get(c.id)?.fatigued);

  // Testing matrix: concept x audience, aggregated from the ranked summaries.
  const audiences = Array.from(new Set((creatives ?? []).map((c) => c.audience ?? "Unspecified"))).sort();
  const concepts = Array.from(new Set((creatives ?? []).map((c) => c.concept))).sort();
  const matrix = new Map<string, { spend: number; revenue: number; leads: number; variants: number }>();
  for (const c of creatives ?? []) {
    const key = `${c.concept}||${c.audience ?? "Unspecified"}`;
    const summary = rankedById.get(c.id)!.summary;
    const cell = matrix.get(key) ?? { spend: 0, revenue: 0, leads: 0, variants: 0 };
    cell.spend += summary.spend;
    cell.revenue += summary.revenue;
    cell.leads += summary.leads;
    cell.variants += 1;
    matrix.set(key, cell);
  }

  const clientChoices = clients ?? [];
  const campaignChoices = campaigns ?? [];
  const creativeChoices = (creatives ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">Paid Media</h1>
          <p className="text-sm text-muted-foreground">
            Channel performance, creative variants and the optimisation record. Creative must be approved before it
            can go live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewCreativeDialog clients={clientChoices} campaigns={campaignChoices} />
          <ImportCreativeMetricsDialog clients={clientChoices} />
          <LogOptimisationDialog clients={clientChoices} campaigns={campaignChoices} creatives={creativeChoices} />
        </div>
      </div>

      {fatigued.length > 0 ? (
        <Card className="border-risk/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-risk" /> Creative fatigue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {fatigued.map((c) => (
              <p key={c.id} className="text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground">: {fatigueById.get(c.id)!.reason}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="creative">
        <TabsList>
          <TabsTrigger value="creative">Creative ({(creatives ?? []).length})</TabsTrigger>
          <TabsTrigger value="matrix">Testing matrix</TabsTrigger>
          <TabsTrigger value="log">Optimisation log ({(optimisations ?? []).length})</TabsTrigger>
          <TabsTrigger value="channel">Channel totals</TabsTrigger>
        </TabsList>

        <TabsContent value="creative" className="pt-4">
          {!creatives || creatives.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No creative yet. Add variants under a shared concept, then import per-ad metrics to see which is winning.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creative</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>ROAS</TableHead>
                  <TableHead>CPL</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {creatives.map((c) => {
                  const r = rankedById.get(c.id)!;
                  const fatigue = fatigueById.get(c.id)!;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="flex items-center gap-1.5 font-medium">
                          {r.rank === 1 ? <Trophy className="size-3.5 text-brand" /> : null}
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.concept} · variant {c.variant_label} · {c.format.replace(/_/g, " ")}
                          {r.rank ? ` · rank ${r.rank}` : r.summary.spend > 0 ? " · not enough data to rank" : ""}
                        </p>
                      </TableCell>
                      <TableCell>{(c.client as unknown as { name: string } | null)?.name}</TableCell>
                      <TableCell className="text-xs">{c.audience ?? "—"}</TableCell>
                      <TableCell>{cad.format(r.summary.spend)}</TableCell>
                      <TableCell>{r.summary.roas === null ? "—" : `${r.summary.roas.toFixed(2)}x`}</TableCell>
                      <TableCell>{money(r.summary.cpl)}</TableCell>
                      <TableCell>
                        {pct(r.summary.ctr)}
                        {fatigue.fatigued ? <Badge className="ml-1 bg-risk text-white text-[10px]">fatigued</Badge> : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[c.status] ?? "outline"} className="capitalize">
                          {c.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CreativeStatusActions creativeId={c.id} status={c.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="matrix" className="pt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Concept against audience: where spend has gone and what it returned. Cells with no variants were never
            tested.
          </p>
          {concepts.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nothing to compare yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concept</TableHead>
                    {audiences.map((a) => (
                      <TableHead key={a}>{a}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {concepts.map((concept) => (
                    <TableRow key={concept}>
                      <TableCell className="font-medium">{concept}</TableCell>
                      {audiences.map((audience) => {
                        const cell = matrix.get(`${concept}||${audience}`);
                        if (!cell) {
                          return (
                            <TableCell key={audience} className="text-xs text-muted-foreground">
                              not tested
                            </TableCell>
                          );
                        }
                        const roas = cell.spend > 0 ? cell.revenue / cell.spend : null;
                        return (
                          <TableCell key={audience} className="text-xs">
                            <span className="font-medium">{roas === null ? "—" : `${roas.toFixed(2)}x`}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {cad.format(cell.spend)} · {cell.leads} leads · {cell.variants} variant
                              {cell.variants === 1 ? "" : "s"}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="log" className="pt-4">
          {!optimisations || optimisations.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nothing logged yet. Record what you change and why, so the next review has the reasoning.
            </p>
          ) : (
            <ul className="divide-y">
              {optimisations.map((entry) => (
                <li key={entry.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        <Badge variant="outline" className="mr-2 text-[10px] capitalize">
                          {entry.change_type}
                        </Badge>
                        {entry.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(entry.client as unknown as { name: string } | null)?.name}
                        {(entry.creative as unknown as { name: string } | null)?.name
                          ? ` · ${(entry.creative as unknown as { name: string }).name}`
                          : ""}
                        {" · "}
                        {new Date(entry.changed_at).toLocaleDateString()}
                      </p>
                      {entry.rationale ? <p className="mt-1 text-xs">Why: {entry.rationale}</p> : null}
                      {entry.expected_outcome ? (
                        <p className="text-xs text-muted-foreground">Expected: {entry.expected_outcome}</p>
                      ) : null}
                      {entry.observed_outcome ? (
                        <p className="mt-1 text-xs">
                          <span className="font-medium">Result:</span> {entry.observed_outcome}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.decision ? (
                        <Badge className="capitalize">{entry.decision}</Badge>
                      ) : (
                        <RecordOutcomeDialog entryId={entry.id} description={entry.description} />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="channel" className="pt-4">
          <ChannelDashboard
            title="Channel totals"
            description="All Meta and Google Ads rows, including any imported at campaign level rather than per creative."
            channels={["meta_ads", "google_ads"]}
            defaultChannel="meta_ads"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
