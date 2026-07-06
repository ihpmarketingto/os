"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav/config";
import { Badge } from "@/components/ui/badge";

export function Sidebar({ organisationName }: { organisationName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <span className="font-heading text-lg font-medium tracking-tight">IHP OS</span>
      </div>
      <div className="border-b px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Organisation</p>
        <p className="truncate text-sm font-medium">{organisationName}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </span>
                  {item.phase > 0 ? (
                    <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
                      Phase {item.phase}
                    </Badge>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
