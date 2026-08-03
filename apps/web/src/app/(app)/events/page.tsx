import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EventStatusSelect, NewEventDialog, TicketSalesDialog } from "./event-dialogs";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export default async function EventsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: events }, { data: clients }] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, venue, starts_at, status, target_attendance, tickets_sold, ticket_revenue, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("starts_at", { ascending: true }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Events</h1>
          <p className="text-sm text-muted-foreground">Ticketed and promotional events with sales tracking.</p>
        </div>
        <NewEventDialog clients={clients ?? []} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {!events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link href={`/events/${e.id}`} className="font-medium hover:underline">
                        {e.name}
                      </Link>
                      {e.venue ? <p className="text-xs text-muted-foreground">{e.venue}</p> : null}
                    </TableCell>
                    <TableCell>{(e.client as unknown as { name: string } | null)?.name ?? "Agency"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.starts_at ? new Date(e.starts_at).toLocaleString() : "TBC"}
                    </TableCell>
                    <TableCell>
                      {e.tickets_sold}
                      {e.target_attendance ? ` / ${e.target_attendance}` : ""}
                    </TableCell>
                    <TableCell>{cad.format(Number(e.ticket_revenue))}</TableCell>
                    <TableCell>
                      <EventStatusSelect eventId={e.id} status={e.status} />
                    </TableCell>
                    <TableCell>
                      <TicketSalesDialog eventId={e.id} name={e.name} sold={e.tickets_sold} revenue={Number(e.ticket_revenue)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
