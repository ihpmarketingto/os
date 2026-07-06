"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";

export function AppShell({
  organisationName,
  userLabel,
  email,
  roleSlug,
  children,
}: {
  organisationName: string;
  userLabel: string | null;
  email: string;
  roleSlug: string;
  children: React.ReactNode;
}) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar organisationName={organisationName} />
      <div className="flex flex-1 flex-col">
        <Topbar onSearchClick={() => setCommandOpen(true)} userLabel={userLabel} email={email} roleSlug={roleSlug} />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
