import { AlertTriangle, Lock } from "lucide-react";
import { entriesNeedingReview, KNOWLEDGE_KINDS, type KnowledgeEntry, type KnowledgeKind } from "@ihp/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NewEntryDialog, ReviewButton, StatusSelect } from "./knowledge-controls";

const KIND_LABEL: Record<KnowledgeKind, string> = {
  sop: "SOP",
  playbook: "Playbook",
  brand_voice: "Brand voice",
  offer: "Offer",
  icp: "ICP",
  objection: "Objection",
  winning_pattern: "Winning pattern",
  positioning: "Positioning",
  policy: "Policy",
  faq: "FAQ",
};

export default async function KnowledgePage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: rows }, { data: clients }] = await Promise.all([
    supabase
      .from("knowledge_entries")
      .select("*, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const entries = rows ?? [];
  const asKnowledge: KnowledgeEntry[] = entries.map((e) => ({
    id: e.id,
    clientId: e.client_id,
    kind: e.kind,
    title: e.title,
    body: e.body,
    summary: e.summary,
    tags: e.tags,
    confidentiality: e.confidentiality,
    status: e.status,
    reviewDueOn: e.review_due_on,
    updatedAt: e.updated_at,
  }));

  const now = new Date();
  const staleIds = new Set(entriesNeedingReview(asKnowledge, now).map((e) => e.id));
  const active = entries.filter((e) => e.status === "active");
  const drafts = entries.filter((e) => e.status === "draft");
  const confidentialCount = entries.filter((e) => e.confidentiality === "client_confidential").length;

  const byKind = new Map<KnowledgeKind, typeof entries>();
  for (const e of active) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, []);
    byKind.get(e.kind)!.push(e);
  }

  const entryCard = (e: (typeof entries)[number]) => {
    const clientName = (e.client as unknown as { name: string } | null)?.name;
    const stale = staleIds.has(e.id);
    return (
      <Card key={e.id} className={stale ? "border-risk/40" : ""}>
        <CardContent className="space-y-2 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {e.title}
                <Badge variant="outline" className="text-[10px]">
                  {KIND_LABEL[e.kind as KnowledgeKind]}
                </Badge>
                {e.confidentiality === "client_confidential" ? (
                  <Badge variant="outline" className="border-risk/40 text-[10px] text-risk">
                    <Lock className="mr-0.5 size-2.5" /> {clientName} only
                  </Badge>
                ) : clientName ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {clientName}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Every client
                  </Badge>
                )}
              </p>
              {e.summary ? <p className="text-sm text-muted-foreground">{e.summary}</p> : null}
              {e.tags.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">{e.tags.join(" · ")}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <StatusSelect entryId={e.id} status={e.status} />
              {stale ? <ReviewButton entryId={e.id} /> : null}
            </div>
          </div>
          {stale ? (
            <p className="flex items-center gap-1.5 text-xs text-risk">
              <AlertTriangle className="size-3" />
              Past its review date of {e.review_due_on}. Still used, but the AI is told not to state it as current.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">Knowledge</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            What IHP knows: how the work is done, what the offers are, who they are for, and what has actually worked.
            Every AI draft reads from here first, so this is where your experience gets reused instead of retyped.
          </p>
        </div>
        <NewEntryDialog clients={clients ?? []} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="font-heading text-2xl">{active.length}</p>
            <p className="text-xs text-muted-foreground">readable by AI</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Drafts</p>
            <p className="font-heading text-2xl">{drafts.length}</p>
            <p className="text-xs text-muted-foreground">not used until active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Client confidential</p>
            <p className="font-heading text-2xl">{confidentialCount}</p>
            <p className="text-xs text-muted-foreground">never cross a client boundary</p>
          </CardContent>
        </Card>
        <Card className={staleIds.size > 0 ? "border-risk/40" : ""}>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Needs review</p>
            <p className="font-heading text-2xl">{staleIds.size}</p>
            <p className="text-xs text-muted-foreground">out of date is worse than absent</p>
          </CardContent>
        </Card>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nothing here yet</CardTitle>
            <CardDescription>
              Until this has something in it, every AI draft is written by a competent stranger. Start with the three
              that change the most: how you sound, what you sell, and who it is for.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
            {staleIds.size > 0 ? <TabsTrigger value="review">Needs review ({staleIds.size})</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="all" className="space-y-6 pt-4">
            {KNOWLEDGE_KINDS.filter((kind) => byKind.has(kind)).map((kind) => (
              <div key={kind} className="space-y-2">
                <h2 className="font-heading text-lg">{KIND_LABEL[kind]}</h2>
                <div className="space-y-2">{byKind.get(kind)!.map(entryCard)}</div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="drafts" className="space-y-2 pt-4">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts.</p>
            ) : (
              drafts.map(entryCard)
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-2 pt-4">
            {entries.filter((e) => staleIds.has(e.id)).map(entryCard)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
