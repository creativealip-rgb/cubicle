"use client";

import { useState } from "react";
import { createTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { useT } from "@/lib/i18n-client";
import { Plus, Loader2, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppTransition } from "@/lib/transition-provider";

export function TaskInlineQuickAdd({
  projects,
  status = "todo",
  placeholder,
  className = "",
}: {
  projects: Array<{ id: string; name: string }>;
  status?: "todo" | "in_progress" | "review" | "done";
  placeholder?: string;
  className?: string;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const targetProject = projectId || projects[0]?.id;
    if (!targetProject) {
      toast.error(t("Buat project terlebih dahulu", "Create a project first"));
      return;
    }

    setLoading(true);
    try {
      await createTask({
        title: cleanTitle,
        projectId: targetProject,
        status,
        priority: "medium",
        mode: "workflow",
        clientVisible: true,
      });
      toast.success(t("Tugas ditambahkan!", "Task added!"));
      setTitle("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal menambahkan tugas", "Failed to add task"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex w-full items-center gap-2 rounded-lg border border-dashed border-border/80 bg-background/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-foreground ${className}`}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>{placeholder || t("+ Tambah tugas cepat...", "+ Quick add task...")}</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`rounded-xl border border-primary/30 bg-card p-2 shadow-xs transition-all ${className}`}>
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("Nama tugas... (tekan Enter untuk simpan)", "Task title... (press Enter to save)")}
          disabled={loading}
          className="h-8 text-xs bg-background border-border/60 focus-visible:ring-1"
        />
        {projects.length > 1 && (
          <select
            value={projectId || projects[0]?.id}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-8 rounded-md border border-border/60 bg-background px-2 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[120px] truncate"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 text-[10px]">
          <CornerDownLeft className="h-2.5 w-2.5" /> Enter = {t("Simpan", "Save")}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setIsOpen(false); setTitle(""); }}
            disabled={loading}
            className="px-2 py-0.5 rounded hover:bg-muted text-muted-foreground"
          >
            {t("Batal", "Cancel")}
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : t("Simpan", "Save")}
          </button>
        </div>
      </div>
    </form>
  );
}
