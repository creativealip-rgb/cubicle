"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  task_assigned: "📋",
  task_commented: "💬",
  client_comment: "💬",
  file_viewed: "👁",
  invoice_paid: "✅",
  invoice_sent: "📨",
  proposal_viewed: "👁",
  contract_signed: "✍️",
  contract_viewed: "👁",
  questionnaire_answered: "📝",
  booking_created: "📅",
  task_status_changed: "🔄",
  task_due_soon: "⏰",
  invoice_overdue: "⚠️",
  mention: "@",
};

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: NotificationItem[]; unread: number };
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // silent
    }
  }, []);

  // Initial + poll every 30s when bell is mounted
  useEffect(() => {
    load();
    pollRef.current = window.setInterval(load, 30000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [load]);

  // Reload when dropdown opens
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleMarkRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      load();
    }
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnread(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      load();
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full",
                "bg-[#6647F0] text-white text-[10px] font-bold leading-[18px] text-center",
                "ring-2 ring-background"
              )}
              data-testid="notif-badge"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs text-[#6647F0] hover:underline flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const icon = TYPE_ICON[n.type] ?? "•";
                const isUnread = !n.readAt;
                const inner = (
                  <div
                    className={cn(
                      "flex gap-2 px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors",
                      isUnread && "bg-[#6647F0]/[0.06]"
                    )}
                  >
                    <div className="text-lg shrink-0 leading-tight">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={cn(
                            "font-medium leading-snug",
                            isUnread && "text-foreground"
                          )}
                        >
                          {n.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                      {n.body && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.body}
                        </div>
                      )}
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMarkRead(n.id);
                          }}
                          className="text-[10px] text-[#6647F0] hover:underline mt-1"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => {
                          if (isUnread) handleMarkRead(n.id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div onClick={() => isUnread && handleMarkRead(n.id)}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
