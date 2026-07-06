import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function TeamSettingsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: members, error } = await supabase
    .from("organisation_members")
    .select("id, status, created_at, profiles(full_name), roles(name, slug), clients(name)")
    .eq("organisation_id", session.organisationId)
    .order("created_at", { ascending: true });

  return (
    <Card>
      <CardContent className="pt-6">
        {error ? (
          <p className="text-sm text-risk">Failed to load team members: {error.message}</p>
        ) : !members || members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members yet. Run the seed script (npm run seed) to create the demo organisation and users.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Client scope</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const profile = member.profiles as unknown as { full_name: string | null } | null;
                const role = member.roles as unknown as { name: string; slug: string } | null;
                const client = member.clients as unknown as { name: string } | null;
                return (
                  <TableRow key={member.id}>
                    <TableCell>{profile?.full_name ?? "—"}</TableCell>
                    <TableCell>{role?.name ?? "—"}</TableCell>
                    <TableCell>{client?.name ?? "All assigned clients"}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === "active" ? "default" : "outline"} className="capitalize">
                        {member.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
