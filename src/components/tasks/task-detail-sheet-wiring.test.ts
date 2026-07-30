import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source=readFileSync("src/components/tasks/task-detail-sheet.tsx","utf8");
describe("task detail sheet",()=>{it("does not expose timer controls",()=>{expect(source).not.toContain("startTimerFromTask");expect(source).not.toContain("handleStartTimer");expect(source).not.toContain("Mulai timer dari task");expect(source).not.toContain("Play");});});
