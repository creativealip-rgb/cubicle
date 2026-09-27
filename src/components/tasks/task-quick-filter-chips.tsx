"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { User, AlertCircle, Clock, Flame, Layers } from "lucide-react";

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
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
      <Button
        type="button"
        size="sm"
        variant={isAll ? "default" : "outline"}
        onClick={() => applyFilter({ assignee: null, priority: null, status: null })}
        className={`h-7 rounded-lg px-2.5 text-xs font-medium ${
          isAll ? "shadow-xs" : "bg-background text-muted-foreground hover:text-foreground"
        }`}
      >
        <Layers className="mr-1 h-3 w-3" />
        {t("Semua", "All Tasks")}
      </Button>

      <Button
        type="button"
        size="sm"
        variant={isMe ? "default" : "outline"}
        onClick={() => applyFilter({ assignee: isMe ? null : "me" })}
        className={`h-7 rounded-lg px-2.5 text-xs font-medium ${
          isMe ? "shadow-xs" : "bg-background text-muted-foreground hover:text-foreground"
        }`}
      >
        <User className="mr-1 h-3 w-3" />
        {t("Tugas Saya", "Assigned to Me")}
      </Button>

      <Button
        type="button"
        size="sm"
        variant={isUrgentHigh ? "default" : "outline"}
        onClick={() => applyFilter({ priority: isUrgentHigh ? null : "urgent" })}
        className={`h-7 rounded-lg px-2.5 text-xs font-medium ${
          isUrgentHigh ? "shadow-xs" : "bg-background text-muted-foreground hover:text-foreground"
        }`}
      >
        <Flame className="mr-1 h-3 w-3 text-red-500" />
        {t("Prioritas Tinggi", "High & Urgent")}
      </Button>
    </div>
  );
}
