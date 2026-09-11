"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav/config";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/brand/brand-mark";

export function Sidebar({ organisationName }: { organisationName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-20 items-center border-b border-sidebar-border px-5">
        <BrandMark />
      </div>
      <div className="border-b border-sidebar-border px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-brand">Organisation</p>
        <p className="mt-1 truncate text-sm font-medium">{organisationName}</p>
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
                    "flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </span>
                  {item.phase > 0 ? (
                    <Badge variant="outline" className="shrink-0 border-sidebar-border text-[9px] text-sidebar-foreground/50">
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
