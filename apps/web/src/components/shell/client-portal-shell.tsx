import { ThemeToggle } from "@/components/shell/theme-toggle";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function ClientPortalShell({
  organisationName,
  children,
}: {
  organisationName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Client Portal</p>
          <p className="font-heading text-sm">{organisationName}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 bg-muted/20 p-6">{children}</main>
    </div>
  );
}
