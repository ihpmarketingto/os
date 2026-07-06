import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const HEALTH_VARIANT: Record<string, string> = {
  healthy: "bg-success text-white",
  needs_attention: "bg-brand text-brand-foreground",
  at_risk: "bg-risk text-white",
};

export default async function ClientsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, slug, industry, status, health_score, account_manager:profiles(full_name)")
    .eq("organisation_id", session.organisationId)
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Clients</h1>
        <p className="text-sm text-muted-foreground">Every client this organisation is delivering for.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!clients || clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clients yet. Convert a closed-won deal from CRM to create your first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Account manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => {
                  const am = c.account_manager as unknown as { full_name: string | null } | null;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link href={`/clients/${c.slug}`} className="hover:underline">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>{c.industry ?? "—"}</TableCell>
                      <TableCell>{am?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {c.health_score !== null ? (
                          <Badge className={HEALTH_VARIANT[c.health_score >= 75 ? "healthy" : c.health_score >= 50 ? "needs_attention" : "at_risk"]}>
                            {c.health_score}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not yet scored</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
