import { ThemeToggle } from "@/components/shell/theme-toggle";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";

export function ClientPortalShell({
  organisationName,
  children,
}: {
  organisationName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-20 items-center justify-between border-b bg-background/90 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <BrandMark compact />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-brand">Client portal</p>
            <p className="mt-1 font-heading text-sm font-bold">{organisationName}</p>
          </div>
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
      <main className="ihp-app-bg flex-1 bg-background p-5 md:p-7 lg:p-8">{children}</main>
    </div>
  );
}
