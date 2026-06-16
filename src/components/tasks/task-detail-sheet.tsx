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
} from "lucide-react";

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
}

interface TaskDetailSheetProps {
  task: Task;
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  children: React.ReactNode;
}

export function TaskDetailSheet({ task, members = [], children }: TaskDetailSheetProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleStatusChange(status: string) {
    setLoading(true);
    try {
      await updateTask(task.id, { status: status as any });
      toast.success("Status updated");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePriorityChange(priority: string) {
    setLoading(true);
    try {
      await updateTask(task.id, { priority: priority as any });
      toast.success("Priority updated");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDueDateChange(dueDate: string) {
    setLoading(true);
    try {
      await updateTask(task.id, { dueDate: dueDate || null });
      toast.success("Due date updated");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleClientVisibleToggle() {
    setLoading(true);
    try {
      await updateTask(task.id, { clientVisible: !task.clientVisible });
      toast.success(task.clientVisible ? "Hidden from client" : "Visible to client");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssigneeChange(assigneeId: string) {
    setLoading(true);
    try {
      const next = assigneeId === "unassigned" ? null : assigneeId;
      await updateTask(task.id, { assigneeId: next });
      toast.success(next ? "Assigned" : "Unassigned");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
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
              <Label className="text-xs">Status</Label>
              <Select value={task.status} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Priority</Label>
              <Select value={task.priority} onValueChange={handlePriorityChange} disabled={loading}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" /> Urgent
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <p className="text-sm text-muted-foreground">
              {task.description || "No description"}
            </p>
          </div>

          <Separator />

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" /> Due Date
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
              <User className="h-3 w-3" /> Assignee
            </Label>
            <Select
              value={task.assigneeId ?? "unassigned"}
              onValueChange={handleAssigneeChange}
              disabled={loading}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
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
                  <EyeOff className="h-3 w-3" /> Hide from client
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" /> Show to client
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Comments placeholder */}
          <div className="space-y-2">
            <Label className="text-xs">Comments</Label>
            <p className="text-xs text-muted-foreground">Comments coming soon...</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
