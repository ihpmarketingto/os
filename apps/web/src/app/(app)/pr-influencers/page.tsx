import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { InfluencerStatusSelect, NewInfluencerDialog, NewMediaContactDialog } from "./pr-dialogs";

export default async function PrInfluencersPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: influencers }, { data: mediaContacts }, { data: clients }] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">PR, Influencers and Partnerships</h1>
          <p className="text-sm text-muted-foreground">Creator roster and media list. Pitch tracking builds on these.</p>
        </div>
        <div className="flex gap-2">
          <NewInfluencerDialog clients={clients ?? []} />
          <NewMediaContactDialog />
        </div>
      </div>

      <Tabs defaultValue="creators">
        <TabsList>
          <TabsTrigger value="creators">Creators ({(influencers ?? []).length})</TabsTrigger>
          <TabsTrigger value="media">Media contacts ({(mediaContacts ?? []).length})</TabsTrigger>
        </TabsList>
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
