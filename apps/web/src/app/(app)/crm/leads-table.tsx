"use client";

import { useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { convertLeadToDeal } from "./actions";

export interface LeadRowData {
  id: string;
  companyName: string;
  industry: string | null;
  source: string | null;
  score: number;
  status: string;
  estimatedValue: number | null;
}

export function LeadsTable({ leads }: { leads: LeadRowData[] }) {
  const [isPending, startTransition] = useTransition();

  if (leads.length === 0) {
    return <p className="text-sm text-muted-foreground">No leads yet. Use &ldquo;Add lead&rdquo; to create one.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company</TableHead>
          <TableHead>Industry</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell className="font-medium">{lead.companyName}</TableCell>
            <TableCell>{lead.industry ?? "—"}</TableCell>
            <TableCell>{lead.source ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={lead.score >= 60 ? "default" : "outline"}>{lead.score}</Badge>
            </TableCell>
            <TableCell className="capitalize">{lead.status}</TableCell>
            <TableCell>
              {lead.status === "new" || lead.status === "qualified" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => startTransition(() => convertLeadToDeal(lead.id))}
                >
                  Create deal
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
