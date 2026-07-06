"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";
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
}: {
  onSearchClick: () => void;
  userLabel: string | null;
  email: string;
  roleSlug: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <button
        onClick={onSearchClick}
        className="flex w-full max-w-sm items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        Search or jump to...
        <kbd className="ml-auto rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <div className="flex items-center gap-2">
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
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium">{userLabel ?? email}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{roleSlug.replace(/_/g, " ")}</p>
            </DropdownMenuLabel>
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
