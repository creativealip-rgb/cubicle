"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-client";
import { User, Flame, Layers } from "lucide-react";

export function TaskQuickFilterChips() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentAssignee = searchParams.get("assignee");
  const currentPriority = searchParams.get("priority");
  const currentStatus = searchParams.get("status");

  const isAll = !currentAssignee && !currentPriority && (!currentStatus || currentStatus === "all");
  const isMe = currentAssignee === "me";
  const isUrgentHigh = currentPriority === "urgent" || currentPriority === "high";

  const applyFilter = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    router.push(`/app/tasks?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5 border border-border/60 text-xs">
      <button
        type="button"
        onClick={() => applyFilter({ assignee: null, priority: null, status: null })}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
          isAll
            ? "bg-background text-foreground shadow-2xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        }`}
      >
        <Layers className="h-3 w-3 text-muted-foreground" />
        <span>{t("Semua", "All Tasks")}</span>
      </button>

      <button
        type="button"
        onClick={() => applyFilter({ assignee: isMe ? null : "me" })}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
          isMe
            ? "bg-background text-foreground shadow-2xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        }`}
      >
        <User className="h-3 w-3 text-muted-foreground" />
        <span>{t("Tugas Saya", "Assigned to Me")}</span>
      </button>

      <button
        type="button"
        onClick={() => applyFilter({ priority: isUrgentHigh ? null : "urgent" })}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
          isUrgentHigh
            ? "bg-background text-foreground shadow-2xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        }`}
      >
        <Flame className={`h-3 w-3 ${isUrgentHigh ? "text-red-500" : "text-muted-foreground"}`} />
        <span>{t("Prioritas Tinggi", "High & Urgent")}</span>
      </button>
    </div>
  );
}
