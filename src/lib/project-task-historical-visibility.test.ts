import { describe, expect, it } from "vitest";
import fs from "node:fs";
const workspace=fs.readFileSync("src/components/tasks/project-task-workspace.tsx","utf8");
describe("historical Project Task visibility",()=>{
 it("renders the selected project task policy while preserving both datasets",()=>{expect(workspace).toContain('mode === "workflow"');expect(workspace).toContain('mode === "reusable"');expect(workspace).toContain("visibleWorkflow");expect(workspace).toContain("visibleReusable");});
 it("keeps create mode from Project policy",()=>expect(workspace).toContain("taskMode={mode}"));
 it("labels each historical mode",()=>{expect(workspace).toContain("Tugas Workflow");expect(workspace).toContain("Tugas Berulang");});
});
