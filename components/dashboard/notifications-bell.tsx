"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, Clock, X, CalendarX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type Notification = {
  id:        string;
  subject:   string | null;
  body:      string;
  status:    string;
  createdAt: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function isCancellation(subject: string | null) {
  return subject === "Appointment Cancelled";
}

function getIcon(subject: string | null) {
  if (!subject) return <Bell className="h-4 w-4 text-muted-foreground" />;
  if (isCancellation(subject))   return <CalendarX className="h-4 w-4 text-red-500" />;
  if (subject.startsWith("24H")) return <Clock className="h-4 w-4 text-blue-500" />;
  if (subject.startsWith("1H"))  return <Clock className="h-4 w-4 text-amber-500" />;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

function getTitle(subject: string | null, body: string) {
  if (!subject) return body;
  if (isCancellation(subject))   return "Appointment cancelled";
  if (subject.startsWith("24H")) return "Appointment tomorrow";
  if (subject.startsWith("1H"))  return "Appointment in 1 hour";
  return subject;
}

// ── Component ──────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen]                   = useState(false);
  const seenIdsRef                        = useRef<Set<string>>(new Set());
  const isFirstFetchRef                   = useRef(true);

  // ── Fetch ──────────────────────────────────────────────────────────────
  async function fetchNotifications() {
    try {
      const res  = await fetch("/api/notifications");
      if (!res.ok) return;
      const data: { notifications: Notification[] } = await res.json();

      // On first load, seed seenIds so we don't toast stale notifs
      if (isFirstFetchRef.current) {
        data.notifications.forEach((n) => seenIdsRef.current.add(n.id));
        isFirstFetchRef.current = false;
        setNotifications(data.notifications);
        return;
      }

      // Detect genuinely new notifications and toast them
      const newOnes = data.notifications.filter(
        (n) => !seenIdsRef.current.has(n.id)
      );

      newOnes.forEach((n) => {
        seenIdsRef.current.add(n.id);
        toast(getTitle(n.subject, n.body), {
          description: n.body,
          icon:        getIcon(n.subject),
          duration:    6000,
        });
      });

      setNotifications(data.notifications);
    } catch {
      // Silently fail — don't disrupt the UI for a polling error
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // ── Mark one as read ───────────────────────────────────────────────────
  async function markRead(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    seenIdsRef.current.add(id);
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  // ── Mark all as read ───────────────────────────────────────────────────
  async function markAllRead() {
    setNotifications([]);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }

  const unreadCount = notifications.length;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <Separator />

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No new notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[340px]">
            <ul className="divide-y">
              {notifications.map((n) => {
                const cancelled = isCancellation(n.subject);
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                      cancelled ? "bg-red-50/60 dark:bg-red-950/20" : n.status !== "READ" && "bg-muted/20"
                    )}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      {getIcon(n.subject)}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium leading-tight",
                        cancelled && "text-red-700 dark:text-red-400"
                      )}>
                        {getTitle(n.subject, n.body)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={() => markRead(n.id)}
                      className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2">
              <p className="text-center text-xs text-muted-foreground">
                Showing {notifications.length} unread notification{notifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}