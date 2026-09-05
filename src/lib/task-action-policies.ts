import type { TaskWorkMode } from "@/lib/task-work-mode";

export function assertTaskModeMutationAllowed(
  _mode: TaskWorkMode,
  _input: { status?: unknown; priority?: unknown; dueDate?: unknown; clientVisible?: unknown },
) {
  // All tasks support status, priority, and due dates seamlessly across views
  return true;
}
