"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  ChevronRight,
  Send,
  Loader2,
  Trash2,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  User,
  Shield,
  MessageSquare,
  AtSign,
  Paperclip,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  Download,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateTask,
  getTaskSubtasks,
  addSubtask,
  toggleSubtask,
  updateSubtaskTitle,
  updateSubtaskAssignee,
  deleteSubtask,
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
} from "@/lib/actions/tasks";
import { startTimerFromTask } from "@/lib/actions/time";
import { uploadOneFile } from "@/lib/files-upload";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
import Link from "next/link";

interface MemberOption {
  id: string;
  name: string | null;
  email: string | null;
}

interface TaskCommentAttachment {
  fileId: string;
  name: string;
  sizeBytes?: number | null;
  mimeType?: string | null;
}

interface TaskCommentItem {
  id: string;
  content: string;
  attachments?: TaskCommentAttachment[] | null;
  createdAt: Date | string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
}

interface TaskDetailSheetProps {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  projects?: Array<{ id: string; name: string }>;
  task: {
    id: string;
    workspaceId?: string;
    title: string;
    description: string | null;
    status: any;
    priority: any;
    mode?: "reusable" | "one_time" | string;
    clientVisible?: boolean;
    dueDate?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    projectId?: string | null;
    projectName?: string | null;
  };
  members?: MemberOption[];
  className?: string;
}

