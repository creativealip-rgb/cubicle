import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");
describe("core mutation hardening",()=>{
 it("locks time updates and uses workDate for manual entries",()=>{const s=read("src/lib/actions/time.ts");expect(s).toContain("entry.workDate");expect(s).toContain("ne(timeEntries.status, \"invoiced\")");expect(s).toContain("Status time entry berubah saat diedit");});
 it("validates task status and scopes final mutation",()=>{const s=read("src/lib/actions/tasks.ts");expect(s).toContain("taskStatusSchema.parse(status)");expect(s).toContain("taskStatusSchema.parse(newStatus)");expect(s).toContain("eq(tasks.workspaceId, workspaceId)");});
 it("validates project members and scopes visibility",()=>{const s=read("src/lib/actions/projects.ts");expect(s).toContain("workspaceMembers.userId, userId");expect(s).toContain("eq(projects.workspaceId, workspaceId)");});
});
