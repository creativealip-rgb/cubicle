export type ProjectTaskMode = "workflow" | "reusable";

export function buildProjectTaskPresentation<T extends { mode: ProjectTaskMode }>(tasks: T[], createMode: ProjectTaskMode) {
  return tasks.map((task) => ({
    ...task,
    modeBadge: task.mode === "workflow" ? "Workflow" : "Berulang",
    editMode: task.mode,
    createMode,
  }));
}
