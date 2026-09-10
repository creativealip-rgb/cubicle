import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const questionnaire = readFileSync("src/components/questionnaires/questionnaire-builder.tsx", "utf8");
const templates = readFileSync("src/components/tasks/task-template-workspace.tsx", "utf8");

describe("mobile overflow regressions", () => {
  it("stacks questionnaire field controls on mobile", () => {
    expect(questionnaire).toContain('className="min-w-0 flex-1 space-y-3"');
    expect(questionnaire).toContain('className="flex flex-col gap-2 sm:flex-row sm:items-center"');
    expect(questionnaire).toContain('className="w-full sm:w-44"');
  });

  it("stacks task template project import controls on mobile", () => {
    expect(templates).toContain('className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"');
    expect(templates).toContain('className="h-8 min-w-0 w-full');
  });
});