function getAttachmentIcon(mimeType?: string | null) {
  if (!mimeType) return <FileText className="h-4 w-4 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar"))
    return <FileArchive className="h-4 w-4 text-amber-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function TaskDetailSheet({
  children,
  defaultOpen = false,
  projects = [],
  task: initialTask,
  members = [],
  className,
}: TaskDetailSheetProps) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [task, setTask] = useState(initialTask);
  const [, startTransition] = useTransition();

  // Timer State
  const [timerStarting, setTimerStarting] = useState(false);

  // Subtasks State
  const [subtasks, setSubtasks] = useState<
    Array<{
      id: string;
      title: string;
      completed: boolean;
      assigneeId: string | null;
    }>
  >([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");

  // Comments State
  const [comments, setComments] = useState<TaskCommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const commentScrollRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attachments in new comment composer
  const [pendingAttachments, setPendingAttachments] = useState<TaskCommentAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // File Preview Modal in Task
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  // Mention Autocomplete State
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  // Load Subtasks & Comments when modal opens
  useEffect(() => {
    if (open && task.id) {
      getTaskSubtasks(task.id).then((items) => {
        setSubtasks(
          items.map((it) => ({
            id: it.id,
            title: it.title,
            completed: it.completed,
            assigneeId: it.assigneeId,
          }))
        );
      });
      getTaskComments(task.id).then((items: any) => {
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
      } catch {
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
        toast.success(
          nextVal
            ? t("Tampil di Client Portal", "Visible in client portal")
            : t("Disembunyikan dari Portal", "Hidden from portal")
        );
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
          toast.success(t("Judul tugas diperbarui", "Task title updated"));
          router.refresh();
        } catch {
          toast.error(t("Gagal memperbarui judul", "Failed to update title"));
        }
      });
    }
  };

  // 1-Click Timer Start
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
      setSubtasks((prev) => [
        ...prev,
        { id: created.id, title: created.title, completed: created.completed, assigneeId: created.assigneeId },
      ]);
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

  const handleSaveSubtaskTitle = async (subtaskId: string) => {
    if (!editingSubtaskTitle.trim()) return;
    const title = editingSubtaskTitle.trim();
    setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, title } : s)));
    setEditingSubtaskId(null);
    try {
      await updateSubtaskTitle(subtaskId, title);
      toast.success(t("Subtask diperbarui", "Subtask updated"));
      router.refresh();
    } catch {
      toast.error(t("Gagal memperbarui subtask", "Failed to update subtask"));
    }
  };

  const handleSubtaskAssigneeChange = async (subtaskId: string, assigneeId: string) => {
    const val = assigneeId === "__unassigned__" ? null : assigneeId;
    setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, assigneeId: val } : s)));
    try {
      await updateSubtaskAssignee(subtaskId, val);
      toast.success(t("Petugas subtask diperbarui", "Subtask assignee updated"));
      router.refresh();
    } catch {
      toast.error(t("Gagal menetapkan petugas subtask", "Failed to assign subtask"));
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

  // Upload Attachment Handler
  const handleFileUpload = async (filesToUpload: FileList | null) => {
    if (!filesToUpload || filesToUpload.length === 0) return;
    setUploadingFiles(true);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const res = await uploadOneFile(file, {
          workspaceId: task.workspaceId || "",
          clientId: task.clientId || undefined,
          projectId: task.projectId || undefined,
          visibility: "internal",
          fileType: "working_file",
        });

        setPendingAttachments((prev) => [
          ...prev,
          {
            fileId: res.id,
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type || "application/octet-stream",
          },
        ]);
      }
      toast.success(t("Berkas berhasil dilampirkan", "File attached successfully"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengunggah lampiran", "Failed to upload attachment"));
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Comments Handlers
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_-]*)$/);

    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1].toLowerCase());
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
    }
  };

  const filteredMentionMembers = members.filter((m) => {
    const name = (m.name || "").toLowerCase();
    const email = (m.email || "").toLowerCase();
    return name.includes(mentionQuery) || email.includes(mentionQuery);
  });

  const insertMention = (member: { id: string; name: string | null; email: string | null }) => {
    const displayName = member.name || member.email?.split("@")[0] || "member";
    const cursorPos = commentInputRef.current?.selectionStart || newComment.length;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const textAfterCursor = newComment.slice(cursorPos);
    
    const newTextBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_-]*)$/, `@${displayName} `);
    setNewComment(newTextBefore + textAfterCursor);
    setMentionOpen(false);

    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        const nextPos = newTextBefore.length;
        commentInputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!newComment.trim() && pendingAttachments.length === 0) || commentLoading) return;
    setCommentLoading(true);
    try {
      const created = await addTaskComment({
        taskId: task.id,
        content: newComment.trim(),
        attachments: pendingAttachments,
      });

      setComments((prev) => [
        ...prev,
        {
          id: created.id,
          content: created.content,
          attachments: pendingAttachments,
          createdAt: created.createdAt,
          userId: created.userId,
          userName: "You",
          userEmail: null,
        },
      ]);
      setNewComment("");
      setPendingAttachments([]);
      setMentionOpen(false);
      toast.success(t("Komentar terkirim", "Comment posted"));
      setTimeout(() => {
        if (commentScrollRef.current) {
          commentScrollRef.current.scrollTop = commentScrollRef.current.scrollHeight;
        }
      }, 50);
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

  // Helper to render text with highlighted @mentions
  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_.-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="inline-flex items-center font-bold text-primary bg-primary/10 rounded px-1 py-0.5 text-[11px] mx-0.5">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const subtaskDone = subtasks.filter((s) => s.completed).length;
  const subtaskPct = subtasks.length > 0 ? Math.round((subtaskDone / subtasks.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className={className ?? "cursor-pointer"}>
        {children}
      </div>

      <DialogContent className="flex h-[94vh] max-h-[920px] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl shadow-2xl rounded-2xl border-border/80 bg-background">
        {/* Top Header / Breadcrumb & Actions Bar */}
        <DialogHeader className="shrink-0 border-b bg-muted/20 px-6 py-3 pr-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {task.clientName && (
                <>
                  <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                    {task.clientName}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
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
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                </>
              )}
              <Badge variant="outline" className="text-[10px] font-semibold tracking-wide uppercase h-5 bg-background text-muted-foreground">
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
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs rounded-lg px-3"
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

        {/* Main 2-Column Split Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-border/60 overflow-hidden">
          {/* Left Column: Task Overview, Description, Metadata & Subtasks */}
          <div className="min-h-0 flex flex-col overflow-y-auto p-6 md:col-span-8 space-y-6">
            {/* Task Title Input */}
            <div className="space-y-1">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleBlur}
                className="w-full text-lg font-bold tracking-tight bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 -mx-1 text-foreground"
                placeholder={t("Nama tugas...", "Task name...")}
              />
            </div>

            {/* Attributes Grid (Status, Priority, Assignee, Portal Toggle) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs">
              {/* Status */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  {t("Status", "Status")}
                </span>
                <Select
                  value={task.status}
                  onValueChange={(val: any) => handleStatusChange(val)}
                >
                  <SelectTrigger className="h-7 text-xs font-semibold rounded-lg bg-background border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">🟡 To Do</SelectItem>
                    <SelectItem value="in_progress">🔵 In Progress</SelectItem>
                    <SelectItem value="review">🟣 Review</SelectItem>
                    <SelectItem value="done">🟢 Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-500" />
                  {t("Prioritas", "Priority")}
                </span>
                <Select
                  value={task.priority}
                  onValueChange={(val: any) => handlePriorityChange(val)}
                >
                  <SelectTrigger className="h-7 text-xs font-semibold rounded-lg bg-background border-border/80 capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3 text-blue-500" />
                  {t("Petugas", "Assignee")}
                </span>
                <Select
                  value={task.assigneeId ?? "__unassigned__"}
                  onValueChange={(val) => handleAssigneeChange(val)}
                >
                  <SelectTrigger className="h-7 text-xs font-semibold rounded-lg bg-background border-border/80 truncate">
                    <SelectValue placeholder={t("Pilih...", "Select...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">{t("Belum Ditugaskan", "Unassigned")}</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Portal Visibility */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3 text-purple-500" />
                  {t("Client Portal", "Client Portal")}
                </span>
                <Button
                  type="button"
                  variant={task.clientVisible ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleClientVisible}
                  className="h-7 w-full text-[11px] font-semibold rounded-lg justify-center"
                >
                  {task.clientVisible ? t("Tampil", "Visible") : t("Sembunyi", "Hidden")}
                </Button>
              </div>
            </div>

            {/* Task Description */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("Deskripsi & Petunjuk", "Description & Instructions")}
              </span>
              <Textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder={t("Tambahkan catatan atau instruksi pengerjaan tugas...", "Add instructions or notes...")}
                rows={3}
                className="resize-none rounded-xl border border-border/80 p-3 text-xs leading-relaxed bg-muted/10 focus:bg-background"
              />
            </div>

            {/* Interactive Subtasks Checklist Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("Langkah & Subtasks", "Steps & Subtasks")}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-bold h-4 px-1.5">
                    {subtaskDone}/{subtasks.length} ({subtaskPct}%)
                  </Badge>
                </div>
              </div>

              {/* Progress Bar */}
              {subtasks.length > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${subtaskPct}%` }}
                  />
                </div>
              )}

              {/* Subtasks List */}
              <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden">
                {subtasks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {t("Belum ada langkah kerja. Tambahkan subtask di bawah.", "No subtasks yet. Add one below.")}
                  </div>
                ) : (
                  subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="group flex items-center justify-between gap-3 p-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Checkbox
                          checked={st.completed}
                          onCheckedChange={() => handleToggleSubtask(st.id, st.completed)}
                          className="rounded-md"
                        />
                        {editingSubtaskId === st.id ? (
                          <Input
                            autoFocus
                            value={editingSubtaskTitle}
                            onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                            onBlur={() => handleSaveSubtaskTitle(st.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveSubtaskTitle(st.id);
                              if (e.key === "Escape") setEditingSubtaskId(null);
                            }}
                            className="h-7 text-xs py-0"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingSubtaskId(st.id);
                              setEditingSubtaskTitle(st.title);
                            }}
                            className={`text-xs cursor-pointer truncate ${
                              st.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"
                            }`}
                          >
                            {st.title}
                          </span>
                        )}
                      </div>

                      {/* Subtask Assignee & Delete */}
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Select
                          value={st.assigneeId ?? "__unassigned__"}
                          onValueChange={(val) => handleSubtaskAssigneeChange(st.id, val)}
                        >
                          <SelectTrigger className="h-6 w-24 text-[10px] rounded-md border-border/60 px-1.5">
                            <SelectValue placeholder="Assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{t("Pilih...", "None")}</SelectItem>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name || m.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSubtask(st.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-md"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Subtask Input Form */}
              <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder={t("+ Tambah langkah atau subtask baru...", "+ Add new step or subtask...")}
                  className="h-8 text-xs rounded-xl bg-muted/20 border-border/80"
                  disabled={subtaskLoading}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={subtaskLoading || !newSubtaskTitle.trim()}
                  className="h-8 px-3 text-xs font-semibold rounded-xl"
                >
                  {subtaskLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column: Activity Feed & Comments with @Mentions & Attachments */}
          <div className="min-h-0 flex flex-col overflow-hidden p-5 md:col-span-4 bg-muted/10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                {t("Activity & Comments", "Activity & Comments")}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold h-4 px-1.5 bg-background">
                {comments.length}
              </Badge>
            </div>

            {/* Comment Stream */}
            <div ref={commentScrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[220px]">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-xs text-muted-foreground space-y-1">
                  <Sparkles className="h-6 w-6 text-muted-foreground/40 mb-1" />
                  <p className="font-medium">{t("Belum ada komentar", "No comments yet")}</p>
                  <p className="text-[11px] text-muted-foreground/70">{t("Ketik @ untuk mention & lampirkan file 📎", "Type @ to mention & attach files 📎")}</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="group rounded-xl border border-border/70 bg-card p-3 text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{c.userName || c.userEmail || "Member"}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {c.content && (
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {renderCommentContent(c.content)}
                      </p>
                    )}

                    {/* Render Attachments inside Bubble */}
                    {c.attachments && c.attachments.length > 0 && (
                      <div className="pt-1.5 space-y-1.5">
                        {c.attachments.map((att, attIdx) => (
                          <div
                            key={`${att.fileId}-${attIdx}`}
                            onClick={() => setPreviewFile({ id: att.fileId, name: att.name, mimeType: att.mimeType, sizeBytes: att.sizeBytes })}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted transition-colors cursor-pointer group/att"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="shrink-0">{getAttachmentIcon(att.mimeType)}</div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate group-hover/att:text-primary transition-colors">
                                  {att.name}
                                </p>
                                {att.sizeBytes ? (
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    {formatFileSize(att.sizeBytes)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md hover:bg-background"
                                title={t("Buka Pratinjau", "Open Preview")}
                              >
                                <Eye className="h-3 w-3 text-primary" />
                              </Button>
                              <a
                                href={`/api/files/${att.fileId}/download`}
                                download
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-background text-muted-foreground hover:text-foreground"
                                title={t("Unduh", "Download")}
                              >
                                <Download className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Comment Input Composer with @Mention Autocomplete & Paperclip */}
            <div className="relative pt-2 border-t border-border/60 space-y-2">
              {/* Mention Suggestion Popover */}
              {mentionOpen && filteredMentionMembers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-full max-h-44 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg z-50 p-1 divide-y divide-border/40">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <AtSign className="h-3 w-3" />
                    <span>{t("Mention Anggota Tim", "Mention Team Member")}</span>
                  </div>
                  <div className="py-0.5">
                    {filteredMentionMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => insertMention(m)}
                        className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-accent flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-foreground">{m.name || m.email}</span>
                        <span className="text-[10px] text-muted-foreground">{m.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Attachments Pill Bar */}
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg bg-muted/40 border border-border/60">
                  {pendingAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px] font-medium border border-border/80 shadow-2xs max-w-[200px]"
                    >
                      {getAttachmentIcon(att.mimeType)}
                      <span className="truncate">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} className="space-y-2">
                <Textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={handleCommentChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !mentionOpen && (newComment.trim() || pendingAttachments.length > 0)) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder={t("Tulis komentar / lampirkan file (Enter kirim)...", "Write a comment / attach file (Enter to send)...")}
                  rows={2}
                  className="w-full min-h-[60px] resize-none rounded-lg border border-border/80 p-2 text-xs leading-relaxed bg-background"
                  disabled={commentLoading}
                />

                {/* Hidden File Input */}
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {/* Mention trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewComment((prev) => prev + "@");
                        setMentionOpen(true);
                        setMentionQuery("");
                        commentInputRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1 rounded hover:bg-muted px-1.5 py-0.5 transition-colors cursor-pointer"
                      title={t("Mention anggota tim", "Mention team member")}
                    >
                      <AtSign className="h-3.5 w-3.5 text-primary" />
                      <span>Mention</span>
                    </button>

                    {/* Paperclip attach file trigger */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles}
                      className="inline-flex items-center gap-1 rounded hover:bg-muted px-1.5 py-0.5 transition-colors cursor-pointer"
                      title={t("Lampirkan berkas", "Attach files")}
                    >
                      {uploadingFiles ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Paperclip className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>{uploadingFiles ? t("Mengunggah...", "Uploading...") : t("Lampirkan", "Attach")}</span>
                    </button>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={commentLoading || uploadingFiles || (!newComment.trim() && pendingAttachments.length === 0)}
                    className="h-7 gap-1.5 px-3 text-xs font-semibold rounded-lg"
                  >
                    {commentLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {t("Kirim", "Send")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* In-App File Preview Modal for Clicked Attachments */}
      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(op) => !op && setPreviewFile(null)}
      />
    </Dialog>
  );
}
