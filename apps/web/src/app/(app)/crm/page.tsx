import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PipelineBoard, type DealCardData } from "./pipeline-board";
import { LeadsTable, type LeadRowData } from "./leads-table";
import { NewLeadDialog } from "./new-lead-dialog";

export default async function CrmPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: deals }, { data: leads }] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, stage, value, currency, owner:profiles(full_name)")
      .eq("organisation_id", session.organisationId)
      // Open deals, plus won deals not yet converted to a client — those need
      // to stay visible so the "Convert to client" action is reachable.
      .or("status.eq.open,and(stage.eq.closed_won,client_id.is.null)")
      .order("created_at", { ascending: true }),
    supabase
      .from("leads")
      .select("id, company_name, industry, source, score, status, estimated_value")
      .eq("organisation_id", session.organisationId)
      .order("score", { ascending: false }),
  ]);

  const dealCards: DealCardData[] = (deals ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    value: d.value,
    currency: d.currency,
    ownerName: (d.owner as unknown as { full_name: string | null } | null)?.full_name ?? null,
  }));

  const leadRows: LeadRowData[] = (leads ?? []).map((l) => ({
    id: l.id,
    companyName: l.company_name,
    industry: l.industry,
    source: l.source,
    score: l.score,
    status: l.status,
    estimatedValue: l.estimated_value,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">CRM</h1>
          <p className="text-sm text-muted-foreground">Pipeline and lead intake for the agency.</p>
        </div>
        <NewLeadDialog />
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leadRows.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="pt-4">
          <PipelineBoard deals={dealCards} />
        </TabsContent>
        <TabsContent value="leads" className="pt-4">
          <LeadsTable leads={leadRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
