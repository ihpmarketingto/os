import { isClientRole } from "@ihp/types";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { ClientPortalShell } from "@/components/shell/client-portal-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  if (isClientRole(session.roleSlug)) {
    return <ClientPortalShell organisationName={session.organisationName}>{children}</ClientPortalShell>;
  }

  const supabase = await getSupabaseServerClient();
  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, body, href, read_at, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId)
      .is("read_at", null),
  ]);

  return (
    <AppShell
      organisationName={session.organisationName}
      userLabel={session.fullName}
      email={session.email}
      roleSlug={session.roleSlug}
      notifications={notifications ?? []}
      unreadCount={unreadCount ?? 0}
    >
      {children}
    </AppShell>
  );
}
