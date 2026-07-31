import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read=(p:string)=>readFileSync(join(process.cwd(),p),"utf8");
describe("time history editor route",()=>{
 it("uses full Timesheet editor on history route",()=>{const s=read("src/components/time/time-route-content.tsx");const history=s.slice(s.indexOf('mode === "history"'));expect(history).toContain("<Timesheet");expect(history).toContain("clients={clientList}");expect(history).toContain("projects={projectList}");expect(history).toContain("tasks={taskList}");expect(history).toContain("activities={activityList}");expect(history).not.toContain("<WaktuHistory")});
 it("keeps row editor, pagination, project/task title, and delete controls",()=>{const s=read("src/components/time/timesheet.tsx");expect(s).toContain("PAGE_SIZE = 10");expect(s).toContain("cursor-pointer");expect(s).toContain("openEdit(entry)");expect(s).toContain("historyPrimaryTitle");expect(s).toContain("historyDescription");expect(s).toContain("deleteTimeEntry")});
});
