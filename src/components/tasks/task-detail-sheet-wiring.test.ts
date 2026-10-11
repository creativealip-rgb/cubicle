import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source=readFileSync("src/components/tasks/task-detail-sheet.tsx","utf8");
describe("task detail sheet",()=>{it("exposes a 1-click start timer bound to the canonical action",()=>{expect(source).toContain("startTimerFromTask");expect(source).toContain("handleStartTimer");expect(source).toContain('t("Start Timer", "Start Timer")');expect(source).toContain("allowsTimeTrackingProject");});});
