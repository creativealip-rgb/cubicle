"use client";

import { useState, useTransition, useEffect } from "react";
import { useT } from "@/lib/i18n-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Play,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  MessageSquare,
  Send,
  Loader2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  updateTask,
  getTaskSubtasks,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
} from "@/lib/actions/tasks";
import { startTimerFromTask } from "@/lib/actions/time";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  clientName?: string | null;
  timeTrackingMode?: "off" | "internal" | "billable" | null;
  mode?: "workflow" | "reusable";
  lifecycle?: "active" | "archived";
}

interface TaskDetailSheetProps {
  task: Task;
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  projects?: Array<{ id: string; name: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function TaskDetailSheet({
  task: initialTask,
  members = [],
  children,
  defaultOpen = false,
  className,
}: TaskDetailSheetProps) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [task, setTask] = useState<Task>(initialTask);
  const [isPending, startTransition] = useTransition();

  // Subtasks State
  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  // Comments State
  const [comments, setComments] = useState<
    Array<{
      id: string;
      content: string;
      createdAt: Date | string;
      userId: string;
      userName: string | null;
      userEmail: string | null;
    }>
  >([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Load Subtasks & Comments when open
  useEffect(() => {
    if (open && task.id) {
      getTaskSubtasks(task.id).then((items) => {
        setSubtasks(items.map((it) => ({ id: it.id, title: it.title, completed: it.completed })));
      });
      getTaskComments(task.id).then((items) => {
        setComments(items);
      });
    }
  }, [open, task.id]);

  // Fast Status Auto-Save
  const handleStatusChange = (nextStatus: "todo" | "in_progress" | "review" | "done") => {
    setTask((prev) => ({ ...prev, status: nextStatus }));
    startTransition(async () => {
      try {
        await updateTask(task.id, { status: nextStatus });
        toast.success(t("Status tugas diperbarui", "Task status updated"));
        router.refresh();
      } catch (err) {
        toast.error(t("Gagal memperbarui status", "Failed to update status"));
      }
    });
  };

  // Fast Priority Auto-Save
  const handlePriorityChange = (nextPriority: "low" | "medium" | "high" | "urgent") => {
    setTask((prev) => ({ ...prev, priority: nextPriority }));
    startTransition(async () => {
      try {
        await updateTask(task.id, { priority: nextPriority });
        toast.success(t("Prioritas diperbarui", "Priority updated"));
        router.refresh();
      } catch {
        toast.error(t("Gagal memperbarui prioritas", "Failed to update priority"));
      }
    });
  };

  // Fast Assignee Auto-Save
  const handleAssigneeChange = (assigneeId: string) => {
    const mem = members.find((m) => m.id === assigneeId);
    setTask((prev) => ({ ...prev, assigneeId, assigneeName: mem?.name ?? null }));
    startTransition(async () => {
      try {
        await updateTask(task.id, { assigneeId: assigneeId === "__unassigned__" ? null : assigneeId });
        toast.success(t("Petugas diperbarui", "Assignee updated"));
        router.refresh();
      } catch {
        toast.error(t("Gagal memperbarui petugas", "Failed to update assignee"));
      }
    });
  };

  // Fast Client Visible Toggle
  const handleToggleClientVisible = () => {
    const nextVal = !task.clientVisible;
    setTask((prev) => ({ ...prev, clientVisible: nextVal }));
    startTransition(async () => {
      try {
        await updateTask(task.id, { clientVisible: nextVal });
        toast.success(nextVal ? t("Tampil di Client Portal", "Visible in client portal") : t("Disembunyikan dari Portal", "Hidden from portal"));
        router.refresh();
      } catch {
        toast.error(t("Gagal mengubah visibilitas", "Failed to toggle visibility"));
      }
    });
  };

  // Description Auto-Save on Blur
  const [descriptionDraft, setDescriptionDraft] = useState(task.description ?? "");
  const handleDescriptionBlur = () => {
    if (descriptionDraft !== (task.description ?? "")) {
      setTask((prev) => ({ ...prev, description: descriptionDraft }));
      startTransition(async () => {
        try {
          await updateTask(task.id, { description: descriptionDraft });
          toast.success(t("Deskripsi disimpan", "Description saved"));
          router.refresh();
        } catch {
          toast.error(t("Gagal menyimpan deskripsi", "Failed to save description"));
        }
      });
    }
  };

  // Title Auto-Save on Blur
  const [titleDraft, setTitleDraft] = useState(task.title);
  const handleTitleBlur = () => {
    if (titleDraft.trim() && titleDraft !== task.title) {
      setTask((prev) => ({ ...prev, title: titleDraft.trim() }));
      startTransition(async () => {
        try {
          await updateTask(task.id, { title: titleDraft.trim() });
          toast.success(t("Judul tugas disimpan", "Task title saved"));
          router.refresh();
        } catch {
          toast.error(t("Gagal menyimpan judul", "Failed to save title"));
        }
      });
    }
  };

  // 1-Click Start Timer
  const [timerStarting, setTimerStarting] = useState(false);
  const handleStartTimer = async () => {
    setTimerStarting(true);
    try {
      await startTimerFromTask(task.id);
      toast.success(t(`Timer dimulai untuk "${task.title}"`, `Timer started for "${task.title}"`));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal memulai timer", "Failed to start timer"));
    } finally {
      setTimerStarting(false);
    }
  };

  // Subtask Handlers
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || subtaskLoading) return;
    setSubtaskLoading(true);
    try {
      const created = await addSubtask(task.id, newSubtaskTitle.trim());
      setSubtasks((prev) => [...prev, { id: created.id, title: created.title, completed: created.completed }]);
      setNewSubtaskTitle("");
      toast.success(t("Subtask ditambahkan", "Subtask added"));
      router.refresh();
    } catch {
      toast.error(t("Gagal menambahkan subtask", "Failed to add subtask"));
    } finally {
      setSubtaskLoading(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, completed: !currentCompleted } : s))
    );
    try {
      await toggleSubtask(subtaskId, !currentCompleted);
      router.refresh();
    } catch {
      toast.error(t("Gagal mengubah status subtask", "Failed to toggle subtask"));
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    try {
      await deleteSubtask(subtaskId);
      toast.success(t("Subtask dihapus", "Subtask deleted"));
      router.refresh();
    } catch {
      toast.error(t("Gagal menghapus subtask", "Failed to delete subtask"));
    }
  };

