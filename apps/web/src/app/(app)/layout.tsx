import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

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
