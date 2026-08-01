import { describe, expect, it } from "vitest";
import fs from "node:fs";
const workspace=fs.readFileSync("src/components/tasks/reusable-task-workspace.tsx","utf8");
const form=fs.readFileSync("src/components/forms/task-form.tsx","utf8");
const actions=fs.readFileSync("src/lib/actions/tasks.ts","utf8");
describe("reusable task editing",()=>{
 it("opens edit dialog with shared form and locked reusable mode",()=>{expect(workspace).toContain("TaskForm");expect(workspace).toContain('taskMode="reusable"');expect(workspace).toContain("Ubah");});
 it("supports description and optional assignee without workflow fields",()=>{expect(workspace).toContain("description");expect(workspace).toContain("assigneeId");expect(form).toContain('taskMode === "workflow"');});
 it("keeps lifecycle explicit and server mode immutable",()=>{expect(workspace).toContain("Arsipkan");expect(workspace).toContain("Pulihkan");expect(actions).toContain("assertTaskModeMutationAllowed");});
 it("does not show no-op movement controls without handler",()=>{expect(workspace).toMatch(/onMove\s*&&[\s\S]*Move Up/);});
});
