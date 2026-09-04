import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "emerald" | "blue" | "amber" | "rose" | "violet" | "slate";

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
}

const toneStyles: Record<StatusTone, { badge: string; dot: string }> = {
  emerald: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-600 dark:bg-emerald-400",
  },
  blue: {
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dot: "bg-blue-600 dark:bg-blue-400",
  },
  amber: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-600 dark:bg-amber-400",
  },
  rose: {
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    dot: "bg-rose-600 dark:bg-rose-400",
  },
  violet: {
    badge: "border-primary/30 bg-primary/10 text-primary dark:text-primary",
    dot: "bg-primary",
  },
  slate: {
    badge: "border-border/80 bg-muted/60 text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export function resolveStatusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (["active", "paid", "signed", "accepted", "done", "completed"].includes(s)) return "emerald";
  if (["sent", "viewed", "in_progress", "submitted"].includes(s)) return "blue";
  if (["on_hold", "pending", "payment due"].includes(s)) return "amber";
  if (["overdue", "declined", "expired", "revoked", "rejected", "cancelled"].includes(s)) return "rose";
  if (["review"].includes(s)) return "violet";
  return "slate";
}

export function UniversalStatusBadge({
  label,
  tone,
  status,
  dot = true,
  className,
}: {
  label: string;
  tone?: StatusTone;
  status?: string;
  dot?: boolean;
  className?: string;
}) {
  const activeTone = tone ?? (status ? resolveStatusTone(status) : "slate");
  const config = toneStyles[activeTone] || toneStyles.slate;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-medium rounded-full px-2 py-0 h-5 shrink-0 whitespace-nowrap",
        config.badge,
        className,
      )}
    >
      {dot && <span className={cn("h-1 w-1 rounded-full shrink-0", config.dot)} />}
      <span>{label}</span>
    </Badge>
  );
}
