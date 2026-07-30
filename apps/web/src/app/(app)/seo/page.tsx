import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  gbpActionRate,
  gbpActions,
  strikingDistance,
  summariseRankings,
  type KeywordSnapshot,
} from "@ihp/types";
import { ChannelDashboard } from "@/components/marketing/channel-dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AddKeywordDialog, GbpDialog, ImportRankingsDialog } from "./seo-dialogs";

/** How far back the "previous" reading is taken from for movement. */
const COMPARISON_WINDOW_DAYS = 30;

function MovementCell({ places }: { places: number | null }) {
  if (places === null) return <span className="text-xs text-muted-foreground">-</span>;
  if (places === 0)
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" /> Level
      </span>
    );
  const gained = places > 0;
  return (
    <span className={`flex items-center gap-1 text-xs ${gained ? "text-success" : "text-risk"}`}>
      {gained ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(places)}
    </span>
  );
}

export default async function SeoPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - COMPARISON_WINDOW_DAYS);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const [{ data: clients }, { data: keywords }, { data: readings }, { data: gbp }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("seo_keywords")
      .select("id, keyword, location, intent, search_volume, difficulty, is_priority, target_url, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("is_priority", { ascending: false })
      .order("keyword"),
    supabase
      .from("seo_rankings")
      .select("keyword_id, recorded_on, position, ranking_url")
      .eq("organisation_id", session.organisationId)
      .order("recorded_on", { ascending: false }),
    supabase
      .from("gbp_metrics")
      .select("*, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .order("period_end", { ascending: false })
      .limit(12),
  ]);

  // Readings arrive newest first, so the first hit per keyword is the current
  // one and the first at or before the cutoff is what it is compared against.
  const current = new Map<string, { position: number | null; recordedOn: string; url: string | null }>();
  const previous = new Map<string, { position: number | null; recordedOn: string }>();
  for (const r of readings ?? []) {
    if (!current.has(r.keyword_id)) {
      current.set(r.keyword_id, { position: r.position, recordedOn: r.recorded_on, url: r.ranking_url });
    } else if (!previous.has(r.keyword_id) && r.recorded_on <= cutoffDate) {
      previous.set(r.keyword_id, { position: r.position, recordedOn: r.recorded_on });
    }
  }

  const snapshots: KeywordSnapshot[] = (keywords ?? []).map((k) => {
    const now = current.get(k.id);
    const before = previous.get(k.id);
    return {
      keywordId: k.id,
      keyword: k.keyword,
      searchVolume: k.search_volume,
      current: now ? { position: now.position, recordedOn: now.recordedOn } : null,
      previous: before ? { position: before.position, recordedOn: before.recordedOn } : null,
    };
  });

  const summary = summariseRankings(snapshots);
  const opportunities = strikingDistance(snapshots).slice(0, 8);
  const byId = new Map((keywords ?? []).map((k) => [k.id, k]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">SEO</h1>
          <p className="text-sm text-muted-foreground">
            Tracked keywords and their movement, local performance, and organic traffic from Search Console exports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddKeywordDialog clients={clients ?? []} />
          <ImportRankingsDialog clients={clients ?? []} />
          <GbpDialog clients={clients ?? []} />
        </div>
      </div>

      <Tabs defaultValue="keywords">
        <TabsList>
          <TabsTrigger value="keywords">Keywords ({summary.tracked})</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="local">Local ({(gbp ?? []).length})</TabsTrigger>
          <TabsTrigger value="traffic">Organic traffic</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Average position</p>
                <p className="font-heading text-2xl">
                  {summary.averagePosition === null ? "No data yet" : summary.averagePosition.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  over {summary.ranking} ranking of {summary.tracked} tracked
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Page one</p>
                <p className="font-heading text-2xl">{summary.topTen}</p>
                <p className="text-xs text-muted-foreground">{summary.topThree} in the top three</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Net movement</p>
                <p className="font-heading text-2xl">
                  {summary.netPlacesGained > 0 ? "+" : ""}
                  {summary.netPlacesGained}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.gained} up, {summary.lost} down over {COMPARISON_WINDOW_DAYS} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Visibility</p>
                <p className="font-heading text-2xl">
                  {summary.visibility === null ? "No volumes set" : `${(summary.visibility * 100).toFixed(1)}%`}
                </p>
                <p className="text-xs text-muted-foreground">volume-weighted click share estimate</p>
              </CardContent>
            </Card>
          </div>

          {summary.notRanking > 0 || summary.unmeasured > 0 ? (
            <p className="text-xs text-muted-foreground">
              {summary.notRanking} checked and not ranking, {summary.unmeasured} never measured. Neither is counted in
              the average position, since scoring them as zero would flatter it and scoring them as one hundred would
              bury it.
            </p>
          ) : null}

          <Card>
            <CardContent className="pt-6">
              {snapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No keywords tracked yet. Add the terms that actually bring enquiries, then import a rankings export.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>{COMPARISON_WINDOW_DAYS}-day move</TableHead>
                      <TableHead>Ranking URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.map((s) => {
                      const keyword = byId.get(s.keywordId)!;
                      const now = current.get(s.keywordId);
                      const before = s.previous?.position ?? null;
                      const nowPosition = s.current?.position ?? null;
                      const move = before !== null && nowPosition !== null ? before - nowPosition : null;
                      return (
                        <TableRow key={s.keywordId}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{keyword.keyword}</span>
                              {keyword.is_priority ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Priority
                                </Badge>
                              ) : null}
                            </div>
                            {keyword.location ? (
                              <p className="text-xs text-muted-foreground">{keyword.location}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs">
                            {(keyword.client as unknown as { name: string } | null)?.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {keyword.search_volume ?? "-"}
                          </TableCell>
                          <TableCell>
                            {!s.current ? (
                              <span className="text-xs text-muted-foreground">Not measured</span>
                            ) : nowPosition === null ? (
                              <span className="text-xs text-muted-foreground">Not ranking</span>
                            ) : (
                              <span className="font-medium">{nowPosition}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <MovementCell places={move} />
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                            {now?.url ?? "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Striking distance</CardTitle>
              <CardDescription>
                Ranking between four and twenty, ordered by the traffic that reaching the top three would unlock. The
                click estimates are a prioritisation model, not a forecast to put in front of a client.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing in striking distance yet. Import a rankings export to populate this.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Target page</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunities.map((o) => {
                      const keyword = byId.get(o.keywordId)!;
                      return (
                        <TableRow key={o.keywordId}>
                          <TableCell className="font-medium">{o.keyword}</TableCell>
                          <TableCell>{o.current?.position}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{o.searchVolume ?? "-"}</TableCell>
                          <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {keyword.target_url ?? "No target page set"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="local" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Business Profile</CardTitle>
              <CardDescription>Calls, directions, clicks and bookings are the actions that reach the business.</CardDescription>
            </CardHeader>
            <CardContent>
              {!gbp || gbp.length === 0 ? (
                <p className="text-sm text-muted-foreground">No GBP periods recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead>Action rate</TableHead>
                      <TableHead>Reviews</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gbp.map((g) => {
                      const period = {
                        profileViews: g.profile_views,
                        searchImpressions: g.search_impressions,
                        calls: g.calls,
                        directionRequests: g.direction_requests,
                        websiteClicks: g.website_clicks,
                        bookings: g.bookings,
                      };
                      const rate = gbpActionRate(period);
                      return (
                        <TableRow key={g.id}>
                          <TableCell>{(g.client as unknown as { name: string } | null)?.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {g.period_start} to {g.period_end}
                          </TableCell>
                          <TableCell>{g.profile_views.toLocaleString("en-CA")}</TableCell>
                          <TableCell>
                            {gbpActions(period).toLocaleString("en-CA")}
                            <span className="block text-xs text-muted-foreground">
                              {g.calls} calls, {g.direction_requests} directions, {g.website_clicks} clicks
                            </span>
                          </TableCell>
                          <TableCell>{rate === null ? "No views" : `${(rate * 100).toFixed(1)}%`}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {g.average_rating ? `${g.average_rating} stars` : "-"}
                            {g.new_reviews ? <span className="block">+{g.new_reviews} new</span> : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="pt-4">
          <ChannelDashboard
            title="Organic traffic"
            description="Sessions, conversions and revenue from Search Console and GA4 exports. Spend stays zero for organic rows."
            channels={["seo"]}
            defaultChannel="seo"
            hideHeading
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
