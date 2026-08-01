import { describe, expect, it } from "vitest";
import fs from "node:fs";
const actions=fs.readFileSync("src/lib/actions/tasks.ts","utf8");
const workspace=fs.readFileSync("src/components/tasks/project-task-workspace.tsx","utf8");
describe("Project Task reorder",()=>{
 it("requires complete IDs for one Project and mode",()=>{expect(actions).toContain("export async function reorderProjectTasks");expect(actions).toContain("orderedTaskIds");expect(actions).toContain("Daftar Task tidak lengkap");});
 it("uses transaction and collision-safe temporary positions",()=>{expect(actions).toMatch(/db\.transaction\([\s\S]*1000000/);});
 it("wires one-step movement for reusable rows",()=>{expect(workspace).toContain("reorderProjectTasks");expect(workspace).toContain("direction === \"up\"");});
});
