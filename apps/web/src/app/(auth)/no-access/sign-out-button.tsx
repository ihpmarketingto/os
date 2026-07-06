"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <Button variant="outline" className="w-full" onClick={() => signOut()}>
      Sign out and try a different account
    </Button>
  );
}
