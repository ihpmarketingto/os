import "server-only";
import { redirect } from "next/navigation";
import type { RoleSlug } from "@ihp/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface CurrentSession {
  userId: string;
  email: string;
  fullName: string | null;
  organisationId: string;
  organisationName: string;
  roleSlug: RoleSlug;
  clientId: string | null;
}

/**
 * A user can belong to more than one organisation_members row in theory,
 * but Phase 0 has no org switcher yet — the first active membership wins.
 * Multi-org switching is a Phase 1+ UI addition, not a schema change.
 */
export async function getCurrentSession(): Promise<CurrentSession | null> {
  const supabase = await getSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("organisation_members")
    .select("organisation_id, client_id, organisations(name), roles(slug), profiles(full_name)")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) return null;

  const organisation = membership.organisations as unknown as { name: string } | null;
  const role = membership.roles as unknown as { slug: RoleSlug } | null;
  const profile = membership.profiles as unknown as { full_name: string | null } | null;

  if (!organisation || !role) return null;

  return {
    userId: userData.user.id,
    email: userData.user.email ?? "",
    fullName: profile?.full_name ?? null,
    organisationId: membership.organisation_id,
    organisationName: organisation.name,
    roleSlug: role.slug,
    clientId: membership.client_id,
  };
}

/** Use at the top of any protected Server Component / Server Action. */
export async function requireSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
