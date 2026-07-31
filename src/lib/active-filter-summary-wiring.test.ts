import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");
describe("active filter summary",()=>{
 it("aligns task behavior tabs and view toggle in one row",()=>{const page=read("src/app/(app)/app/tasks/page.tsx");expect(page).toContain("<TaskBehaviorTabs");expect(page).toContain("<TaskViewToggle");expect(page).toContain('sm:items-center sm:justify-between');});
 it("shows active filter descriptions and reset controls",()=>{const component=read("src/components/ui/active-filter-summary.tsx");expect(component).toContain("Filter aktif:");expect(component).toContain("Hapus filter");const projects=read("src/app/(app)/app/projects/page.tsx");const tasks=read("src/app/(app)/app/tasks/page.tsx");expect(projects).toContain("<ActiveFilterSummary");expect(tasks).toContain("<ActiveFilterSummary");});
});
