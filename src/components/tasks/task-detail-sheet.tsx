"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-client";
import { allowsTimeTrackingProject } from "@/lib/billing-model";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  CheckSquare,
  AlignLeft,
  Calendar,
  UserPlus,
  ArrowUpRight,
  GripVertical,
  ArrowLeft,
  CornerDownRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateTask,
  getTaskSubtasks,
  addSubtask,
  toggleSubtask,
  setSubtaskStatus,
  updateSubtaskDetails,
  convertSubtaskToTask,
  reorderSubtasks,
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

interface SubtaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: "todo" | "in_progress" | "done" | string;
  completed: boolean;
  assigneeId: string | null;
  dueDate?: string | null;
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
    behavior?: "one_time" | "recurring" | string | null;
    clientVisible?: boolean;
    dueDate?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    projectId?: string | null;
    projectName?: string | null;
    timeTrackingMode?: "off" | "internal" | "billable" | null;
    billingModel?: string | null;
    billingType?: string | null;
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

function getUserInitials(nameOrEmail?: string | null) {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

function getSubtaskStatusIcon(status: "todo" | "in_progress" | "done" | string) {
  if (status === "done") {
    return <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>;
  }
  if (status === "in_progress") {
    return <span className="h-4 w-4 rounded-full border-2 border-blue-500 bg-blue-500/20 text-blue-500 flex items-center justify-center text-[9px] font-bold">●</span>;
  }
  return <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 hover:border-muted-foreground transition-colors" />;
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

  // Asana Drill-Down Navigation State: 'parent' or active SubtaskItem
  const [activeDrillDownSubtask, setActiveDrillDownSubtask] = useState<SubtaskItem | null>(null);

  // Timer State
  const [timerStarting, setTimerStarting] = useState(false);

  // Subtasks State
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);
  const [draggedSubtaskIdx, setDraggedSubtaskIdx] = useState<number | null>(null);

  // Comments State (Separate for Parent vs Subtask)
  const [comments, setComments] = useState<TaskCommentItem[]>([]);
  const [subtaskComments, setSubtaskComments] = useState<TaskCommentItem[]>([]);
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
  const [mentionType, setMentionType] = useState<"member" | "subtask">("member");

  // Load Subtasks & Parent Comments
  const refreshSubtasks = async () => {
    if (!task.id) return;
    const items = await getTaskSubtasks(task.id);
    setSubtasks(
      items.map((it) => ({
        id: it.id,
        title: it.title,
        description: it.description,
        status: (it as any).status || (it.completed ? "done" : "todo"),
        completed: it.completed,
        assigneeId: it.assigneeId,
        dueDate: it.dueDate,
      }))
    );
  };

  useEffect(() => {
    if (open && task.id) {
      refreshSubtasks();
      getTaskComments(task.id).then((items: any) => {
        setComments(items);
      });
    } else {
      setActiveDrillDownSubtask(null);
    }
  }, [open, task.id]);

  // Load Subtask Comments when drilling down
  useEffect(() => {
    if (activeDrillDownSubtask && task.id) {
      getTaskComments(task.id, activeDrillDownSubtask.id).then((items: any) => {
        setSubtaskComments(items);
      });
      setNewComment("");
      setPendingAttachments([]);
    }
  }, [activeDrillDownSubtask?.id, task.id]);

  // Fast Status Auto-Save for Main Task
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

  // Fast Priority Auto-Save for Main Task
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

  // Fast Assignee Auto-Save for Main Task
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

  // Description Auto-Save on Blur (Main Task)
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

  // Title Auto-Save on Blur (Main Task)
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

  // Subtask Edit Drafts (When drilled down)
  const [subtaskTitleDraft, setSubtaskTitleDraft] = useState("");
  const [subtaskDescDraft, setSubtaskDescDraft] = useState("");
  const [subtaskDueDateDraft, setSubtaskDueDateDraft] = useState("");

  const handleOpenDrillDownSubtask = (st: SubtaskItem) => {
    setActiveDrillDownSubtask(st);
    setSubtaskTitleDraft(st.title);
    setSubtaskDescDraft(st.description || "");
    setSubtaskDueDateDraft(st.dueDate ? st.dueDate.split("T")[0] : "");
  };

  const handleSubtaskTitleBlur = async () => {
    if (!activeDrillDownSubtask || !subtaskTitleDraft.trim() || subtaskTitleDraft.trim() === activeDrillDownSubtask.title) return;
    const cleanTitle = subtaskTitleDraft.trim();
    const stId = activeDrillDownSubtask.id;
    setActiveDrillDownSubtask((prev) => (prev ? { ...prev, title: cleanTitle } : null));
    setSubtasks((prev) => prev.map((s) => (s.id === stId ? { ...s, title: cleanTitle } : s)));
    try {
      await updateSubtaskDetails({ subtaskId: stId, title: cleanTitle });
      toast.success(t("Judul subtask diperbarui", "Subtask title updated"));
      router.refresh();
    } catch {
      toast.error(t("Gagal memperbarui judul subtask", "Failed to update subtask title"));
    }
  };

  const handleSubtaskDescBlur = async () => {
    if (!activeDrillDownSubtask) return;
    const cleanDesc = subtaskDescDraft.trim();
    if (cleanDesc === (activeDrillDownSubtask.description || "")) return;
    const stId = activeDrillDownSubtask.id;
    setActiveDrillDownSubtask((prev) => (prev ? { ...prev, description: cleanDesc } : null));
    setSubtasks((prev) => prev.map((s) => (s.id === stId ? { ...s, description: cleanDesc } : s)));
    try {
      await updateSubtaskDetails({ subtaskId: stId, description: cleanDesc });
      toast.success(t("Deskripsi subtask disimpan", "Subtask description saved"));
      router.refresh();
    } catch {
      toast.error(t("Gagal menyimpan deskripsi subtask", "Failed to save subtask description"));
    }
  };

  const handleSubtaskDueDateChange = async (dateStr: string) => {
    if (!activeDrillDownSubtask) return;
    setSubtaskDueDateDraft(dateStr);
    const stId = activeDrillDownSubtask.id;
    const dueDateVal = dateStr || null;
    setActiveDrillDownSubtask((prev) => (prev ? { ...prev, dueDate: dueDateVal } : null));
    setSubtasks((prev) => prev.map((s) => (s.id === stId ? { ...s, dueDate: dueDateVal } : s)));
    try {
      await updateSubtaskDetails({ subtaskId: stId, dueDate: dueDateVal });
      toast.success(t("Tenggat waktu subtask disimpan", "Subtask due date saved"));
      router.refresh();
    } catch {
      toast.error(t("Gagal menyimpan tenggat waktu", "Failed to save due date"));
    }
  };

  const handleDrillDownSubtaskStatusChange = async (status: "todo" | "in_progress" | "done") => {
    if (!activeDrillDownSubtask) return;
    const stId = activeDrillDownSubtask.id;
    const completed = status === "done";
    setActiveDrillDownSubtask((prev) => (prev ? { ...prev, status, completed } : null));
    setSubtasks((prev) => prev.map((s) => (s.id === stId ? { ...s, status, completed } : s)));
    try {
      await setSubtaskStatus(stId, status);
      toast.success(t("Status subtask diperbarui", "Subtask status updated"));
      router.refresh();
    } catch {
      toast.error(t("Gagal memperbarui status", "Failed to update status"));
    }
  };

  const handleDrillDownSubtaskAssigneeChange = async (assigneeId: string) => {
    if (!activeDrillDownSubtask) return;
    const val = assigneeId === "__unassigned__" ? null : assigneeId;
    const stId = activeDrillDownSubtask.id;
    setActiveDrillDownSubtask((prev) => (prev ? { ...prev, assigneeId: val } : null));
    setSubtasks((prev) => prev.map((s) => (s.id === stId ? { ...s, assigneeId: val } : s)));
    try {
      await updateSubtaskDetails({ subtaskId: stId, assigneeId: val });
      toast.success(t("Petugas subtask diperbarui", "Subtask assignee updated"));
      router.refresh();
    } catch {
      toast.error(t("Gagal memperbarui petugas", "Failed to update assignee"));
    }
  };

  const handleDrillDownConvertToTask = async () => {
    if (!activeDrillDownSubtask) return;
    const subtaskId = activeDrillDownSubtask.id;
    try {
      await convertSubtaskToTask(subtaskId);
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      setActiveDrillDownSubtask(null);
      toast.success(t("Subtask berhasil diubah menjadi Task utama", "Subtask converted to standalone task"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengubah subtask", "Failed to convert subtask"));
    }
  };

  const handleDrillDownDeleteSubtask = async () => {
    if (!activeDrillDownSubtask) return;
    const subtaskId = activeDrillDownSubtask.id;
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    setActiveDrillDownSubtask(null);
    try {
      await deleteSubtask(subtaskId);
      toast.success(t("Subtask dihapus", "Subtask deleted"));
      router.refresh();
    } catch {
      toast.error(t("Gagal menghapus subtask", "Failed to delete subtask"));
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

  // Subtask Quick Add
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || subtaskLoading) return;
    setSubtaskLoading(true);
    try {
      const created = await addSubtask(task.id, newSubtaskTitle.trim());
      setSubtasks((prev) => [
        ...prev,
        {
          id: created.id,
          title: created.title,
          description: created.description,
          status: "todo",
          completed: created.completed,
          assigneeId: created.assigneeId,
          dueDate: created.dueDate,
        },
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

  const handleCycleSubtaskStatus = async (st: SubtaskItem) => {
    let nextStatus: "todo" | "in_progress" | "done" = "in_progress";
    if (st.status === "in_progress") nextStatus = "done";
    else if (st.status === "done") nextStatus = "todo";
    else nextStatus = "in_progress";

    const nextCompleted = nextStatus === "done";
    setSubtasks((prev) =>
      prev.map((s) => (s.id === st.id ? { ...s, status: nextStatus, completed: nextCompleted } : s))
    );
    try {
      await setSubtaskStatus(st.id, nextStatus);
      router.refresh();
    } catch {
      toast.error(t("Gagal mengubah status subtask", "Failed to update subtask status"));
    }
  };

  // Drag and drop reorder subtasks
  const handleDragStart = (idx: number) => {
    setDraggedSubtaskIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedSubtaskIdx === null || draggedSubtaskIdx === targetIdx) return;

    const updated = [...subtasks];
    const [moved] = updated.splice(draggedSubtaskIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setSubtasks(updated);
    setDraggedSubtaskIdx(targetIdx);
  };

  const handleDragEnd = async () => {
    setDraggedSubtaskIdx(null);
    try {
      await reorderSubtasks(task.id, subtasks.map((s) => s.id));
    } catch {
      toast.error(t("Gagal menyimpan urutan subtask", "Failed to save subtask order"));
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    if (activeDrillDownSubtask?.id === subtaskId) setActiveDrillDownSubtask(null);
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

  // Comments Handlers with @Member and #Subtask Autocomplete
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);

    const memberMatch = textBeforeCursor.match(/@([a-zA-Z0-9_-]*)$/);
    const subtaskMatch = textBeforeCursor.match(/#([a-zA-Z0-9_\s-]*)$/);

    if (memberMatch) {
      setMentionOpen(true);
      setMentionType("member");
      setMentionQuery(memberMatch[1].toLowerCase());
    } else if (subtaskMatch && !activeDrillDownSubtask) {
      setMentionOpen(true);
      setMentionType("subtask");
      setMentionQuery(subtaskMatch[1].toLowerCase());
    } else {
      setMentionOpen(false);
    }
  };

  const filteredMentionMembers = members.filter((m) => {
    const name = (m.name || "").toLowerCase();
    const email = (m.email || "").toLowerCase();
    return name.includes(mentionQuery) || email.includes(mentionQuery);
  });

  const filteredMentionSubtasks = subtasks.filter((st) =>
    st.title.toLowerCase().includes(mentionQuery)
  );

  const insertMemberMention = (member: { id: string; name: string | null; email: string | null }) => {
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

  const insertSubtaskMention = (subtask: SubtaskItem) => {
    const cursorPos = commentInputRef.current?.selectionStart || newComment.length;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const textAfterCursor = newComment.slice(cursorPos);

    const newTextBefore = textBeforeCursor.replace(/#([a-zA-Z0-9_\s-]*)$/, `[#${subtask.title}] `);
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
    const targetSubtaskId = activeDrillDownSubtask?.id || null;

    try {
      const created = await addTaskComment({
        taskId: task.id,
        subtaskId: targetSubtaskId,
        content: newComment.trim(),
        attachments: pendingAttachments,
      });

      const newItem: TaskCommentItem = {
        id: created.id,
        content: created.content,
        attachments: pendingAttachments,
        createdAt: created.createdAt,
        userId: created.userId,
        userName: "You",
        userEmail: null,
      };

      if (targetSubtaskId) {
        setSubtaskComments((prev) => [...prev, newItem]);
      } else {
        setComments((prev) => [...prev, newItem]);
      }

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
    if (activeDrillDownSubtask) {
      setSubtaskComments((prev) => prev.filter((c) => c.id !== commentId));
    } else {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
    try {
      await deleteTaskComment(commentId);
      toast.success(t("Komentar dihapus", "Comment deleted"));
    } catch {
      toast.error(t("Gagal menghapus komentar", "Failed to delete comment"));
    }
  };

  // Helper to render text with highlighted @mentions and #subtasks
  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_.-]+|\[#[^\]]+\])/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="inline-flex items-center font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5 text-[11px] mx-0.5">
            {part}
          </span>
        );
      }
      if (part.startsWith("[#") && part.endsWith("]")) {
        const subtaskName = part.slice(2, -1);
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5 text-[11px] mx-0.5"
          >
            <CheckSquare className="h-3 w-3" />
            {subtaskName}
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

  const subtaskDone = subtasks.filter((s) => s.completed || s.status === "done").length;
  const subtaskPct = subtasks.length > 0 ? Math.round((subtaskDone / subtasks.length) * 100) : 0;

  const currentCommentsList = activeDrillDownSubtask ? subtaskComments : comments;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className={className ?? "cursor-pointer"}>
        {children}
      </div>

      <DialogContent className="flex h-[94vh] max-h-[920px] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl shadow-2xl rounded-2xl border-border/80 bg-background">
        {/* Top Header / Breadcrumb & Actions Bar */}
        <DialogHeader className="shrink-0 border-b bg-muted/20 px-6 py-3 pr-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Breadcrumb Navigation & Asana-Style Back Button */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
              {activeDrillDownSubtask ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveDrillDownSubtask(null)}
                    className="h-7 px-2 -ml-2 text-xs font-semibold gap-1 text-foreground hover:bg-muted/80 rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>{t("Kembali", "Back")}</span>
                  </Button>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-[200px]" title={task.title}>
                    {task.title}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <Badge variant="default" className="text-[10px] font-bold tracking-wide uppercase h-5 bg-blue-600 hover:bg-blue-600 text-white gap-1">
                    <CornerDownRight className="h-3 w-3" />
                    {t("Subtask", "Subtask")}
                  </Badge>
                </>
              ) : (
                <>
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
                        className="font-medium hover:text-primary hover:underline transition-colors truncate max-w-[160px]"
                      >
                        {task.projectName}
                      </Link>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </>
                  )}
                  <Badge variant="outline" className="text-[10px] font-semibold tracking-wide uppercase h-5 bg-background text-muted-foreground">
                    {task.mode === "reusable" ? t("SOP / Template", "SOP / Template") : t("Task", "Task")}
                  </Badge>
                </>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2">
              {activeDrillDownSubtask ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDrillDownConvertToTask}
                    className="h-8 text-xs font-semibold gap-1.5 px-3 rounded-lg text-primary border-primary/30 hover:bg-primary/10 shadow-2xs"
                    title={t("Jadikan subtask ini task mandiri", "Convert to standalone task")}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>{t("Jadikan Task", "Convert to Task")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDrillDownDeleteSubtask}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 rounded-lg px-2"
                    title={t("Hapus subtask ini", "Delete subtask")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : allowsTimeTrackingProject(task) && task.timeTrackingMode !== "off" && (
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
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Main 2-Column Split Workspace (Transforms dynamically for Parent Task or Subtask) */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-border/60 overflow-hidden">
          
          {/* LEFT COLUMN */}
          <div className="min-h-0 flex flex-col overflow-y-auto p-6 md:col-span-8 space-y-6">
            {activeDrillDownSubtask ? (
              /* === ASANA DRILL-DOWN SUBTASK VIEW === */
              <>
                {/* Subtask Title Input */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-600/10 px-2 py-0.5 rounded">
                      {t("Subtask Langkah", "Subtask Step")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {t("dari tugas", "of task")} <strong className="text-foreground">{task.title}</strong>
                    </span>
                  </div>
                  <input
                    type="text"
                    value={subtaskTitleDraft}
                    onChange={(e) => setSubtaskTitleDraft(e.target.value)}
                    onBlur={handleSubtaskTitleBlur}
                    className="w-full text-lg font-bold tracking-tight bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 -mx-1 text-foreground"
                    placeholder={t("Nama subtask...", "Subtask name...")}
                  />
                </div>

                {/* Subtask Attributes Grid (Status, Assignee, Due Date) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs">
                  {/* Status */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      {t("Status Subtask", "Subtask Status")}
                    </span>
                    <Select
                      value={activeDrillDownSubtask.status}
                      onValueChange={(val: any) => handleDrillDownSubtaskStatusChange(val)}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold rounded-lg bg-background border-border/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">🟡 To Do</SelectItem>
                        <SelectItem value="in_progress">🔵 In Progress</SelectItem>
                        <SelectItem value="done">🟢 Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assignee */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3 text-blue-500" />
                      {t("Petugas Subtask", "Subtask Assignee")}
                    </span>
                    <Select
                      value={activeDrillDownSubtask.assigneeId ?? "__unassigned__"}
                      onValueChange={handleDrillDownSubtaskAssigneeChange}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold rounded-lg bg-background border-border/80 truncate">
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

                  {/* Due Date */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-amber-500" />
                      {t("Tenggat Waktu", "Due Date")}
                    </span>
                    <Input
                      type="date"
                      value={subtaskDueDateDraft}
                      onChange={(e) => handleSubtaskDueDateChange(e.target.value)}
                      className="h-8 text-xs rounded-lg bg-background font-mono"
                    />
                  </div>
                </div>

                {/* Subtask Description & Instructions */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <AlignLeft className="h-3 w-3 text-muted-foreground" />
                    {t("Deskripsi & Petunjuk Subtask", "Subtask Description & Instructions")}
                  </span>
                  <Textarea
                    value={subtaskDescDraft}
                    onChange={(e) => setSubtaskDescDraft(e.target.value)}
                    onBlur={handleSubtaskDescBlur}
                    placeholder={t("Tuliskan instruksi atau catatan pengerjaan subtask ini...", "Write instructions or notes for this subtask...")}
                    rows={6}
                    className="resize-none rounded-xl border border-border/80 p-3 text-xs leading-relaxed bg-muted/10 focus:bg-background"
                  />
                </div>

                {/* Parent Task Context Banner */}
                <div
                  onClick={() => setActiveDrillDownSubtask(null)}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70 hover:border-primary/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t("Tugas Utama", "Parent Task")}
                      </p>
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-medium h-5">
                    {subtaskDone}/{subtasks.length} {t("Langkah Selesai", "Steps Done")}
                  </Badge>
                </div>
              </>
            ) : (
              /* === MAIN TASK VIEW === */
              <>
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
                <div className={`grid gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs ${
                  task.mode === "reusable" || task.behavior === "recurring"
                    ? "grid-cols-2 sm:grid-cols-3"
                    : "grid-cols-2 sm:grid-cols-4"
                }`}>
                  {/* Status (Only for one-time/workflow tasks — SOP/recurring tasks have no end status) */}
                  {task.mode !== "reusable" && task.behavior !== "recurring" && (
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
                  )}

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
                      <Shield className="h-3 w-3 text-blue-500" />
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

                {/* Asana-Style Subtasks Checklist Table with Drill-Down Action */}
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
                  <div className="divide-y divide-border/50 rounded-xl border border-border/70 bg-card overflow-hidden">
                    {subtasks.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        {t("Belum ada langkah kerja. Tambahkan subtask di bawah.", "No subtasks yet. Add one below.")}
                      </div>
                    ) : (
                      subtasks.map((st, idx) => {
                        const assignedMember = members.find((m) => m.id === st.assigneeId);
                        const isDone = st.status === "done" || st.completed;
                        const isInProgress = st.status === "in_progress";

                        return (
                          <div
                            key={st.id}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={`group flex items-center justify-between gap-2 px-2.5 py-2 hover:bg-muted/30 transition-colors ${
                              draggedSubtaskIdx === idx ? "opacity-50 bg-muted/60" : ""
                            }`}
                          >
                            {/* Drag Handle + 3-State Status Button + Title with Drill Down Trigger */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>

                              {/* 1-Click Status Cycle */}
                              <button
                                type="button"
                                onClick={() => handleCycleSubtaskStatus(st)}
                                className="shrink-0 flex items-center justify-center cursor-pointer"
                                title={`Status: ${st.status}. Klik untuk ganti (To Do → In Progress → Done)`}
                              >
                                {getSubtaskStatusIcon(st.status)}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDrillDownSubtask(st)}
                                className="flex items-center gap-1.5 flex-1 min-w-0 text-left group/btn cursor-pointer"
                              >
                                <span
                                  className={`text-xs truncate transition-colors ${
                                    isDone
                                      ? "line-through text-muted-foreground"
                                      : isInProgress
                                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                                      : "text-foreground font-medium group-hover/btn:text-primary"
                                  }`}
                                >
                                  {st.title}
                                </span>
                                {isInProgress && (
                                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 py-0.2 rounded">
                                    In Progress
                                  </span>
                                )}
                                {st.description && (
                                  <AlignLeft className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                )}
                                {st.dueDate && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded font-mono">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {new Date(st.dueDate).toLocaleDateString([], { month: "numeric", day: "numeric" })}
                                  </span>
                                )}
                              </button>
                            </div>

                            {/* Right Clean Controls: Assignee Avatar + Drill-Down Arrow + Delete */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Assignee Avatar / Pill */}
                              <button
                                type="button"
                                onClick={() => handleOpenDrillDownSubtask(st)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted/60 hover:bg-muted border border-border/60 transition-colors cursor-pointer"
                                title={assignedMember ? assignedMember.name || assignedMember.email || "Assignee" : "Tugaskan anggota"}
                              >
                                {assignedMember ? (
                                  <>
                                    <span className="h-4 w-4 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[9px]">
                                      {getUserInitials(assignedMember.name || assignedMember.email)}
                                    </span>
                                    <span className="max-w-[70px] truncate text-muted-foreground text-[10px]">
                                      {assignedMember.name?.split(" ")[0] || assignedMember.email?.split("@")[0]}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground/60 flex items-center gap-0.5 px-0.5">
                                    <UserPlus className="h-3 w-3" />
                                  </span>
                                )}
                              </button>

                              {/* Drill-down Arrow Icon */}
                              <button
                                type="button"
                                onClick={() => handleOpenDrillDownSubtask(st)}
                                className="text-muted-foreground/50 hover:text-primary p-1 rounded transition-colors cursor-pointer"
                                title={t("Buka rincian subtask", "Open subtask details")}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>

                              {/* Quick Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteSubtask(st.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded transition-opacity cursor-pointer"
                                title={t("Hapus subtask", "Delete subtask")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
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
              </>
            )}
          </div>

          {/* RIGHT COLUMN: Activity Feed & Comments (Dedicated for Main Task or Subtask) */}
          <div className="min-h-0 flex flex-col overflow-hidden p-5 md:col-span-4 bg-muted/10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                {activeDrillDownSubtask
                  ? t("Diskusi Subtask", "Subtask Discussion")
                  : t("Activity & Comments", "Activity & Comments")}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold h-4 px-1.5 bg-background">
                {currentCommentsList.length}
              </Badge>
            </div>

            {/* Comment Stream */}
            <div ref={commentScrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[220px]">
              {currentCommentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-xs text-muted-foreground space-y-1">
                  <Sparkles className="h-6 w-6 text-muted-foreground/40 mb-1" />
                  <p className="font-medium">
                    {activeDrillDownSubtask
                      ? t("Belum ada komentar di subtask ini", "No comments on this subtask yet")
                      : t("Belum ada komentar", "No comments yet")}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    {t("Ketik @ mention tim, 📎 lampirkan berkas", "Type @ for team, 📎 attach files")}
                  </p>
                </div>
              ) : (
                currentCommentsList.map((c) => (
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

            {/* Comment Input Composer with @Mention Autocomplete & #Subtask Selector */}
            <div className="relative pt-2 border-t border-border/60 space-y-2">
              {/* Mention Suggestion Popover */}
              {mentionOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg z-50 p-1 divide-y divide-border/40">
                  {mentionType === "member" && filteredMentionMembers.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <AtSign className="h-3 w-3 text-primary" />
                        <span>{t("Mention Anggota Tim", "Mention Team Member")}</span>
                      </div>
                      <div className="py-0.5">
                        {filteredMentionMembers.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => insertMemberMention(m)}
                            className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-accent flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="font-semibold text-foreground">{m.name || m.email}</span>
                            <span className="text-[10px] text-muted-foreground">{m.email}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {mentionType === "subtask" && !activeDrillDownSubtask && filteredMentionSubtasks.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <CheckSquare className="h-3 w-3 text-emerald-500" />
                        <span>{t("Tautkan Langkah / Subtask", "Link Subtask")}</span>
                      </div>
                      <div className="py-0.5">
                        {filteredMentionSubtasks.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => insertSubtaskMention(st)}
                            className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-accent flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="font-semibold text-foreground truncate">{st.title}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">{st.status}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
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
                  placeholder={
                    activeDrillDownSubtask
                      ? t("Komentar di subtask ini (@ tim, 📎 file)...", "Comment on this subtask (@ team, 📎 file)...")
                      : t("Tulis komentar (@ tim, # subtask, 📎 file)...", "Write a comment (@ team, # subtask, 📎 file)...")
                  }
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
                    {/* Mention member trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewComment((prev) => prev + "@");
                        setMentionOpen(true);
                        setMentionType("member");
                        setMentionQuery("");
                        commentInputRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1 rounded hover:bg-muted px-1.5 py-0.5 transition-colors cursor-pointer"
                      title={t("Mention anggota tim", "Mention team member")}
                    >
                      <AtSign className="h-3.5 w-3.5 text-primary" />
                      <span>Team</span>
                    </button>

                    {/* Mention subtask trigger (only for parent task) */}
                    {!activeDrillDownSubtask && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewComment((prev) => prev + "#");
                          setMentionOpen(true);
                          setMentionType("subtask");
                          setMentionQuery("");
                          commentInputRef.current?.focus();
                        }}
                        className="inline-flex items-center gap-1 rounded hover:bg-muted px-1.5 py-0.5 transition-colors cursor-pointer"
                        title={t("Tautkan subtask", "Link subtask")}
                      >
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Subtask</span>
                      </button>
                    )}

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
