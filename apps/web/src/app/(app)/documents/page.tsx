import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { UploadDocumentDialog } from "./upload-dialog";

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: documents }, { data: clients }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, name, file_type, size_bytes, client_visible, created_at, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Documents and Assets</h1>
          <p className="text-sm text-muted-foreground">Stored in Supabase Storage, downloaded via short-lived signed links.</p>
        </div>
        <UploadDocumentDialog clients={clients ?? []} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {!documents || documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const client = doc.client as unknown as { name: string } | null;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{client?.name ?? "General"}</TableCell>
                      <TableCell>{formatSize(doc.size_bytes)}</TableCell>
                      <TableCell>
                        <Badge variant={doc.client_visible ? "default" : "outline"}>
                          {doc.client_visible ? "Client-visible" : "Internal only"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                        >
                          <Download className="size-3.5" /> Download
                        </a>
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
