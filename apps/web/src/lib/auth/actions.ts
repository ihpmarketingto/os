"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@ihp/database";
import { getCurrentSession } from "@/lib/auth/session";

export async function signOut(): Promise<void> {
  const session = await getCurrentSession();
  const supabase = await getSupabaseServerClient();

  if (session) {
    await writeAuditLog(supabase, {
      organisationId: session.organisationId,
      actorUserId: session.userId,
      action: "logout",
      resource: "auth",
    });
  }

  await supabase.auth.signOut();
  redirect("/login");
}
