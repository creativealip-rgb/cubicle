"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { reorderTask } from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/forms/task-form";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { cn } from "@/lib/utils";
import {
  Plus,
  AlertTriangle,
  Clock,
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
  projectName?: string;
}

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
}

const columns = [
  { id: "todo", label: "Todo", color: "bg-slate-200" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-200" },
  { id: "review", label: "Review", color: "bg-amber-200" },
  { id: "done", label: "Done", color: "bg-emerald-200" },
];

const priorityColors: Record<string, string> = {
  low: "border-slate-300",
  medium: "border-blue-300",
  high: "border-amber-300",
  urgent: "border-red-300",
};

function KanbanCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  return (
    <TaskDetailSheet task={task}>
      <Card
        className={cn(
          "cursor-pointer hover:shadow-md transition-shadow",
          isDragging && "opacity-50 shadow-lg",
          priorityColors[task.priority],
          "border-l-4",
        )}
      >
        <CardContent className="p-3 space-y-2">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-[10px]", {
                "text-red-600 border-red-200": task.priority === "urgent",
                "text-amber-600 border-amber-200": task.priority === "high",
                "text-blue-600 border-blue-200": task.priority === "medium",
                "text-slate-600 border-slate-200": task.priority === "low",
              })}
            >
              {task.priority === "urgent" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
              {task.priority}
            </Badge>
            {task.assigneeName && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                {task.assigneeName}
              </span>
            )}
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    </TaskDetailSheet>
  );
}

function SortableCard({ task, isDragOverlay }: { task: Task; isDragOverlay?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragOverlay) {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <KanbanCard task={task} isDragging />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard task={task} isDragging={isDragging} />
    </div>
  );
}

export function KanbanBoard({ projectId, tasks: initialTasks }: KanbanBoardProps) {
  const [taskMap, setTaskMap] = useState<Record<string, Task[]>>({});
  const [_activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    const grouped: Record<string, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const task of initialTasks) {
      const col = task.status in grouped ? task.status : "todo";
      grouped[col].push(task);
    }
    // Sort by position
    for (const col of Object.keys(grouped)) {
      grouped[col].sort((a, b) => a.position - b.position);
    }
    setTaskMap(grouped);
  }, [initialTasks]);

  function findColumn(taskId: string): string | null {
    for (const [colId, colTasks] of Object.entries(taskMap)) {
      if (colTasks.find((t) => t.id === taskId)) return colId;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const activeCol = findColumn(activeId);
    if (!activeCol) return;

    // Find target column from droppable data or item data
    let overCol = findColumn(over.id as string);
    if (!overCol) {
      // over might be a column droppable
      overCol = over.id as string;
    }

    if (!overCol || !columns.find((c) => c.id === overCol)) return;

    const oldCol = taskMap[activeCol];
    const newCol = taskMap[overCol];

    const taskIndex = oldCol.findIndex((t) => t.id === activeId);
    if (taskIndex === -1) return;

    const [movedTask] = oldCol.splice(taskIndex, 1);

    // Find target index
    let targetIndex = 0;
    if (activeCol === overCol) {
      const overIndex = newCol.findIndex((t) => t.id === (over.id as string));
      targetIndex = overIndex >= 0 ? overIndex : newCol.length;
      newCol.splice(targetIndex, 0, movedTask);
    } else {
      newCol.push(movedTask);
      targetIndex = newCol.length - 1;
    }

    // Update positions
    const updatedMap = { ...taskMap, [activeCol]: [...oldCol], [overCol]: [...newCol] };
    setTaskMap(updatedMap);

    try {
      await reorderTask(activeId, targetIndex, activeCol !== overCol ? overCol : undefined);
    } catch (err: unknown) {
      toast.error("Failed to move task");
      // Revert
      setTaskMap(taskMap);
    }
  }

  function getColumnTasks(colId: string): Task[] {
    return taskMap[colId] ?? [];
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = getColumnTasks(col.id);
          return (
            <div key={col.id} className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", col.color)} />
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {colTasks.length}
                  </Badge>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>New Task - {col.label}</DialogTitle>
                    </DialogHeader>
                    <TaskForm
                      mode="create"
                      projectId={projectId}
                      defaultValues={{ status: col.id }}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <SortableContext
                items={colTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 min-h-[80px]">
                  {colTasks.map((task) => (
                    <SortableCard key={task.id} task={task} />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
