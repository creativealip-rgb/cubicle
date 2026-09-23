"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckSquare2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getTaskSubtasks, addSubtask, toggleSubtask, deleteSubtask, resetTaskSubtasks } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { useT } from "@/lib/i18n-client";

interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
}

export function TaskSubtaskSection({
  taskId,
  behavior = "one_time",
}: {
  taskId: string;
  behavior?: "one_time" | "recurring";
}) {
  const { t } = useT();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getTaskSubtasks(taskId);
        if (active) setSubtasks(data as Subtask[]);
      } catch {
        // silent fallback
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [taskId]);

  async function handleAdd(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const created = await addSubtask(taskId, newTitle.trim());
      setSubtasks((prev) => [...prev, created as Subtask]);
      setNewTitle("");
      toast.success(t("Subtask ditambahkan", "Subtask added"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal tambah subtask", "Failed to add subtask"));
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    const next = !current;
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, completed: next } : s)));
    try {
      await toggleSubtask(id, next);
    } catch {
      setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, completed: current } : s)));
      toast.error(t("Gagal update subtask", "Failed to update subtask"));
    }
  }

  async function handleDelete(id: string) {
    const prev = subtasks;
    setSubtasks((cur) => cur.filter((s) => s.id !== id));
    try {
      await deleteSubtask(id);
      toast.success(t("Subtask dihapus", "Subtask deleted"));
    } catch {
      setSubtasks(prev);
      toast.error(t("Gagal hapus subtask", "Failed to delete subtask"));
    }
  }

  async function handleResetAll() {
    try {
      await resetTaskSubtasks(taskId);
      setSubtasks((prev) => prev.map((s) => ({ ...s, completed: false })));
      toast.success(t("Semua subtask di-reset", "All subtasks reset"));
    } catch {
      toast.error(t("Gagal reset subtask", "Failed to reset subtasks"));
    }
  }

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/10 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Subtasks / Checklist", "Subtasks / Checklist")}
          </span>
          {subtasks.length > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground">
              ({completedCount}/{subtasks.length})
            </span>
          )}
        </div>

        {behavior === "recurring" && subtasks.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetAll}
            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t("Reset Rutin", "Reset Checklist")}</span>
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1.5">
        {loading ? (
          <p className="text-[11px] text-muted-foreground">{t("Memuat checklist...", "Loading checklist...")}</p>
        ) : subtasks.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70 italic py-1">
            {t("Belum ada subtask. Tambahkan langkah pengerjaan di bawah.", "No subtasks yet. Add work steps below.")}
          </p>
        ) : (
          subtasks.map((st) => (
            <div
              key={st.id}
              className="group flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 transition-colors hover:bg-muted/30"
            >
              <label className="flex flex-1 items-center gap-2.5 min-w-0 cursor-pointer">
                <Checkbox
                  checked={st.completed}
                  onCheckedChange={() => handleToggle(st.id, st.completed)}
                  className="rounded-md"
                />
                <span
                  className={`text-xs select-none truncate ${
                    st.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"
                  }`}
                >
                  {st.title}
                </span>
              </label>

              <button
                type="button"
                onClick={() => handleDelete(st.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add subtask input */}
      <div className="flex items-center gap-1.5 pt-1">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              handleAdd();
            }
          }}
          placeholder={t("+ Tambah langkah / subtask...", "+ Add step / subtask...")}
          className="h-8 text-xs bg-background"
        />
        <Button
          type="button"
          onClick={handleAdd}
          size="sm"
          variant="secondary"
          disabled={adding || !newTitle.trim()}
          className="h-8 px-2.5 text-xs font-semibold shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
