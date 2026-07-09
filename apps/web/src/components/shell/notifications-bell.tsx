"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAllNotificationsRead } from "@/app/(app)/automations/actions";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationsBell({ notifications, unreadCount }: { notifications: NotificationItem[]; unreadCount: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="flex items-center justify-between">
              Notifications
              {unreadCount > 0 ? (
                <button
                  className="text-xs font-normal text-brand hover:underline disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => startTransition(() => markAllNotificationsRead())}
                >
                  Mark all read
                </button>
              ) : null}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              render={
                <Link href={n.href ?? "/"} className="flex w-full flex-col items-start gap-0.5">
                  <span className={`text-sm ${n.read_at ? "text-muted-foreground" : "font-medium"}`}>{n.title}</span>
                  {n.body ? <span className="text-xs text-muted-foreground">{n.body}</span> : null}
                  <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </Link>
              }
            />
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
