import type { TaskWorkMode } from "@/lib/task-work-mode";

export function assertTaskModeMutationAllowed(
  mode: TaskWorkMode,
  input: { status?: unknown; priority?: unknown; dueDate?: unknown; clientVisible?: unknown },
) {
  if (
    mode === "reusable"
    && [input.status, input.priority, input.dueDate, input.clientVisible].some((value) => value !== undefined)
  ) {
    throw new Error("Reusable task tidak mendukung field workflow");
  }
}
