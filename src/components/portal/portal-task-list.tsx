"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MessageSquareWarning,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { respondPortalTask } from "@/lib/actions/tasks";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  updatedAt: string;
  hoursMinutes?: number;
}

function cleanDescription(description: string | null): string | null {
  if (!description) return null;
  const cleaned = description.split("\n\n---\n[Client ")[0]?.trim();
  return cleaned || null;
}

function parseClientDecision(description: string | null): "approved" | "rejected" | null {
  if (!description) return null;
  if (description.includes("[Client APPROVED")) return "approved";
  if (description.includes("[Client REVISION_REQUESTED")) return "rejected";
  return null;
}

function statusLabel(status: string) {
  if (status === "done") return "Selesai";
  if (status === "review") return "Perlu review kamu";
  if (status === "in_progress") return "Dikerjakan";
  if (status === "todo") return "Antrian";
  return status.replace(/_/g, " ");
}

export function PortalTaskList({
  tasks,
  token,
}: {
  tasks: Task[];
  token: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const priorityVariant = (p: string) => {
    if (p === "urgent") return "destructive" as const;
    if (p === "high") return "default" as const;
    return "outline" as const;
  };

  async function decide(taskId: string, decision: "approved" | "rejected") {
    setLoadingId(taskId);
    try {
      const row = await respondPortalTask({
        token,
        taskId,
        decision,
        note: noteById[taskId] || null,
      });
      setItems((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: row.status,
                description: row.description ?? t.description,
              }
            : t,
        ),
      );
      toast.success(
        decision === "approved" ? "Task disetujui" : "Revisi dikirim ke tim",
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada task</p>;
  }

  return (
    <div className="divide-y rounded-lg border">
      {items.map((task) => {
        const awaiting = task.status === "review";
        const decision = parseClientDecision(task.description);
        const desc = cleanDescription(task.description);
        const busy = loadingId === task.id;

        return (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 ${
              awaiting ? "bg-amber-50/60" : ""
            }`}
          >
            <div className="mt-0.5">
              {task.status === "done" || decision === "approved" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : awaiting ? (
                <BadgeCheck className="h-4 w-4 text-amber-600" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{task.title}</p>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    awaiting
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : task.status === "done"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : ""
                  }`}
                >
                  {statusLabel(task.status)}
                </Badge>
              </div>
              {desc && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {desc}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant={priorityVariant(task.priority)}
                  className="text-[10px]"
                >
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(task.dueDate).toLocaleDateString("id-ID")}
                  </span>
                )}
                {(task.hoursMinutes ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {(() => {
                      const mins = task.hoursMinutes ?? 0;
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      return h > 0 ? `${h}h ${m}m` : `${m}m`;
                    })()}
                  </span>
                )}
              </div>

              {awaiting && (
                <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-white p-2.5">
                  <p className="text-xs text-amber-800">
                    Tim minta review kamu. Setujui atau minta revisi.
                  </p>
                  <Textarea
                    value={noteById[task.id] || ""}
                    onChange={(e) =>
                      setNoteById((prev) => ({
                        ...prev,
                        [task.id]: e.target.value,
                      }))
                    }
                    placeholder="Catatan opsional (wajib buat revisi lebih jelas)"
                    className="min-h-[64px] text-sm"
                    disabled={busy}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={busy}
                      onClick={() => decide(task.id, "approved")}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Setujui
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
                      disabled={busy}
                      onClick={() => decide(task.id, "rejected")}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageSquareWarning className="h-3.5 w-3.5" />
                      )}
                      Minta revisi
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
