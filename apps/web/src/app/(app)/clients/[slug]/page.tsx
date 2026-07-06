import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { computeAndCacheClientHealth } from "@/lib/health/compute-and-cache";
import { AiToggle } from "./ai-toggle";
import { NoteForm } from "./note-form";
import { MeetingForm } from "./meeting-form";

const HEALTH_BAND_CLASS: Record<string, string> = {
  healthy: "bg-success text-white",
  needs_attention: "bg-brand text-brand-foreground",
  at_risk: "bg-risk text-white",
};

export default async function ClientProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*, account_manager:profiles(full_name)")
    .eq("organisation_id", session.organisationId)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (!client) notFound();

  const health = await computeAndCacheClientHealth(supabase, {
    id: client.id,
    status: client.status,
    contract_end_date: client.contract_end_date,
  });

  const [{ data: projects }, { data: tasks }, { data: documents }, { data: content }, { data: notes }, { data: meetings }] =
    await Promise.all([
      supabase.from("projects").select("id, name, status").eq("client_id", client.id).order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, title, status, due_date")
        .eq("client_id", client.id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(10),
      supabase.from("documents").select("id, name, client_visible").eq("client_id", client.id).is("deleted_at", null),
      supabase.from("content_items").select("id, hook, content_type, status").eq("client_id", client.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("notes").select("id, body, created_at").eq("client_id", client.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("meetings").select("id, title, scheduled_at, meeting_type").eq("client_id", client.id).order("scheduled_at", { ascending: false }).limit(5),
    ]);

  const accountManager = client.account_manager as unknown as { full_name: string | null } | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{client.industry ?? "Client"}</p>
          <h1 className="font-heading text-3xl">{client.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{client.status}</Badge>
          <Badge className={HEALTH_BAND_CLASS[health.band]}>Health {health.score}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Account manager</p>
              <p>{accountManager?.full_name ?? "Unassigned"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Website</p>
              <p>{client.website ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Retainer</p>
              <p>{client.retainer_amount ? `$${client.retainer_amount} CAD/mo` : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contract renews</p>
              <p>{client.contract_end_date ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client health</CardTitle>
            <CardDescription>Recalculated on every page load.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {health.explanation.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects ({projects?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!projects || projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                  <span>{p.name}</span>
                  <Badge variant="outline" className="capitalize">{p.status.replace(/_/g, " ")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming and recent tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!tasks || tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                  <span>{t.title}</span>
                  <span className="text-xs text-muted-foreground">{t.due_date ?? "No due date"}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content ({content?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!content || content.length === 0 ? (
              <p className="text-sm text-muted-foreground">No content items yet.</p>
            ) : (
              content.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                  <span>{c.hook ?? c.content_type ?? "Untitled"}</span>
                  <Badge variant="outline" className="capitalize">{c.status.replace(/_/g, " ")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents ({documents?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!documents || documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents yet. Upload from the Documents page.</p>
            ) : (
              documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                  <span>{d.name}</span>
                  <Badge variant={d.client_visible ? "default" : "outline"}>{d.client_visible ? "Client-visible" : "Internal"}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meetings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MeetingForm clientId={client.id} slug={slug} />
            {meetings && meetings.length > 0 ? (
              <ul className="space-y-1.5 border-t pt-3 text-sm">
                {meetings.map((m) => (
                  <li key={m.id} className="flex items-center justify-between">
                    <span>{m.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(m.scheduled_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NoteForm clientId={client.id} slug={slug} />
            {notes && notes.length > 0 ? (
              <ul className="space-y-2 border-t pt-3 text-sm">
                {notes.map((n) => (
                  <li key={n.id} className="text-muted-foreground">
                    {n.body}
                    <span className="ml-2 text-[10px]">{new Date(n.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">AI access</CardTitle>
            <CardDescription>Controls whether this client&rsquo;s data can ever be sent to an AI provider.</CardDescription>
          </div>
          <AiToggle clientId={client.id} slug={slug} enabled={client.ai_enabled} />
        </CardHeader>
      </Card>
    </div>
  );
}
