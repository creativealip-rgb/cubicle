import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  updatedAt: string;
}

export function PortalTaskList({ tasks }: { tasks: Task[] }) {
  const priorityVariant = (p: string) => {
    if (p === "urgent") return "destructive" as const;
    if (p === "high") return "default" as const;
    return "outline" as const;
  };

  return (
    <div className="border rounded-lg divide-y">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-start gap-3 p-3">
          <div className="mt-0.5">
            {task.status === "done" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={priorityVariant(task.priority)}
                className="text-[10px]"
              >
                {task.priority}
              </Badge>
              {task.dueDate && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
