"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runDraft, type DraftResult } from "./actions";

const initialState: DraftResult = {};

export function DraftForm({
  clients,
  taskTypes,
}: {
  clients: { id: string; name: string; aiEnabled: boolean }[];
  taskTypes: { value: string; label: string }[];
}) {
  const [state, formAction, isPending] = useActionState(runDraft, initialState);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ai-client">Client</Label>
            <select id="ai-client" name="clientId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.aiEnabled ? "" : " (AI disabled)"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-task">Task type</Label>
            <select id="ai-task" name="taskType" required className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              {taskTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-instruction">Instruction</Label>
          <Textarea
            id="ai-instruction"
            name="instruction"
            rows={3}
            required
            placeholder="e.g. Draft the executive summary for this month's report, leading with what the numbers mean for the business."
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            <Sparkles className="mr-1.5 size-4" />
            {isPending ? "Drafting..." : "Generate draft"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Draft mode: nothing is sent or published. Only the summarised context shown in the citations is shared
            with the provider.
          </p>
        </div>
      </form>

      {state.error ? (
        <Card className="border-risk/40 bg-risk/5">
          <CardContent className="py-4 text-sm">{state.error}</CardContent>
        </Card>
      ) : null}

      {state.output ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Draft</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="capitalize">{state.provider}</Badge>
                <span>{state.model}</span>
                <span>est. US${state.estimatedCostUsd?.toFixed(4)}</span>
              </div>
            </div>
            <CardDescription>Internal draft. Review, edit, and move it through the normal approval flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">{state.output}</div>
            {state.citations && state.citations.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sources used ({state.citations.length})
                </p>
                <ul className="space-y-1.5">
                  {state.citations.map((c, i) => (
                    <li key={i} className="rounded-md border px-3 py-2 text-xs">
                      <span className="font-medium">{c.title}</span>
                      <span className="text-muted-foreground">: {c.excerpt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
