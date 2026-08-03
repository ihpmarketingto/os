import { Clock } from "lucide-react";
import { pitchesDueFollowUp, summarisePitches, type PitchRecord, type PitchStatus } from "@ihp/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { InfluencerStatusSelect, NewInfluencerDialog, NewMediaContactDialog } from "./pr-dialogs";
import { FollowUpButton, NewPitchDialog, PitchStatusControl, PlacementDialog } from "./pitch-controls";

export default async function PrInfluencersPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: influencers }, { data: mediaContacts }, { data: clients }, { data: pitches }] = await Promise.all([
    supabase
      .from("influencers")
      .select("id, name, handle, platform, followers, email, status, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("media_contacts")
      .select("id, name, outlet, beat, email")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("name"),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
    supabase
      .from("outreach")
      .select(
        "id, subject, angle, status, sent_at, follow_up_at, follow_up_count, placement_url, placement_outlet, placement_reach, placement_published_at, contact_type, client:clients(name), media_contact:media_contacts(name, outlet), influencer:influencers(name, handle)",
      )
      .eq("organisation_id", session.organisationId)
      .order("created_at", { ascending: false }),
  ]);

  const pitchRows = pitches ?? [];
  const records: PitchRecord[] = pitchRows.map((p) => ({
    id: p.id,
    status: p.status as PitchStatus,
    sentAt: p.sent_at,
    followUpAt: p.follow_up_at,
    followUpCount: p.follow_up_count,
    placementUrl: p.placement_url,
    placementReach: p.placement_reach,
  }));

  const now = new Date();
  const pitchSummary = summarisePitches(records);
  const dueIds = new Map(pitchesDueFollowUp(records, now).map((d) => [d.pitch.id, d.daysSinceSent]));
  const byId = new Map(pitchRows.map((p) => [p.id, p]));

  const contactLabel = (p: (typeof pitchRows)[number]): string => {
    const media = p.media_contact as unknown as { name: string; outlet: string | null } | null;
    const creator = p.influencer as unknown as { name: string; handle: string | null } | null;
    if (media) return media.outlet ? `${media.name}, ${media.outlet}` : media.name;
    if (creator) return creator.handle ? `${creator.name} (${creator.handle})` : creator.name;
    return "Unknown contact";
  };

  const pitchTable = (rows: typeof pitchRows) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pitch</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <p className="font-medium">{p.subject}</p>
              {p.angle ? <p className="max-w-[22rem] truncate text-xs text-muted-foreground">{p.angle}</p> : null}
            </TableCell>
            <TableCell className="text-xs">{contactLabel(p)}</TableCell>
            <TableCell className="text-xs">
              {(p.client as unknown as { name: string } | null)?.name ?? "Agency"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {p.sent_at ? new Date(p.sent_at).toLocaleDateString("en-CA", { dateStyle: "medium" }) : "Not sent"}
              {p.follow_up_count > 0 ? (
                <span className="block">
                  chased {p.follow_up_count} time{p.follow_up_count === 1 ? "" : "s"}
                </span>
              ) : null}
            </TableCell>
            <TableCell>
              <PitchStatusControl pitchId={p.id} status={p.status as PitchStatus} />
            </TableCell>
            <TableCell>
              {p.placement_url ? (
                <a
                  href={p.placement_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand hover:underline"
                >
                  {p.placement_outlet ?? "View piece"}
                  {p.placement_reach ? (
                    <span className="block text-muted-foreground">
                      {p.placement_reach.toLocaleString("en-CA")} reach
                    </span>
                  ) : (
                    <span className="block text-muted-foreground">reach not stated</span>
                  )}
                </a>
              ) : p.status === "responded" || p.status === "sent" ? (
                <PlacementDialog pitchId={p.id} subject={p.subject} />
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">PR, Influencers and Partnerships</h1>
          <p className="text-sm text-muted-foreground">
            Pitches and who they went to, with the chase queue and what actually ran.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewPitchDialog
            clients={clients ?? []}
            mediaContacts={(mediaContacts ?? []).map((m) => ({
              id: m.id,
              name: m.outlet ? `${m.name}, ${m.outlet}` : m.name,
            }))}
            influencers={(influencers ?? []).map((i) => ({ id: i.id, name: i.name }))}
          />
          <NewInfluencerDialog clients={clients ?? []} />
          <NewMediaContactDialog />
        </div>
      </div>

      <Tabs defaultValue="pitches">
        <TabsList>
          <TabsTrigger value="pitches">Pitches ({pitchRows.length})</TabsTrigger>
          <TabsTrigger value="creators">Creators ({(influencers ?? []).length})</TabsTrigger>
          <TabsTrigger value="media">Media contacts ({(mediaContacts ?? []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pitches" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="font-heading text-2xl">{pitchSummary.sent}</p>
                <p className="text-xs text-muted-foreground">{pitchSummary.drafted} still drafted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Response rate</p>
                <p className="font-heading text-2xl">
                  {pitchSummary.responseRate === null
                    ? "No data yet"
                    : `${Math.round(pitchSummary.responseRate * 100)}%`}
                </p>
                <p className="text-xs text-muted-foreground">a decline counts as a reply</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Placements</p>
                <p className="font-heading text-2xl">{pitchSummary.placements}</p>
                <p className="text-xs text-muted-foreground">
                  {pitchSummary.placementRate === null
                    ? "nothing sent yet"
                    : `${Math.round(pitchSummary.placementRate * 100)}% of pitches sent`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Stated reach</p>
                <p className="font-heading text-2xl">{pitchSummary.knownReach.toLocaleString("en-CA")}</p>
                <p className="text-xs text-muted-foreground">
                  {pitchSummary.placementsWithUnknownReach > 0
                    ? `${pitchSummary.placementsWithUnknownReach} placement${
                        pitchSummary.placementsWithUnknownReach === 1 ? "" : "s"
                      } with no figure given`
                    : "every placement reported one"}
                </p>
              </CardContent>
            </Card>
          </div>

          {dueIds.size > 0 ? (
            <Card className="border-brand/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="size-4 text-brand" />
                  {dueIds.size} pitch{dueIds.size === 1 ? "" : "es"} to chase
                </CardTitle>
                <CardDescription>
                  Sent, no reply, and past the wait. Longest waiting first. Nothing is chased more than twice.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pitch</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Waiting</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...dueIds.entries()].map(([id, days]) => {
                      const p = byId.get(id)!;
                      return (
                        <TableRow key={id}>
                          <TableCell className="font-medium">{p.subject}</TableCell>
                          <TableCell className="text-xs">{contactLabel(p)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{days} days</TableCell>
                          <TableCell>
                            <FollowUpButton pitchId={id} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="pt-6">
              {pitchRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pitches logged yet. Add your media contacts first, then pitch them.
                </p>
              ) : (
                pitchTable(pitchRows)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="creators" className="pt-4">
          {!influencers || influencers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No creators on the roster yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {influencers.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <p className="font-medium">{i.name}</p>
                      {i.handle ? <p className="text-xs text-muted-foreground">{i.handle}</p> : null}
                    </TableCell>
                    <TableCell>{i.platform ?? "—"}</TableCell>
                    <TableCell>{i.followers ? i.followers.toLocaleString("en-CA") : "—"}</TableCell>
                    <TableCell>{(i.client as unknown as { name: string } | null)?.name ?? "Agency-wide"}</TableCell>
                    <TableCell>
                      <InfluencerStatusSelect influencerId={i.id} status={i.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
        <TabsContent value="media" className="pt-4">
          {!mediaContacts || mediaContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No media contacts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Beat</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mediaContacts.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.outlet ?? "—"}</TableCell>
                    <TableCell>{m.beat ?? "—"}</TableCell>
                    <TableCell>{m.email ?? "—"}</TableCell>
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
