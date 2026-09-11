"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { NotificationsBell, type NotificationItem } from "@/components/shell/notifications-bell";
import { signOut } from "@/lib/auth/actions";

function initials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function Topbar({
  onSearchClick,
  userLabel,
  email,
  roleSlug,
  notifications,
  unreadCount,
}: {
  onSearchClick: () => void;
  userLabel: string | null;
  email: string;
  roleSlug: string;
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-5 backdrop-blur-xl md:px-7 lg:px-8">
      <button
        onClick={onSearchClick}
        className="flex w-full max-w-sm items-center gap-2 rounded-full border bg-card/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-muted"
      >
        <Search className="size-4" />
        Search or jump to...
        <kbd className="ml-auto rounded-full border bg-background px-2 py-0.5 text-[9px] font-semibold tracking-wide">⌘K</kbd>
      </button>

      <div className="flex items-center gap-2">
        <NotificationsBell notifications={notifications} unreadCount={unreadCount} />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">{initials(userLabel, email)}</AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <p className="truncate text-sm font-medium">{userLabel ?? email}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{roleSlug.replace(/_/g, " ")}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<a href="/settings/team">Settings</a>} />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
