"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logMeeting } from "./actions";

export function MeetingForm({ clientId, slug }: { clientId: string; slug: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await logMeeting(clientId, slug, formData);
        formRef.current?.reset();
      }}
      className="space-y-2"
    >
      <div className="grid grid-cols-2 gap-2">
        <Input name="title" placeholder="Meeting title" required />
        <Input name="scheduledAt" type="datetime-local" required />
      </div>
      <div className="flex items-center justify-between gap-2">
        <select name="meetingType" defaultValue="client_review" className="rounded-md border bg-background px-2 py-1 text-xs">
          <option value="discovery_call">Discovery call</option>
          <option value="internal">Internal</option>
          <option value="client_review">Client review</option>
          <option value="other">Other</option>
        </select>
        <Label className="flex items-center gap-1.5 text-xs font-normal">
          <input type="checkbox" name="clientVisible" className="size-3.5" /> Visible to client
        </Label>
      </div>
      <Input name="notes" placeholder="Notes (optional)" />
      <Button type="submit" size="sm" variant="outline">
        Log meeting
      </Button>
    </form>
  );
}
