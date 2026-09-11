import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { SignOutButton } from "./sign-out-button";

/**
 * Landing spot for authenticated users with no organisation membership —
 * e.g. someone who signed in with a Google account that hasn't been invited.
 * Without this page they would loop between /login and /. RLS means they
 * can see no data regardless; this just tells them so politely.
 */
export default async function NoAccessPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  // If they do have a membership, they don't belong here.
  const session = await getCurrentSession();
  if (session) {
    redirect("/");
  }

  return (
    <Card className="border-border bg-card/95 py-6 shadow-2xl shadow-black/25 backdrop-blur-sm">
      <CardHeader className="gap-3 px-6">
        <p className="brand-eyebrow">Private workspace</p>
        <CardTitle className="font-heading text-3xl font-bold tracking-[-0.04em]">No workspace access</CardTitle>
        <CardDescription className="leading-6">
          You are signed in as {data.user.email}, but this account has not been added to an IHP OS organisation.
          Ask your Agency Owner to invite this email address, then sign in again.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <SignOutButton />
      </CardContent>
    </Card>
  );
}
