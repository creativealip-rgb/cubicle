"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTask } from "@/lib/actions/tasks";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/i18n-client";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  position: number;
  clientVisible: boolean;
  projectId?: string;
  projectName?: string | null;
  sourceNoteId?: string | null;
}

interface TaskDetailSheetProps {
  task: Task;
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function TaskDetailSheet({
  task,
  members = [],
  children,
  defaultOpen = false,
}: TaskDetailSheetProps) {
  const { t } = useT();
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleStatusChange(status: string) {
    setLoading(true);
    try {
      await updateTask(task.id, { status: status as any });
      toast.success(t("Status diperbarui", "Status updated"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePriorityChange(priority: string) {
    setLoading(true);
    try {
      await updateTask(task.id, { priority: priority as any });
      toast.success(t("Prioritas diperbarui", "Priority updated"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDueDateChange(dueDate: string) {
    setLoading(true);
    try {
      await updateTask(task.id, { dueDate: dueDate || null });
      toast.success(t("Tenggat diperbarui", "Due date updated"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleClientVisibleToggle() {
    setLoading(true);
    try {
      await updateTask(task.id, { clientVisible: !task.clientVisible });
      toast.success(task.clientVisible ? t("Disembunyikan dari klien", "Hidden from client") : t("Terlihat oleh klien", "Visible to client"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAssigneeChange(assigneeId: string) {
    setLoading(true);
    try {
      const next = assigneeId === "unassigned" ? null : assigneeId;
      await updateTask(task.id, { assigneeId: next });
      toast.success(next ? t("Ditugaskan", "Assigned") : t("Tidak ditugaskan", "Unassigned"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  const _priorityColors: Record<string, string> = {
    low: "text-slate-600",
    medium: "text-blue-600",
    high: "text-amber-600",
    urgent: "text-red-600",
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{children}</div>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg">{task.title}</SheetTitle>
          {task.projectName && (
            <p className="text-sm text-muted-foreground">{task.projectName}</p>
          )}
        </SheetHeader>

        <div className="space-y-6">
          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{t("Status", "Status")}</Label>
              <Select value={task.status} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">{t("Belum Mulai", "To Do")}</SelectItem>
                  <SelectItem value="in_progress">{t("Dikerjakan", "In Progress")}</SelectItem>
                  <SelectItem value="review">{t("Ditinjau", "Review")}</SelectItem>
                  <SelectItem value="done">{t("Selesai", "Done")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("Prioritas", "Priority")}</Label>
              <Select value={task.priority} onValueChange={handlePriorityChange} disabled={loading}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("Rendah", "Low")}</SelectItem>
                  <SelectItem value="medium">{t("Sedang", "Medium")}</SelectItem>
                  <SelectItem value="high">{t("Tinggi", "High")}</SelectItem>
                  <SelectItem value="urgent">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" /> {t("Mendesak", "Urgent")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs">{t("Deskripsi", "Description")}</Label>
            <p className="text-sm text-muted-foreground">
              {task.description || t("Tidak ada deskripsi", "No description")}
            </p>
          </div>

          <Separator />

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t("Tenggat", "Due Date")}
            </Label>
            <Input
              type="date"
              value={task.dueDate ?? ""}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="h-9"
              disabled={loading}
            />
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <User className="h-3 w-3" /> {t("Ditugaskan ke", "Assignee")}
            </Label>
            <Select
              value={task.assigneeId ?? "unassigned"}
              onValueChange={handleAssigneeChange}
              disabled={loading}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={t("Belum ditugaskan", "Unassigned")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">{t("Belum ditugaskan", "Unassigned")}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.email || m.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Visible */}
          <div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={handleClientVisibleToggle}
              disabled={loading}
            >
              {task.clientVisible ? (
                <>
                  <EyeOff className="h-3 w-3" /> {t("Sembunyikan dari klien", "Hide from client")}
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" /> {t("Tampilkan ke klien", "Show to client")}
                </>
              )}
            </Button>
          </div>

          {task.sourceNoteId ? (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> {t("Sumber catatan", "Source note")}
              </Label>
              <Button asChild variant="secondary" size="sm" className="gap-1 text-xs">
                <Link href={`/app/personal?tab=all&q=${encodeURIComponent(task.title)}`}>
                  {t("Buka di Catatan", "Open in Notes")}
                </Link>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Task ini dibuat dari catatan pribadi.",
                  "This task was converted from a personal note.",
                )}
              </p>
            </div>
          ) : null}

          <Separator />

          {/* Comments placeholder */}
          <div className="space-y-2">
            <Label className="text-xs">{t("Komentar", "Comments")}</Label>
            <p className="text-xs text-muted-foreground">{t("Komentar segera hadir...", "Comments coming soon...")}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
