import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuditLogPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: entries, error } = await supabase
    .from("audit_logs")
    .select("id, action, resource, resource_id, actor_type, created_at, metadata")
    .eq("organisation_id", session.organisationId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Append-only. Every create, update, delete, export, AI retrieval and external action is recorded here and
          cannot be edited or deleted from the app.
        </p>
        {error ? (
          <p className="text-sm text-risk">Failed to load audit log: {error.message}</p>
        ) : !entries || entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{entry.actor_type}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{entry.action}</TableCell>
                  <TableCell>
                    {entry.resource}
                    {entry.resource_id ? <span className="text-muted-foreground"> · {entry.resource_id.slice(0, 8)}</span> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
