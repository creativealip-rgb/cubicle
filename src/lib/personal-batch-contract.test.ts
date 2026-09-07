import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("task visibility defaults", () => {
  it("defaults every direct task insert path to client visible", () => {
    expect(read("src/lib/actions/tasks.ts")).toContain("clientVisible: parsed.clientVisible ?? true");
    expect(read("src/lib/actions/personal-notes.ts")).toContain("clientVisible: true");
    expect(read("src/lib/actions/task-templates.ts")).toMatch(/clientVisible:\s*true/);
    expect(read("src/app/api/ai/action/route.ts")).toMatch(/clientVisible:\s*true/);
  });

  it("carries client visibility in AI task confirmation", () => {
    expect(read("src/lib/ai/tools.ts")).toMatch(/kind: "create_task"[\s\S]{0,400}clientVisible:\s*true/);
  });
});

describe("habit payload", () => {
  it("only appends weekdays for specific weekday frequency and displays errors", () => {
    const source = read("src/components/productivity/habit-dialog.tsx");
    expect(source).toMatch(/frequency === "specific_weekdays"[\s\S]{0,300}fd\.append\("weekdays"/);
    expect(source).toContain("setError");
    expect(source).toContain("role=\"alert\"");
  });
});
