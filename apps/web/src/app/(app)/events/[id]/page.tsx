import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import {
  buildRunOfShow,
  formatClockTime,
  runOfShowDurationMinutes,
  segmentClockTime,
  sponsorsOwedDelivery,
  summariseSponsors,
  type SponsorRecord,
  type SponsorStatus,
  type SponsorTier,
} from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  AddDeliverableForm,
  AddSegmentDialog,
  AddSponsorDialog,
  DeliverableCheck,
  SegmentCheck,
  SponsorStatusSelect,
} from "./event-controls";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, venue, starts_at, status, client:clients(name)")
    .eq("organisation_id", session.organisationId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) notFound();

  const [{ data: segments }, { data: sponsors }, { data: deliverables }] = await Promise.all([
    supabase
      .from("event_segments")
      .select("*")
      .eq("event_id", id)
      .order("starts_after_minutes", { ascending: true }),
    supabase.from("event_sponsors").select("*").eq("event_id", id).order("cash_amount", { ascending: false }),
    supabase
      .from("event_sponsor_deliverables")
      .select("*")
      .eq("organisation_id", session.organisationId)
      .order("created_at", { ascending: true }),
  ]);

  const deliverablesBySponsor = new Map<string, NonNullable<typeof deliverables>>();
  for (const d of deliverables ?? []) {
    if (!deliverablesBySponsor.has(d.sponsor_id)) deliverablesBySponsor.set(d.sponsor_id, []);
    deliverablesBySponsor.get(d.sponsor_id)!.push(d);
  }

  const runOfShow = buildRunOfShow(
    (segments ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      startsAfterMinutes: s.starts_after_minutes,
      durationMinutes: s.duration_minutes,
      ownerName: s.owner_name,
      completedAt: s.completed_at,
    })),
  );
  const segmentById = new Map((segments ?? []).map((s) => [s.id, s]));
  const eventStart = event.starts_at ? new Date(event.starts_at) : null;

  const sponsorRecords: SponsorRecord[] = (sponsors ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    tier: s.tier as SponsorTier,
    status: s.status as SponsorStatus,
    cashAmount: Number(s.cash_amount),
    inKindDescription: s.in_kind_description,
    deliverables: (deliverablesBySponsor.get(s.id) ?? []).map((d) => ({
      id: d.id,
      deliveredAt: d.delivered_at,
      dueDate: d.due_date,
    })),
  }));
  const sponsorSummary = summariseSponsors(sponsorRecords);
  const owed = sponsorsOwedDelivery(sponsorRecords);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/events" className="flex items-center text-xs text-muted-foreground hover:underline">
          <ChevronLeft className="size-3" /> Events
        </Link>
        <h1 className="font-heading text-2xl">{event.name}</h1>
        <p className="text-sm text-muted-foreground">
          {(event.client as unknown as { name: string } | null)?.name ?? "Agency event"}
          {event.venue ? ` · ${event.venue}` : ""}
          {eventStart ? ` · ${eventStart.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}` : ""}
        </p>
      </div>

      <Tabs defaultValue="run-of-show">
        <TabsList>
          <TabsTrigger value="run-of-show">Run of show ({runOfShow.length})</TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors ({sponsorRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="run-of-show" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {runOfShow.length === 0
                ? "Nothing scheduled yet."
                : `Runs ${formatMinutes(runOfShowDurationMinutes(runOfShow))} end to end.`}
              {eventStart ? "" : " Set a start time on the event to see clock times."}
            </p>
            <AddSegmentDialog eventId={event.id} />
          </div>

          {runOfShow.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Add the first segment. Doors opening is usually a good place to start.
            </p>
          ) : (
            <div className="space-y-1">
              {runOfShow.map((segment) => {
                const raw = segmentById.get(segment.id)!;
                const done = Boolean(segment.completedAt);
                return (
                  <div key={segment.id}>
                    {segment.gapBeforeMinutes > 0 ? (
                      <p className="py-1 pl-4 text-xs text-muted-foreground">
                        {formatMinutes(segment.gapBeforeMinutes)} gap
                      </p>
                    ) : null}
                    <div
                      className={`flex flex-wrap items-start gap-3 rounded-lg border p-3 ${
                        segment.overlapsPrevious ? "border-risk/50" : ""
                      } ${done ? "opacity-60" : ""}`}
                    >
                      <div className="pt-0.5">
                        <SegmentCheck segmentId={segment.id} done={done} />
                      </div>
                      <div className="w-28 shrink-0 text-xs text-muted-foreground">
                        {eventStart ? (
                          <>
                            <span className="font-medium text-foreground">
                              {formatClockTime(segmentClockTime(eventStart, segment.startsAfterMinutes))}
                            </span>
                            <span className="block">
                              to {formatClockTime(segmentClockTime(eventStart, segment.endsAfterMinutes))}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-foreground">+{segment.startsAfterMinutes} min</span>
                            <span className="block">{formatMinutes(segment.durationMinutes)}</span>
                          </>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium ${done ? "line-through" : ""}`}>{segment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {[segment.ownerName, raw.location].filter(Boolean).join(" · ") || "No owner set"}
                        </p>
                        {raw.notes ? <p className="mt-1 text-xs text-muted-foreground">{raw.notes}</p> : null}
                        {segment.overlapsPrevious ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-risk">
                            <AlertTriangle className="size-3" />
                            Overlaps what is already running.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sponsors" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Committed</p>
                <p className="font-heading text-lg">{cad.format(sponsorSummary.committedCash)}</p>
                <p className="text-xs text-muted-foreground">prospects excluded</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="font-heading text-lg">{cad.format(sponsorSummary.collectedCash)}</p>
                <p className="text-xs text-muted-foreground">
                  {cad.format(sponsorSummary.outstandingCash)} outstanding
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deliverables</p>
                <p className="font-heading text-lg">
                  {sponsorSummary.deliverablesDelivered} of {sponsorSummary.deliverablesTotal}
                </p>
              </div>
            </div>
            <AddSponsorDialog eventId={event.id} />
          </div>

          {owed.length > 0 ? (
            <Card className="border-risk/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4 text-risk" />
                  {owed.length} sponsor{owed.length === 1 ? "" : "s"} paid and still owed something
                </CardTitle>
                <CardDescription>
                  They have handed over money and not yet received what they were promised. This is the list that costs
                  the renewal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {owed.map((s) => (
                    <li key={s.id}>
                      {s.name}: {s.deliverables.filter((d) => !d.deliveredAt).length} outstanding
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {sponsorRecords.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No sponsors yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sponsorRecords.map((sponsor) => {
                const raw = (sponsors ?? []).find((s) => s.id === sponsor.id)!;
                const items = deliverablesBySponsor.get(sponsor.id) ?? [];
                return (
                  <Card key={sponsor.id}>
                    <CardContent className="space-y-3 pt-6">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="flex flex-wrap items-center gap-2 font-medium">
                            {sponsor.name}
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {sponsor.tier.replace(/_/g, " ")}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sponsor.cashAmount > 0 ? cad.format(sponsor.cashAmount) : "No cash"}
                            {sponsor.inKindDescription ? ` · in kind: ${sponsor.inKindDescription}` : ""}
                            {raw.contact_name ? ` · ${raw.contact_name}` : ""}
                          </p>
                        </div>
                        <SponsorStatusSelect sponsorId={sponsor.id} status={sponsor.status} />
                      </div>

                      {items.length > 0 ? (
                        <ul className="space-y-1">
                          {items.map((d) => (
                            <li key={d.id} className="flex items-center gap-2 text-sm">
                              <DeliverableCheck deliverableId={d.id} done={Boolean(d.delivered_at)} />
                              <span className={d.delivered_at ? "text-muted-foreground line-through" : ""}>
                                {d.description}
                              </span>
                              {d.due_date && !d.delivered_at ? (
                                <span className="text-xs text-muted-foreground">due {d.due_date}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nothing promised recorded yet.</p>
                      )}

                      <AddDeliverableForm sponsorId={sponsor.id} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
