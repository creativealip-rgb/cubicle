import { projectTaskDefaults, type ProjectTaskDefaults, type TaskWorkMode } from "@/lib/task-work-mode";

export type DuplicateAction = "skip" | "keep";

export type TemplateImportItem = {
  id: string;
  title: string;
  position: number;
  selected?: boolean;
  duplicateAction?: DuplicateAction;
};

export type TemplateImportTemplate = {
  id: string;
  items: TemplateImportItem[];
};

export type ImportPreviewItem = {
  templateId: string;
  itemId: string;
  title: string;
  templatePosition: number;
  itemPosition: number;
  duplicate: boolean;
  duplicateAction: DuplicateAction;
  included: boolean;
  defaults: ProjectTaskDefaults;
};

export function normalizeTaskTitle(value: string): string {
  return value.trim().toLowerCase();
}

export function previewTemplateImport(input: {
  mode: TaskWorkMode;
  existingProjectTitles: string[];
  templates: TemplateImportTemplate[];
}): ImportPreviewItem[] {
  const existingTitles = new Set(input.existingProjectTitles.map(normalizeTaskTitle));

  return input.templates
    .flatMap((template, templatePosition) =>
      [...template.items]
        .sort((left, right) => left.position - right.position)
        .filter((item) => item.selected !== false)
        .map((item) => ({ template, templatePosition, item })),
    )
    .map(({ template, templatePosition, item }) => {
      const duplicate = existingTitles.has(normalizeTaskTitle(item.title));
      const duplicateAction = item.duplicateAction ?? (duplicate ? "skip" : "keep");
      return {
        templateId: template.id,
        itemId: item.id,
        title: item.title,
        templatePosition,
        itemPosition: item.position,
        duplicate,
        duplicateAction,
        included: !duplicate || duplicateAction === "keep",
        defaults: projectTaskDefaults(input.mode),
      };
    });
}
