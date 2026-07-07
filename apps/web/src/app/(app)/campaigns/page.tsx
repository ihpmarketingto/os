import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NewCampaignDialog } from "./new-campaign-dialog";
import { CampaignStatusSelect } from "./campaign-status-select";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export default async function CampaignsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: campaigns }, { data: clients }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, client_id, name, objective, channels, budget, start_date, end_date, status, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Every campaign from planning to archive. Channel metrics attach via CSV import on the channel pages.
          </p>
        </div>
        <NewCampaignDialog clients={clients ?? []} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {!campaigns || campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet. Create the first one to start planning.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.name}</p>
                      {c.objective ? <p className="text-xs text-muted-foreground">{c.objective}</p> : null}
                    </TableCell>
                    <TableCell>{(c.client as unknown as { name: string } | null)?.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.channels.map((channel) => (
                          <Badge key={channel} variant="outline" className="text-[10px]">
                            {channel.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{c.budget ? cad.format(Number(c.budget)) : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.start_date ?? "?"} to {c.end_date ?? "?"}
                    </TableCell>
                    <TableCell>
                      <CampaignStatusSelect campaignId={c.id} clientId={c.client_id} status={c.status} />
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
