"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { updateTask } from "@/lib/actions/tasks";
import { Loader2 } from "lucide-react";

interface InteractiveTaskItemProps {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  projectName?: string | null;
  clientName?: string | null;
  onStatusChange?: (id: string, newStatus: "todo" | "done") => void;
}

export function InteractiveTaskItem({
  id,
  title,
  status,
  priority,
  projectName,
  onStatusChange,
}: InteractiveTaskItemProps) {
  const [isPending, startTransition] = useTransition();
  const isDone = status === "done";

  function handleToggle(checked: boolean) {
    const newStatus = checked ? "done" : "todo";
    onStatusChange?.(id, newStatus);

    startTransition(async () => {
      try {
        await updateTask(id, { status: newStatus });
      } catch (err) {
        console.error("Failed to update task status:", err);
      }
    });
  }

  const priorityColor =
    priority === "urgent"
      ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
      : priority === "high"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
      : priority === "low"
      ? "bg-slate-500/10 text-slate-700 border-slate-500/20"
      : "bg-blue-500/10 text-blue-700 border-blue-500/20";

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2.5 rounded-xl border border-border/80 bg-card p-2.5 shadow-2xs transition-all hover:border-primary/40 hover:bg-muted/30",
        isDone && "bg-muted/20 opacity-75 border-dashed",
        isPending && "pointer-events-none opacity-60"
      )}
    >
      <div className="pt-0.5 shrink-0">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Checkbox
            checked={isDone}
            onCheckedChange={handleToggle}
            className="h-4 w-4 rounded-md data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-xs font-semibold leading-snug text-foreground transition-all truncate",
            isDone && "line-through text-muted-foreground font-normal"
          )}
          title={title}
        >
          {title}
        </p>
        
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {projectName && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[110px]" title={projectName}>
              {projectName}
            </span>
          )}
          {priority && (
            <span
              className={cn(
                "rounded px-1 py-0 text-[9px] font-medium border uppercase tracking-wider",
                priorityColor
              )}
            >
              {priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
