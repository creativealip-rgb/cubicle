import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
describe("client project task timer workflow",()=>{
  it("offers active workflow and reusable tasks in time picker",()=>{const s=read("src/components/time/time-route-content.tsx");expect(s).not.toContain('eq(tasks.mode, "reusable")');expect(s).toContain('eq(tasks.lifecycle, "active")');});
  it("assigns new tasks to creator and refreshes project detail",()=>{const s=read("src/lib/actions/tasks.ts");expect(s).toContain("assigneeId: parsed.assigneeId || user.id");expect(s).toContain('revalidatePath(`/app/projects/${parsed.projectId}`)');});
  it("associates project field labels",()=>{const s=read("src/components/forms/project-form.tsx");expect(s).toContain("htmlFor={`project-${key}`}");expect(s).toContain("id={`project-${key}`}");});
});
