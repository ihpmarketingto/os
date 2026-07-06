"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, type MagicLinkActionState } from "./actions";

const initialState: MagicLinkActionState = {};

export function MagicLinkForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(sendMagicLink, initialState);

  if (state.sent) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-success/40 bg-success/5 p-4">
        <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
        <p className="text-sm">
          If that email has access to IHP OS, a sign-in link is on its way. Open it on this device to finish
          signing in. The link expires after one use.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@yourcompany.com"
        />
      </div>
      {state.error ? <p className="text-sm text-risk">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Sending..." : "Email me a sign-in link"}
      </Button>
      <p className="text-xs text-muted-foreground">
        No password needed. Works with any email address that has been invited to IHP OS.
      </p>
    </form>
  );
}
