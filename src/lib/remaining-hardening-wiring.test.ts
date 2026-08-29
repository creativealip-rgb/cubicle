import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");
describe("remaining mutation hardening",()=>{
 it("guards timer stop as one open-entry transition",()=>{const s=read("src/lib/actions/time.ts");expect(s).toContain("isNull(timeEntries.endTime)");expect(s).toContain("Timer already stopped");expect(s).toContain("if (!updated)");});
 it("ships task status DB constraint",()=>{expect(read("src/db/schema.ts")).toContain("tasks_status_check");expect(read("drizzle/0082_production_hardening_constraints.sql")).toContain("tasks_status_check");});
 it("scopes targeted resource mutations",()=>{for(const p of ["contracts.ts","projects.ts","tasks.ts","files.ts"])expect(read(`src/lib/actions/${p}`)).toContain("workspaceId");});
});
