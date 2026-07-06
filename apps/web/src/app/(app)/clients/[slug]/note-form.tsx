"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addNote } from "./actions";

export function NoteForm({ clientId, slug }: { clientId: string; slug: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addNote(clientId, slug, formData);
        formRef.current?.reset();
      }}
      className="space-y-2"
    >
      <Textarea name="body" placeholder="Log a call, an internal observation, a risk..." rows={2} required />
      <Button type="submit" size="sm" variant="outline">
        Add note
      </Button>
    </form>
  );
}