  // Comments Handlers
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      const created = await addTaskComment({ taskId: task.id, content: newComment.trim() });
      setComments((prev) => [
        ...prev,
        {
          id: created.id,
          content: created.content,
          createdAt: created.createdAt,
          userId: created.userId,
          userName: "You",
          userEmail: null,
        },
      ]);
      setNewComment("");
      toast.success(t("Komentar terkirim", "Comment posted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengirim komentar", "Failed to post comment"));
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await deleteTaskComment(commentId);
      toast.success(t("Komentar dihapus", "Comment deleted"));
    } catch {
      toast.error(t("Gagal menghapus komentar", "Failed to delete comment"));
    }
  };

  const subtaskDone = subtasks.filter((s) => s.completed).length;
  const subtaskPct = subtasks.length > 0 ? Math.round((subtaskDone / subtasks.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className={className ?? "cursor-pointer"}>
        {children}
      </div>

      <DialogContent className="flex h-[90vh] max-h-[860px] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        {/* Top Header / Breadcrumb & Actions Bar */}
        <DialogHeader className="shrink-0 border-b bg-muted/20 px-6 py-3.5 pr-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {task.clientName && (
                <>
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                    {task.clientName}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
              {task.projectName && (
                <>
                  <Link
                    href={`/app/projects/${task.projectId}`}
                    className="font-medium hover:text-primary hover:underline transition-colors"
                  >
                    {task.projectName}
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
              <Badge variant="outline" className="text-[10px] font-semibold tracking-wide uppercase h-5">
                {task.mode === "reusable" ? t("SOP / Template", "SOP / Template") : t("Task", "Task")}
              </Badge>
            </div>

            {/* Quick Actions (1-Click Play Timer) */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleStartTimer}
                disabled={timerStarting}
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs"
              >
                {timerStarting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                {t("Start Timer", "Start Timer")}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 2-Column Workspace Body (ClickUp Style) */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-12 divide-y md:divide-y-0 md:divide-x">
          {/* Left Column: Canvas Document, Title, Metadata, Subtasks */}
          <div className="min-h-0 overflow-y-auto p-6 md:col-span-8 space-y-6">
            {/* Editable Title */}
            <div>
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleBlur}
                className="border-transparent hover:border-border focus:border-primary font-bold text-xl md:text-2xl px-2 py-1 h-auto -ml-2 rounded-lg bg-transparent transition-all"
                placeholder={t("Judul tugas...", "Task title...")}
              />
            </div>

            {/* ClickUp-style Metadata Attributes Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/20 text-xs">
              {/* Status Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Status
                </span>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  className="w-full bg-background border border-border/70 rounded-md px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="todo">{t("TO DO", "TO DO")}</option>
                  <option value="in_progress">{t("IN PROGRESS", "IN PROGRESS")}</option>
                  <option value="review">{t("REVIEW", "REVIEW")}</option>
                  <option value="done">{t("DONE", "DONE")}</option>
                </select>
              </div>

              {/* Priority Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t("Prioritas", "Priority")}
                </span>
                <select
                  value={task.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as any)}
                  className="w-full bg-background border border-border/70 rounded-md px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="low">{t("Low", "Low")}</option>
                  <option value="medium">{t("Medium", "Medium")}</option>
                  <option value="high">{t("High", "High")}</option>
                  <option value="urgent">{t("Urgent", "Urgent")}</option>
                </select>
              </div>

              {/* Assignee Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {t("Petugas", "Assignee")}
                </span>
                <select
                  value={task.assigneeId || "__unassigned__"}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-md px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                >
                  <option value="__unassigned__">{t("Unassigned", "Unassigned")}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Portal Visibility Toggle */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Portal
                </span>
                <button
                  type="button"
                  onClick={handleToggleClientVisible}
                  className={`w-full h-[26px] rounded-md px-2 text-[11px] font-semibold flex items-center justify-center transition-colors ${
                    task.clientVisible
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border border-border/60 hover:bg-muted/80"
                  }`}
                >
                  {task.clientVisible ? t("Visible", "Visible") : t("Hidden", "Hidden")}
                </button>
              </div>
            </div>

            {/* Description Document Canvas */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{t("Deskripsi & Brief Kerja", "Description & Work Brief")}</span>
                {isPending && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              </label>
              <Textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder={t(
                  "Tambahkan catatan detail, instruksi pengerjaan, atau link referensi (auto-save saat klik luar)...",
                  "Add detail notes, instructions, or reference links (auto-saves on blur)..."
                )}
                rows={6}
                className="w-full min-h-[140px] resize-y rounded-xl border border-border/80 bg-background p-3.5 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Subtasks Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("Subtasks / Checklist", "Subtasks / Checklist")}
                  </span>
                  {subtasks.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold px-1.5 h-4">
                      {subtaskDone}/{subtasks.length} ({subtaskPct}%)
                    </Badge>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {subtasks.length > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${subtaskPct}%` }}
                  />
                </div>
              )}

              {/* Subtask Items */}
              <div className="space-y-1.5">
                {subtasks.map((s) => (
                  <div
                    key={s.id}
                    className="group flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm hover:border-border hover:bg-muted/30 transition-colors"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={s.completed}
                        onChange={() => handleToggleSubtask(s.id, s.completed)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                      />
                      <span className={`truncate text-xs ${s.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                        {s.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Subtask Input */}
              <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder={t("+ Tambah subtask (tekan Enter)...", "+ Add subtask (press Enter)...")}
                  className="h-9 text-xs"
                  disabled={subtaskLoading}
                />
                <Button type="submit" size="sm" variant="outline" className="h-9 px-3 text-xs" disabled={subtaskLoading || !newSubtaskTitle.trim()}>
                  {subtaskLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column: Activity Feed & Comments (ClickUp / Asana Style) */}
          <div className="min-h-0 flex flex-col overflow-hidden p-5 md:col-span-4 bg-muted/10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                {t("Activity & Comments", "Activity & Comments")}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold h-4 px-1.5">
                {comments.length}
              </Badge>
            </div>

            {/* Comment Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[220px]">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-xs text-muted-foreground space-y-1">
                  <Sparkles className="h-6 w-6 text-muted-foreground/40 mb-1" />
                  <p className="font-medium">{t("Belum ada komentar", "No comments yet")}</p>
                  <p className="text-[11px] text-muted-foreground/70">{t("Tinggalkan update pengerjaan atau catatan tim di sini.", "Leave work updates or team notes here.")}</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="group rounded-xl border border-border/70 bg-card p-3 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{c.userName || c.userEmail || "Member"}</span>
                      <div className="flex items-center gap-1.5">
                        <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input Composer */}
            <form onSubmit={handleAddComment} className="pt-2 border-t border-border/60 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                    e.preventDefault();
                    handleAddComment(e);
                  }
                }}
                placeholder={t("Tulis komentar atau update tim...", "Write a comment or team update...")}
                rows={2}
                className="w-full min-h-[60px] resize-none rounded-lg border border-border/80 p-2 text-xs leading-relaxed"
                disabled={commentLoading}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={commentLoading || !newComment.trim()}
                  className="h-7 gap-1.5 px-3 text-xs font-semibold"
                >
                  {commentLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  {t("Kirim", "Send")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
