import { describe, expect, it } from "vitest";
import fs from "node:fs";
const workspace=fs.readFileSync("src/components/tasks/project-task-workspace.tsx","utf8");
describe("historical Project Task visibility",()=>{
 it("renders workflow and reusable rows together independent of create mode",()=>{expect(workspace).toContain("visibleWorkflow.length > 0");expect(workspace).toContain("visibleReusable.length > 0");expect(workspace).not.toMatch(/mode === "workflow" \? \(/);});
 it("keeps create mode from Project policy",()=>expect(workspace).toContain("taskMode={mode}"));
 it("labels each historical mode",()=>{expect(workspace).toContain("Tugas Workflow");expect(workspace).toContain("Tugas Berulang");});
});
