import { AlertTriangle, ArrowDown, Mail, MessageSquare } from "lucide-react";
import {
  cumulativeDelayHours,
  flagSteps,
  formatDelay,
  stepPerformance,
  stepReach,
  summariseFlow,
  type FlowStep,
} from "@ihp/types";
import { ChannelDashboard } from "@/components/marketing/channel-dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AddStepDialog, FlowStatusSelect, NewFlowDialog, StepStatsDialog } from "./flow-dialogs";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

function pct(value: number | null, digits = 1): string {
  return value === null ? "-" : `${(value * 100).toFixed(digits)}%`;
}

export default async function EmailLifecyclePage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: flows }, { data: steps }, { data: clients }] = await Promise.all([
    supabase
      .from("email_flows")
      .select("id, name, flow_type, status, trigger_description, goal, platform, entered, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("email_flow_steps")
      .select("*")
      .eq("organisation_id", session.organisationId)
      .order("step_index", { ascending: true }),
    supabase
      .from("clients")
      .select("id, name")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  type StepRow = NonNullable<typeof steps>[number];

  const stepsByFlow = new Map<string, StepRow[]>();
  for (const step of steps ?? []) {
    if (!stepsByFlow.has(step.flow_id)) stepsByFlow.set(step.flow_id, []);
    stepsByFlow.get(step.flow_id)!.push(step);
  }

  const toFlowStep = (s: StepRow): FlowStep => ({
    stepIndex: s.step_index,
    name: s.name,
    channel: s.channel,
    delayHours: s.delay_hours,
    sent: s.sent,
    delivered: s.delivered,
    opens: s.opens,
    clicks: s.clicks,
    unsubscribes: s.unsubscribes,
    conversions: s.conversions,
    revenue: Number(s.revenue),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">Email and Lifecycle</h1>
          <p className="text-sm text-muted-foreground">
            The flows a contact walks through, what each step is for, and how it performs. Click rate is the measure
            here: opens are inflated by mail privacy features and are kept for trend only.
          </p>
        </div>
        <NewFlowDialog clients={clients ?? []} />
      </div>

      <Tabs defaultValue="flows">
        <TabsList>
          <TabsTrigger value="flows">Flows ({(flows ?? []).length})</TabsTrigger>
          <TabsTrigger value="broadcasts">Broadcast performance</TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="space-y-4 pt-4">
          {!flows || flows.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No flows mapped yet. Start with the one that runs after an enquiry comes in.
            </p>
          ) : (
            flows.map((flow) => {
              const rawSteps = stepsByFlow.get(flow.id) ?? [];
              const flowSteps = rawSteps.map(toFlowStep);
              const summary = summariseFlow(flowSteps, flow.entered);
              const reach = new Map(stepReach(flowSteps).map((r) => [r.stepIndex, r]));
              const flagsByStep = new Map<number, string[]>();
              for (const flag of flagSteps(flowSteps)) {
                if (!flagsByStep.has(flag.stepIndex)) flagsByStep.set(flag.stepIndex, []);
                flagsByStep.get(flag.stepIndex)!.push(flag.reason);
              }

              return (
                <Card key={flow.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                          {flow.name}
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {flow.flow_type.replace(/_/g, " ")}
                          </Badge>
                          {flow.platform ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {flow.platform}
                            </Badge>
                          ) : null}
                        </CardTitle>
                        <CardDescription>
                          {(flow.client as unknown as { name: string } | null)?.name}
                          {flow.trigger_description ? ` · Enters on: ${flow.trigger_description}` : ""}
                          {flow.goal ? ` · Goal: ${flow.goal}` : ""}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <FlowStatusSelect flowId={flow.id} status={flow.status} />
                        <AddStepDialog flowId={flow.id} flowName={flow.name} />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <p className="text-xs text-muted-foreground">Steps</p>
                        <p className="font-heading text-lg">{summary.steps}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Runs over</p>
                        <p className="font-heading text-lg">{formatDelay(summary.totalDurationHours)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Click rate</p>
                        <p className="font-heading text-lg">
                          {summary.clickRate === null ? "No data" : pct(summary.clickRate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Unsubscribe rate</p>
                        <p className="font-heading text-lg">
                          {summary.unsubscribeRate === null ? "No data" : pct(summary.unsubscribeRate, 2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Value per entry</p>
                        <p className="font-heading text-lg">
                          {summary.revenuePerEntry === null ? "No entries yet" : cad.format(summary.revenuePerEntry)}
                        </p>
                      </div>
                    </div>

                    {rawSteps.length === 0 ? (
                      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No steps yet. Add the first message that goes out.
                      </p>
                    ) : (
                      <ol className="space-y-0">
                        {rawSteps.map((raw, position) => {
                          const step = flowSteps[position]!;
                          const performance = stepPerformance(step);
                          const stepReachInfo = reach.get(step.stepIndex);
                          const stepFlags = flagsByStep.get(step.stepIndex) ?? [];
                          return (
                            <li key={raw.id}>
                              {position > 0 ? (
                                <div className="flex items-center gap-2 py-1 pl-4 text-xs text-muted-foreground">
                                  <ArrowDown className="size-3" />
                                  wait {formatDelay(step.delayHours)}
                                </div>
                              ) : null}
                              <div className="rounded-lg border p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {step.channel === "sms" ? (
                                        <MessageSquare className="size-3.5 text-muted-foreground" />
                                      ) : (
                                        <Mail className="size-3.5 text-muted-foreground" />
                                      )}
                                      <span className="font-medium">{step.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDelay(cumulativeDelayHours(flowSteps, step.stepIndex))} after entry
                                      </span>
                                    </div>
                                    {raw.subject ? (
                                      <p className="truncate text-xs text-muted-foreground">Subject: {raw.subject}</p>
                                    ) : null}
                                    {raw.purpose ? <p className="text-xs text-muted-foreground">{raw.purpose}</p> : null}
                                  </div>
                                  <StepStatsDialog stepId={raw.id} stepName={step.name} />
                                </div>

                                {step.delivered > 0 ? (
                                  <div className="mt-2 grid gap-2 border-t pt-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                                    <div>
                                      <span className="text-muted-foreground">Delivered</span>
                                      <p className="font-medium">{step.delivered.toLocaleString("en-CA")}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Click rate</span>
                                      <p className="font-medium">{pct(performance.clickRate)}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Click to open</span>
                                      <p className="font-medium">{pct(performance.clickToOpenRate)}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Unsubscribes</span>
                                      <p className="font-medium">{pct(performance.unsubscribeRate, 2)}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Reaches</span>
                                      <p className="font-medium">
                                        {stepReachInfo?.shareOfFirst == null
                                          ? "-"
                                          : pct(stepReachInfo.shareOfFirst, 0)}
                                        <span className="text-muted-foreground"> of step one</span>
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Revenue</span>
                                      <p className="font-medium">{cad.format(step.revenue)}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                                    No performance recorded for this step yet.
                                  </p>
                                )}

                                {raw.stats_period_start ? (
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    Figures cover {raw.stats_period_start} to {raw.stats_period_end}.
                                  </p>
                                ) : null}

                                {stepFlags.length > 0 ? (
                                  <ul className="mt-2 space-y-1">
                                    {stepFlags.map((reason) => (
                                      <li key={reason} className="flex items-start gap-1.5 text-xs text-risk">
                                        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                                        {reason}
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="broadcasts" className="pt-4">
          <ChannelDashboard
            title="Broadcast and campaign email"
            description="One-off sends imported from the platform export. Flows are mapped on the other tab."
            channels={["email"]}
            defaultChannel="email"
            hideHeading
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
