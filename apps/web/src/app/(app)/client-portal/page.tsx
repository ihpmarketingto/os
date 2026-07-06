import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isClientRole } from "@ihp/types";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ApprovalActions } from "./approval-actions";

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const { client: clientSlugParam } = await searchParams;
  const isPortalUser = isClientRole(session.roleSlug);

  if (!isPortalUser && !clientSlugParam) {
    const { data: clients } = await supabase
      .from("clients")
      .select("slug, name")
      .eq("organisation_id", session.organisationId)
      .order("name");

    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-heading text-2xl">Client Portal</h1>
          <p className="text-sm text-muted-foreground">
            Internal preview: pick a client to see exactly what their portal shows them.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-wrap gap-2 pt-6">
            {(clients ?? []).map((c) => (
              <Link key={c.slug} href={`/client-portal?client=${c.slug}`}>
                <Badge variant="outline" className="cursor-pointer px-3 py-1.5 hover:bg-muted">
                  {c.name}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  let targetClientId = session.clientId;
  let targetClientName: string | null = null;

  if (!isPortalUser && clientSlugParam) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("organisation_id", session.organisationId)
      .eq("slug", clientSlugParam)
      .maybeSingle();
    targetClientId = client?.id ?? null;
    targetClientName = client?.name ?? null;
  }

  if (!targetClientId) {
    return <p className="text-sm text-muted-foreground">No client is associated with your account yet.</p>;
  }

  const [{ data: client }, { data: projects }, { data: rawApprovals }, { data: documents }, { data: meetings }, { data: invoices }] =
    await Promise.all([
      targetClientName ? Promise.resolve({ data: { name: targetClientName } }) : supabase.from("clients").select("name").eq("id", targetClientId).single(),
      supabase.from("projects").select("id, name, status").eq("client_id", targetClientId).eq("client_visible", true),
      // approvals.subject_id is polymorphic (no FK), so the related content
      // item is fetched in a second query rather than a PostgREST embed.
      supabase
        .from("approvals")
        .select("id, status, requested_at, subject_type, subject_id")
        .eq("client_id", targetClientId)
        .eq("status", "pending"),
      supabase.from("documents").select("id, name").eq("client_id", targetClientId).eq("client_visible", true).is("deleted_at", null),
      supabase.from("meetings").select("id, title, scheduled_at").eq("client_id", targetClientId).eq("client_visible", true).order("scheduled_at", { ascending: false }).limit(5),
      // RLS restricts portal members to non-draft invoices; the status filter
      // here is belt-and-braces for internal preview mode.
      supabase
        .from("invoices")
        .select("id, number, amount, tax_amount, status, due_date")
        .eq("client_id", targetClientId)
        .neq("status", "draft")
        .is("deleted_at", null)
        .order("issue_date", { ascending: false })
        .limit(10),
    ]);

  const contentApprovalIds = (rawApprovals ?? [])
    .filter((a) => a.subject_type === "content_item")
    .map((a) => a.subject_id);
  const { data: approvalContent } = contentApprovalIds.length
    ? await supabase.from("content_items").select("id, hook, content_type, caption").in("id", contentApprovalIds)
    : { data: [] as { id: string; hook: string | null; content_type: string | null; caption: string | null }[] };
  const contentById = new Map((approvalContent ?? []).map((c) => [c.id, c]));

  const pendingApprovals = (rawApprovals ?? [])
    .map((a) => ({ ...a, content: contentById.get(a.subject_id) ?? null }))
    .filter((a) => a.subject_type !== "content_item" || a.content !== null);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Client Portal</p>
        <h1 className="font-heading text-2xl">{client?.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Awaiting your approval</CardTitle>
          <CardDescription>Approve or request changes. The internal team is notified either way.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting on you right now.</p>
          ) : (
            pendingApprovals.map((a) => {
              const content = a.content;
              if (!content) return null;
              return (
                <div key={a.id} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{content.hook ?? content.content_type ?? "Content"}</p>
                  {content.caption ? <p className="mt-1 text-sm text-muted-foreground">{content.caption}</p> : null}
                  <div className="mt-2">
                    <ApprovalActions approvalId={a.id} contentId={content.id} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
          <CardDescription>Questions about an invoice? Reply to your account manager or submit a request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!invoices || invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{inv.number}</span>
                <span>
                  {new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
                    Number(inv.amount) + Number(inv.tax_amount),
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{inv.due_date ? `Due ${inv.due_date}` : ""}</span>
                <Badge
                  variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "outline"}
                  className="capitalize"
                >
                  {inv.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!projects || projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shared projects yet.</p>
            ) : (
              projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <Badge variant="outline" className="capitalize">{p.status.replace(/_/g, " ")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!documents || documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing shared yet.</p>
            ) : (
              documents.map((d) => (
                <a key={d.id} href={`/api/documents/${d.id}/download`} className="block text-sm text-brand hover:underline">
                  {d.name}
                </a>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meetings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!meetings || meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings shared yet.</p>
            ) : (
              meetings.map((m) => (
                <div key={m.id} className="text-sm">
                  <p>{m.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.scheduled_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
