"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { decideApproval } from "@/app/(app)/content-studio/actions";

export function ApprovalActions({ approvalId, contentId }: { approvalId: string; contentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => decideApproval(approvalId, contentId, "approved"))}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => decideApproval(approvalId, contentId, "changes_requested"))}
      >
        Request changes
      </Button>
    </div>
  );
}
