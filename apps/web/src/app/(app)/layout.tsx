import { isClientRole } from "@ihp/types";
import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/app-shell";
import { ClientPortalShell } from "@/components/shell/client-portal-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  if (isClientRole(session.roleSlug)) {
    return <ClientPortalShell organisationName={session.organisationName}>{children}</ClientPortalShell>;
  }

  return (
    <AppShell
      organisationName={session.organisationName}
      userLabel={session.fullName}
      email={session.email}
      roleSlug={session.roleSlug}
    >
      {children}
    </AppShell>
  );
}
