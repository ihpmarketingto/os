import Link from "next/link";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NewReportDialog, ReportStatusActions } from "./report-dialogs";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  client_review: "secondary",
  internal_review: "secondary",
  draft: "outline",
  archived: "outline",
};

export default async function ReportsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: reports }, { data: clients }] = await Promise.all([
    supabase
      .from("reports")
      .select("id, title, period_start, period_end, status, published_at, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Draft, review internally, send for client review, then publish to the portal. Publishing needs report
            approval permission.
          </p>
        </div>
        <NewReportDialog clients={clients ?? []} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {!reports || reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet. Create the first draft.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{(r.client as unknown as { name: string } | null)?.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.period_start} to {r.period_end}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="capitalize">
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <ReportStatusActions reportId={r.id} status={r.status} />
                        <Button size="sm" variant="outline" nativeButton={false} render={
                          <Link href={`/reports/${r.id}/print`} target="_blank" rel="noopener noreferrer">
                            <FileDown className="mr-1 size-3.5" /> PDF
                          </Link>
                        } />
                      </div>
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
